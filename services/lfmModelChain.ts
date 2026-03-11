/**
 * LFM Model Chain — Three-Model Daisy Chain Orchestrator
 *
 * Chains three Liquid Foundation Models for Hugh's full cognitive pipeline:
 *
 *   1. LFM 2.5 Audio (Speech-to-Speech)
 *      - Transcribes user speech → text
 *      - Synthesizes Hugh's voice from text → audio
 *      - Sub-100ms latency target, real-time streaming
 *
 *   2. LFM 2.5 Thinking (Reasoning)
 *      - DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL
 *      - Deep reasoning with <think> traces
 *      - SSE streaming via OpenAI-compatible endpoint
 *
 *   3. LFM 2.5 VL (Vision-Language)
 *      - Spatial awareness from camera feed
 *      - Returns XYZ coordinates for pheromone placement
 *      - Parallel to the main voice pipeline
 *
 * Flow:
 *   User speaks → Audio S2S (transcribe) → Thinking (reason) →
 *   Audio S2S (synthesize) → Hugh speaks back
 *
 *   Camera → VL (observe) → spatial pheromone (parallel)
 *
 * Infrastructure:
 *   Hostinger VPS (16GB, AMD EPYC 4vCPU): LFM Thinking on :8080
 *   Proxmox iMac (32GB, i5, Radeon Pro 570): Audio S2S + VL
 *
 * @version 1.0 — Phase 8: LFM Daisy Chain
 * @classification Production Ready
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL as string);

// ─── Endpoint Configuration ─────────────────────────────────

interface ModelEndpoints {
  audioS2S: string;     // LFM 2.5 Audio — speech-to-speech
  thinking: string;     // LFM 2.5 Thinking — reasoning
  vl: string;           // LFM 2.5 VL — vision-language
  apiKey: string;
}

function getEndpoints(): ModelEndpoints {
  return {
    audioS2S: import.meta.env.VITE_LFM_AUDIO_S2S_ENDPOINT
              || '/api/inference/v1/audio/speech',
    thinking: import.meta.env.VITE_LFM_THINKING_ENDPOINT
              || '/api/inference/v1/chat/completions',
    vl:       import.meta.env.VITE_LFM_VL_ENDPOINT
              || '/api/inference/v1/vl/completions',
    apiKey:   import.meta.env.VITE_LFM_API_KEY || 'hugh-local',
  };
}

// ─── Response Types ─────────────────────────────────────────

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
}

export interface ThinkingResult {
  text: string;
  thinkTrace?: string;  // Raw <think>...</think> content, stripped from display
}

export interface SynthesisResult {
  audioBlob: Blob;      // WAV/PCM audio of Hugh speaking
  mimeType: string;
  durationMs?: number;
}

export interface VLResult {
  description: string;
  coordinates: { x: number; y: number; z: number };
  objects: Array<{ label: string; confidence: number; bbox?: number[] }>;
}

export interface ChainResult {
  transcription: TranscriptionResult;
  thinking: ThinkingResult;
  synthesis: SynthesisResult | null;  // null if TTS disabled or S2S offline
  vl?: VLResult;                       // populated if camera was active
}

// ─── Stage 1: Audio → Text (Transcription) ──────────────────

export async function transcribeAudio(
  audioBlob: Blob,
  signal?: AbortSignal
): Promise<TranscriptionResult> {
  const { audioS2S, apiKey } = getEndpoints();

  // Try LFM Audio S2S endpoint first
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('model', 'lfm-2.5-audio');
    formData.append('response_format', 'json');

    const res = await fetch(audioS2S, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      return {
        text: data.text || data.transcription || '',
        confidence: data.confidence ?? 0.9,
        language: data.language || 'en',
      };
    }

    // If endpoint returns non-OK but doesn't throw, fall through
    console.warn(`[LFM Chain] Audio S2S transcription returned ${res.status}, falling back to browser STT`);
  } catch (err) {
    console.warn('[LFM Chain] Audio S2S transcription unavailable:', err);
  }

  // Fallback: return empty — caller should use Web Speech API result
  return { text: '', confidence: 0, language: 'en' };
}

// ─── Stage 2: Text → Reasoned Response (Thinking) ───────────

export async function thinkingInference(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  onToken?: (token: string, fullText: string) => void,
  signal?: AbortSignal
): Promise<ThinkingResult> {
  const { thinking, apiKey } = getEndpoints();

  const res = await fetch(thinking, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL',
      messages: [{ role: 'system', content: systemPrompt }, ...history],
      stream: true,
      max_tokens: 512,
      temperature: 0.7,
    }),
    signal,
  });

  if (!res.ok) throw new Error(`LFM_THINKING_OFFLINE:${res.status}`);

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error('No response body from Thinking model');

  let fullRaw = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const data = JSON.parse(line.slice(6));
          const token = data.choices?.[0]?.delta?.content || data.token || '';
          if (token) {
            fullRaw += token;
            if (onToken) {
              onToken(token, fullRaw);
            }
          }
        } catch { /* malformed SSE chunk */ }
      }
    }
  }

  // Extract think trace and clean response
  let thinkTrace: string | undefined;
  const thinkMatch = fullRaw.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    thinkTrace = thinkMatch[1]?.trim();
  }

  // Clean: strip think tags, bold, italic, leading whitespace
  let cleaned = fullRaw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/^\s+/, '');

  return {
    text: cleaned || 'Copy that.',
    thinkTrace,
  };
}

// ─── Stage 3: Text → Hugh's Voice (Synthesis) ──────────────

export async function synthesizeVoice(
  text: string,
  signal?: AbortSignal
): Promise<SynthesisResult | null> {
  const { audioS2S, apiKey } = getEndpoints();

  try {
    const res = await fetch(audioS2S.replace('/speech', '/tts') || audioS2S, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'lfm-2.5-audio',
        input: text,
        voice: 'hugh',   // Custom voice profile if supported
        response_format: 'wav',
        speed: 0.95,
      }),
      signal,
    });

    if (!res.ok) {
      console.warn(`[LFM Chain] Voice synthesis returned ${res.status}, falling back to browser TTS`);
      return null;
    }

    const audioBlob = await res.blob();
    return {
      audioBlob,
      mimeType: res.headers.get('content-type') || 'audio/wav',
      durationMs: undefined,
    };
  } catch (err) {
    console.warn('[LFM Chain] Voice synthesis unavailable:', err);
    return null;
  }
}

// ─── Stage 4: Camera → Spatial Awareness (VL) ──────────────

export async function vlObserve(
  imageBlob: Blob,
  prompt?: string,
  signal?: AbortSignal
): Promise<VLResult | null> {
  const { vl, apiKey } = getEndpoints();

  try {
    const base64 = await blobToBase64(imageBlob);

    const res = await fetch(vl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'lfm-2.5-vl',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
            {
              type: 'text',
              text: prompt || 'Describe what you see. Identify key objects and their spatial positions.',
            },
          ],
        }],
        max_tokens: 256,
      }),
      signal,
    });

    if (!res.ok) {
      console.warn(`[LFM Chain] VL returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse spatial coordinates from VL response
    const coords = parseVLCoordinates(content);

    return {
      description: content,
      coordinates: coords,
      objects: [],
    };
  } catch (err) {
    console.warn('[LFM Chain] VL observation unavailable:', err);
    return null;
  }
}

// ─── Full Chain Orchestration ───────────────────────────────

/**
 * Run the complete daisy chain:
 *   Audio → Transcribe → Think → Synthesize (+ optional VL)
 *
 * Returns each stage's result for the caller to handle display/playback.
 */
export async function runFullChain(opts: {
  audioBlob: Blob;
  systemPrompt: string;
  history: Array<{ role: string; content: string }>;
  browserTranscript?: string;  // Web Speech API result (parallel path)
  imageBlob?: Blob;            // Camera frame for VL (optional)
  onThinkingToken?: (token: string, fullText: string) => void;
  signal?: AbortSignal;
}): Promise<ChainResult> {
  const { audioBlob, systemPrompt, history, browserTranscript, imageBlob, onThinkingToken, signal } = opts;

  // Stage 1: Transcribe (LFM Audio S2S, fallback to browser transcript)
  let transcription: TranscriptionResult;
  const lfmTranscript = await transcribeAudio(audioBlob, signal);

  if (lfmTranscript.text) {
    transcription = lfmTranscript;
  } else if (browserTranscript) {
    transcription = { text: browserTranscript, confidence: 0.8, language: 'en' };
  } else {
    transcription = { text: '', confidence: 0, language: 'en' };
  }

  if (!transcription.text) {
    throw new Error('No transcription available from either LFM Audio or browser STT');
  }

  // Stage 2: Think (LFM Thinking — streaming)
  const fullHistory = [...history, { role: 'user', content: transcription.text }];
  const thinking = await thinkingInference(systemPrompt, fullHistory, onThinkingToken, signal);

  // Stage 3: Synthesize (LFM Audio S2S TTS — Hugh's voice)
  // Runs in parallel with pheromone emission
  const [synthesis] = await Promise.all([
    synthesizeVoice(thinking.text, signal),
    emitAudioPheromone(transcription, audioBlob),
  ]);

  // Stage 4: VL observation (parallel, non-blocking)
  let vl: VLResult | undefined;
  if (imageBlob) {
    vl = (await vlObserve(imageBlob, undefined, signal)) ?? undefined;
    if (vl) {
      await emitVLPheromone(vl);
    }
  }

  return { transcription, thinking, synthesis, vl };
}

// ─── Text-Only Chain (for typed input) ──────────────────────

/**
 * Text input path — skips Audio S2S transcription, still uses
 * Thinking + optional voice synthesis.
 */
export async function runTextChain(opts: {
  text: string;
  systemPrompt: string;
  history: Array<{ role: string; content: string }>;
  onThinkingToken?: (token: string, fullText: string) => void;
  synthesize?: boolean;
  signal?: AbortSignal;
}): Promise<{ thinking: ThinkingResult; synthesis: SynthesisResult | null }> {
  const { text, systemPrompt, history, onThinkingToken, synthesize, signal } = opts;

  const fullHistory = [...history, { role: 'user', content: text }];
  const thinking = await thinkingInference(systemPrompt, fullHistory, onThinkingToken, signal);

  let synthesis: SynthesisResult | null = null;
  if (synthesize) {
    synthesis = await synthesizeVoice(thinking.text, signal);
  }

  return { thinking, synthesis };
}

// ─── Audio Playback ─────────────────────────────────────────

/**
 * Play synthesized audio through the browser.
 * Falls back to Web Speech API TTS if no audio blob.
 */
export function playAudio(result: SynthesisResult | null, fallbackText?: string): void {
  if (result?.audioBlob) {
    const url = URL.createObjectURL(result.audioBlob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.play().catch(err => {
      console.warn('[LFM Chain] Audio playback failed, falling back to browser TTS:', err);
      if (fallbackText) browserTTS(fallbackText);
    });
    return;
  }

  // Fallback: browser Web Speech API
  if (fallbackText) browserTTS(fallbackText);
}

/**
 * Browser TTS fallback — used when LFM Audio S2S is offline.
 * Tuned to Hugh's voice profile from soul_anchor.yaml:
 *   rate: 0.95, pitch: 0.85 (chest voice), prefer "Daniel"
 */
export function browserTTS(text: string): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const cleaned = text.replace(/<[^>]+>/g, '').replace(/\*\*?/g, '');
  if (!cleaned.trim()) return;

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 0.95;
  utterance.pitch = 0.85;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('daniel'))
    || voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('female'))
    || voices[0];
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
}

// ─── Pheromone Emission Helpers ─────────────────────────────

async function emitAudioPheromone(
  transcription: TranscriptionResult,
  _audioBlob: Blob
): Promise<void> {
  try {
    await convex.mutation(api.pheromones.emitAudio, {
      intent: mapIntent(transcription.text),
      transcription: transcription.text,
      confidence: transcription.confidence,
      ttlMs: 5000,
      emitterSignature: 'workshop-browser:operator',
      emitterId: 'lfm-audio-chain',
    });
  } catch (err) {
    console.warn('[LFM Chain] Audio pheromone emission failed:', err);
  }
}

async function emitVLPheromone(vl: VLResult): Promise<void> {
  try {
    await convex.mutation(api.pheromones.emitVisual, {
      intent: 'spatial_search',
      position: vl.coordinates,
      size: { width: 0.5, height: 0.5 },
      weight: 0.6,
      content: {
        type: 'text',
        content: vl.description,
        format: 'plaintext',
      },
      ttlMs: 8000,
      emitterSignature: 'workshop-browser:vl-node',
      emitterId: 'lfm-vl-chain',
    });
  } catch (err) {
    console.warn('[LFM Chain] VL pheromone emission failed:', err);
  }
}

// ─── Utilities ──────────────────────────────────────────────

function mapIntent(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('play') || lower.includes('show')) return 'media_playback';
  if (lower.includes('search') || lower.includes('find') || lower.includes('where')) return 'spatial_search';
  if (lower.includes('read') || lower.includes('text')) return 'text_display';
  if (lower.includes('navigate') || lower.includes('map') || lower.includes('go to')) return 'navigation';
  if (lower.includes('light') || lower.includes('turn') || lower.includes('home')) return 'ha_control';
  if (lower.includes('status') || lower.includes('health') || lower.includes('telemetry')) return 'dashboard';
  return 'spatial_search';
}

function parseVLCoordinates(content: string): { x: number; y: number; z: number } {
  // Try to extract coordinates from VL response
  const coordMatch = content.match(/\((-?[\d.]+),\s*(-?[\d.]+)(?:,\s*(-?[\d.]+))?\)/);
  if (coordMatch) {
    return {
      x: parseFloat(coordMatch[1]!) || 0,
      y: parseFloat(coordMatch[2]!) || 0,
      z: parseFloat(coordMatch[3] || '-1'),
    };
  }
  return { x: 0, y: 0, z: -1 };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Chain Status (for UI feedback) ─────────────────────────

export type ChainStage = 'idle' | 'transcribing' | 'thinking' | 'synthesizing' | 'speaking' | 'observing';

export function getChainStatusLabel(stage: ChainStage): string {
  switch (stage) {
    case 'idle': return '';
    case 'transcribing': return 'LISTENING...';
    case 'thinking': return 'REASONING...';
    case 'synthesizing': return 'FINDING VOICE...';
    case 'speaking': return 'SPEAKING...';
    case 'observing': return 'OBSERVING...';
  }
}
