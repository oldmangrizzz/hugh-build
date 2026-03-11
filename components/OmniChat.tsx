/**
 * OmniChat — Unified Chat Interface for H.U.G.H.
 *
 * Text + voice input, streaming LFM inference responses,
 * conversation history, TTS output, and think-tag stripping.
 *
 * Voice: Web Speech API (SpeechRecognition) for browser-native STT.
 * Fallback: WAV encoding → hughAudioService for LFM inference.
 *
 * @version 3.0 — Voice-First STT Integration
 * @classification Production Ready
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { HUGH_SYSTEM_PROMPT, buildEnrichedPrompt } from "../services/hughIdentity";
import { processAudioStream } from "../services/hughAudioService";

// Web Speech API types (not in standard TS lib)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

type SpeechRecognitionInstance = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

/** Encode Float32Array PCM chunks → 16-bit WAV Blob */
function encodeWAV(chunks: Float32Array[], sampleRate: number): Blob {
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const pcm16 = new Int16Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      const s = Math.max(-1, Math.min(1, chunk[i]!));
      pcm16[offset++] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
  }

  const dataLength = pcm16.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);           // chunk size
  view.setUint16(20, 1, true);            // PCM format
  view.setUint16(22, 1, true);            // mono
  view.setUint32(24, sampleRate, true);   // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);            // block align
  view.setUint16(34, 16, true);           // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // PCM data
  const dataView = new Int16Array(buffer, 44);
  dataView.set(pcm16);

  return new Blob([buffer], { type: 'audio/wav' });
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

/** Strip <think>...</think> blocks and clean markdown artifacts */
function cleanResponse(raw: string): string {
  // Remove <think>...</think> blocks (greedy, multiline)
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Remove any unclosed <think> block at the end (still streaming)
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');
  // Convert **bold** to plain text
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  // Convert *italic* to plain text
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  // Trim leading whitespace that remains after stripping think blocks
  cleaned = cleaned.replace(/^\s+/, '');
  return cleaned;
}

/** Speak text via Web Speech API (browser TTS) */
function speak(text: string) {
  if (!window.speechSynthesis) return;
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  const cleaned = text.replace(/<[^>]+>/g, '').replace(/\*\*?/g, '');
  if (!cleaned.trim()) return;
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 0.95;
  utterance.pitch = 0.85; // Lower pitch — chest voice
  // Prefer a male English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('daniel'))
    || voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('female'))
    || voices[0];
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
}

export const OmniChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Workshop online. Clifford field nominal, substrate warm. What wisdom do you seek today?",
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Query core identity knowledge from Convex substrate
  const coreIdentity = useQuery(api.pheromones.getCoreIdentity);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const recordingStartRef = useRef<number>(0);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);

  // Web Speech API refs
  const speechRecRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef<string>('');
  const sttAvailableRef = useRef<boolean>(
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  // Load voices (Safari needs this)
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', () => {
      window.speechSynthesis.getVoices();
    });
  }, []);

  // Keep messagesRef in sync for stable callbacks
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  /**
   * Send a text message to Hugh via LFM inference
   */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    // Use ref to get current messages — avoids stale closure
    const currentMessages = messagesRef.current;
    const updatedMessages = [...currentMessages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    // Add streaming placeholder
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMsg]);

    // Build conversation history (last 10 messages, cleaned)
    const history = updatedMessages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Build enriched system prompt from Convex knowledge base
    const systemPrompt = coreIdentity && coreIdentity.length > 0
      ? buildEnrichedPrompt(coreIdentity)
      : HUGH_SYSTEM_PROMPT;

    streamControllerRef.current = new AbortController();

    try {
      const endpoint = import.meta.env.VITE_LFM_THINKING_ENDPOINT || '/api/inference/v1/chat/completions';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_LFM_API_KEY || 'hugh-local'}`,
        },
        body: JSON.stringify({
          model: 'DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
          ],
          stream: true,
          max_tokens: 512,
          temperature: 0.7,
        }),
        signal: streamControllerRef.current.signal,
      });

      if (!res.ok) throw new Error(`LFM_OFFLINE:${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response body');

      let fullResponse = '';

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
                fullResponse += token;
                const display = cleanResponse(fullResponse);
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: display };
                  }
                  return updated;
                });
              }
            } catch { /* malformed chunk, skip */ }
          }
        }
      }

      // Finalize
      const finalContent = cleanResponse(fullResponse) || 'Copy that.';
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            isStreaming: false,
            content: finalContent,
          };
        }
        return updated;
      });

      // TTS — speak the response
      if (ttsEnabled) speak(finalContent);

    } catch (error: any) {
      if (error?.name === 'AbortError') return;

      const isOffline = error?.message?.includes('Failed to fetch') ||
                        error?.message?.includes('NetworkError') ||
                        error?.message?.includes('LFM_OFFLINE');

      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            isStreaming: false,
            content: isOffline
              ? "LFM inference offline. The field is moving, the substrate is warm — but my voice needs the thinking model on the VPS."
              : `Inference error: ${error?.message}`,
          };
        }
        return updated;
      });
    }

    setIsStreaming(false);
  }, [isStreaming, ttsEnabled, coreIdentity]);

  const cancelStream = useCallback(() => {
    streamControllerRef.current?.abort();
    window.speechSynthesis?.cancel();
    setIsStreaming(false);
    setMessages(prev => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.role === 'assistant' && last.isStreaming) {
        updated[updated.length - 1] = { ...last, isStreaming: false, content: cleanResponse(last.content) || '[Cancelled]' };
      }
      return updated;
    });
  }, []);

  // Voice recording — lazy init
  const initAudio = useCallback(async () => {
    if (audioContextRef.current) return true;
    try {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      return true;
    } catch (e) {
      console.error('[OmniChat] Mic access denied:', e);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording || isStreaming) return;
    const ready = await initAudio();
    if (!ready || !audioContextRef.current || !mediaStreamRef.current) return;

    audioChunksRef.current = [];
    recordingStartRef.current = Date.now();
    transcriptRef.current = '';

    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      audioChunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
    sourceRef.current = source;
    processorRef.current = processor;

    // Start Web Speech API recognition in parallel
    if (sttAvailableRef.current) {
      try {
        const SpeechRecAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecAPI) {
          const recognition = new SpeechRecAPI();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.maxAlternatives = 1;

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const result = event.results[i]!;
              if (result.isFinal) {
                final += result[0]!.transcript;
              } else {
                interim += result[0]!.transcript;
              }
            }
            if (final) {
              transcriptRef.current += final;
            }
            // Show interim results in input field
            setInput(transcriptRef.current + interim);
          };

          recognition.onerror = (event: Event & { error: string }) => {
            if (event.error !== 'aborted') {
              console.warn('[OmniChat STT] Recognition error:', event.error);
            }
          };

          recognition.onend = () => {
            // Recognition can auto-stop; don't restart if user stopped recording
          };

          recognition.start();
          speechRecRef.current = recognition;
        }
      } catch (e) {
        console.warn('[OmniChat STT] Failed to start recognition:', e);
        sttAvailableRef.current = false;
      }
    }

    setIsRecording(true);
  }, [initAudio, isRecording, isStreaming]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;
    setIsRecording(false);

    // Stop audio nodes
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
    } catch {}

    // Stop speech recognition
    try {
      speechRecRef.current?.stop();
    } catch {}
    speechRecRef.current = null;

    // Ignore very short presses (< 500ms)
    if (Date.now() - recordingStartRef.current < 500) {
      setInput('');
      return;
    }

    const totalLength = audioChunksRef.current.reduce((acc, c) => acc + c.length, 0);
    if (totalLength === 0) {
      setInput('');
      return;
    }

    // Path 1: Web Speech API transcript available
    const transcript = transcriptRef.current.trim();
    if (transcript) {
      setInput('');
      sendMessage(transcript);

      // Also emit audio pheromone via service (fire-and-forget)
      try {
        const audioBlob = encodeWAV(audioChunksRef.current, 16000);
        processAudioStream(audioBlob, 'workshop-browser:operator').catch(() => {});
      } catch {}
      return;
    }

    // Path 2: No Web Speech API — fall back to LFM audio endpoint
    setInput('');
    try {
      const audioBlob = encodeWAV(audioChunksRef.current, 16000);
      sendMessage('[Transcribing via LFM audio...]');
      await processAudioStream(audioBlob, 'workshop-browser:operator');
    } catch (err) {
      console.warn('[OmniChat STT] LFM audio fallback failed:', err);
      sendMessage('[Voice captured — transcription unavailable. Try typing instead.]');
    }
  }, [isRecording, sendMessage]);

  // Spacebar handler (only when input not focused)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement !== inputRef.current) {
        e.preventDefault();
        startRecording();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        stopRecording();
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [startRecording, stopRecording]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(640px, calc(100vw - 48px))',
      maxHeight: '65vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(10, 10, 10, 0.92)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(78, 205, 196, 0.12)',
      borderRadius: '16px',
      overflow: 'hidden',
      zIndex: 1000,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 1px rgba(78, 205, 196, 0.2)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#4ecdc4',
            boxShadow: '0 0 8px rgba(78, 205, 196, 0.6)',
            animation: 'pulse 3s infinite',
          }} />
          <span style={{ color: '#4ecdc4', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em' }}>
            H.U.G.H.
          </span>
          <span style={{ color: '#555', fontSize: '10px' }}>OMNICHAT</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* TTS toggle */}
          <button
            onClick={() => { setTtsEnabled(!ttsEnabled); window.speechSynthesis?.cancel(); }}
            style={{
              background: 'transparent',
              border: `1px solid ${ttsEnabled ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: ttsEnabled ? '#4ecdc4' : '#444',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '9px',
              letterSpacing: '0.05em',
            }}
            title={ttsEnabled ? 'Voice output ON' : 'Voice output OFF'}
          >
            {ttsEnabled ? '🔊 TTS' : '🔇 TTS'}
          </button>
          {isStreaming && (
            <button
              onClick={cancelStream}
              style={{
                background: 'rgba(255, 107, 107, 0.15)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                color: '#ff6b6b',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '9px',
              }}
            >
              ■ STOP
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: '45vh',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              fontSize: '9px',
              color: msg.role === 'user' ? '#5fa8a0' : 'rgba(78, 205, 196, 0.5)',
              marginBottom: '3px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {msg.role === 'user' ? '⟩ OPERATOR' : '⟨ H.U.G.H.'}
            </div>
            <div style={{
              maxWidth: '90%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              background: msg.role === 'user'
                ? 'rgba(78, 205, 196, 0.08)'
                : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(78, 205, 196, 0.12)' : 'rgba(255, 255, 255, 0.03)'}`,
              color: msg.role === 'user' ? '#8ed8d2' : '#b0b0b0',
              fontSize: '13px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
              {msg.isStreaming && !msg.content && (
                <span style={{ color: '#555', fontStyle: 'italic' }}>Thinking...</span>
              )}
              {msg.isStreaming && msg.content && (
                <span style={{
                  display: 'inline-block',
                  width: '7px', height: '14px',
                  background: '#4ecdc4',
                  marginLeft: '2px',
                  animation: 'pulse 0.5s infinite',
                  verticalAlign: 'text-bottom',
                }} />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        background: 'rgba(0, 0, 0, 0.3)',
      }}>
        <button
          onMouseDown={() => startRecording()}
          onMouseUp={() => stopRecording()}
          onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
          onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: `1.5px solid ${isRecording ? '#ff6b6b' : 'rgba(78, 205, 196, 0.25)'}`,
            background: isRecording ? 'rgba(255, 107, 107, 0.15)' : 'transparent',
            color: isRecording ? '#ff6b6b' : '#4ecdc4',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px',
            transition: 'all 0.15s ease',
            flexShrink: 0, padding: 0,
            boxShadow: isRecording ? '0 0 12px rgba(255, 107, 107, 0.3)' : 'none',
          }}
          title="Hold to speak"
        >
          🎤
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? (sttAvailableRef.current ? "Listening..." : "Recording...") : "Talk to Hugh..."}
          disabled={isRecording}
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '9px 14px',
            color: '#ccc',
            fontSize: '13px',
            fontFamily: 'inherit',
            outline: 'none',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(78, 205, 196, 0.3)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isStreaming}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: 'none',
            background: input.trim() && !isStreaming ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255, 255, 255, 0.03)',
            color: input.trim() && !isStreaming ? '#4ecdc4' : '#333',
            cursor: input.trim() && !isStreaming ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0, padding: 0,
          }}
          title="Send message"
        >
          →
        </button>
      </div>

      <div style={{
        padding: '3px 16px 7px',
        fontSize: '9px',
        color: '#333',
        textAlign: 'center',
        letterSpacing: '0.08em',
      }}>
        HOLD SPACE TO SPEAK • ENTER TO SEND • VOICE TRANSCRIPTION {sttAvailableRef.current ? 'ON' : 'OFF'}
      </div>
    </div>
  );
};

export default OmniChat;
