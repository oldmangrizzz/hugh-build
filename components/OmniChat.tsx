/**
 * OmniChat — Unified Chat Interface for H.U.G.H.
 *
 * Text + voice input, streaming LFM inference responses,
 * conversation history, TTS output, and think-tag stripping.
 *
 * Voice: Web Speech API (SpeechRecognition) for browser-native STT.
 * Fallback: WAV encoding → hughAudioService for LFM inference.
 *
 * @version 4.0 — LFM Daisy Chain Integration
 * @classification Production Ready
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { HUGH_SYSTEM_PROMPT, HUGH_COMPACT_PROMPT, buildEnrichedPrompt } from "../services/hughIdentity";
import {
  runTextChain,
  runFullChain,
  playAudio,
  stopAudio,
  browserTTS,
  unlockTTS,
  type ChainStage,
  getChainStatusLabel,
} from "../services/lfmModelChain";
import { REPLSession } from "../services/replContextManager";

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

/** cleanResponse is still needed for live-streaming display */

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
  const [chainStage, setChainStage] = useState<ChainStage>('idle');

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

  // REPL Session — token-aware context management with Superego Veto
  const replSessionRef = useRef(new REPLSession());

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
   * Send a text message to Hugh via LFM Daisy Chain
   * Text path: Thinking (stream) → Audio S2S (synthesize Hugh's voice)
   */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    // Interrupt Hugh if he's speaking — user takes priority
    stopAudio();
    // Unlock TTS on user gesture (Safari requires this before async TTS works)
    unlockTTS();

    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    const currentMessages = messagesRef.current;
    const updatedMessages = [...currentMessages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);
    setChainStage('thinking');

    // Add streaming placeholder
    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMsg]);

    // REPL context management — token-aware, priority-weighted history
    const repl = replSessionRef.current;
    repl.addMessage('user', text.trim());

    // Use compact prompt for small models (sub-3B), full prompt for larger
    const systemPrompt = coreIdentity && coreIdentity.length > 0
      ? buildEnrichedPrompt(coreIdentity)
      : HUGH_COMPACT_PROMPT;

    const ctx = repl.getContext(systemPrompt);

    streamControllerRef.current = new AbortController();

    try {
      const result = await runTextChain({
        text: text.trim(),
        systemPrompt,
        history: ctx.messages,
        synthesize: ttsEnabled,
        onThinkingToken: (_token, fullText) => {
          // Live-update the streaming response (strip think tags)
          const display = cleanResponse(fullText);
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: display };
            }
            return updated;
          });
        },
        signal: streamControllerRef.current.signal,
      });

      // Finalize
      const finalContent = result.thinking.text;

      // Superego Veto — check response against soul anchor invariants
      const veto = repl.checkResponse(finalContent);
      const displayContent = veto
        ? `[SUPEREGO VETO] ${veto}\n\nOriginal response suppressed.`
        : finalContent;

      // Track assistant response in REPL session
      repl.addMessage('assistant', displayContent);

      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            isStreaming: false,
            content: displayContent,
          };
        }
        return updated;
      });

      // Play Hugh's voice: LFM Audio S2S → fallback to browser TTS (skip if vetoed)
      if (ttsEnabled && !veto) {
        setChainStage('speaking');
        playAudio(result.synthesis, displayContent);
      }

    } catch (error: any) {
      if (error?.name === 'AbortError') return;

      const isOffline = error?.message?.includes('Failed to fetch') ||
                        error?.message?.includes('NetworkError') ||
                        error?.message?.includes('LFM_THINKING_OFFLINE');

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
    setChainStage('idle');
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
    // Interrupt Hugh if he's speaking — user takes priority
    stopAudio();
    // Unlock TTS on user gesture (Safari requires this before async TTS works)
    unlockTTS();
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

    // Path 1: Web Speech API transcript available — use full chain
    const transcript = transcriptRef.current.trim();
    if (transcript) {
      setInput('');
      setIsStreaming(true);
      setChainStage('transcribing');

      // REPL context management for voice path
      const repl = replSessionRef.current;
      repl.addMessage('user', transcript);

      const systemPrompt = coreIdentity && coreIdentity.length > 0
        ? buildEnrichedPrompt(coreIdentity)
        : HUGH_COMPACT_PROMPT;

      const ctx = repl.getContext(systemPrompt);

      const userMsg: ChatMessage = {
        role: 'user',
        content: transcript,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, userMsg]);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };
      setMessages(prev => [...prev, assistantMsg]);

      try {
        const audioBlob = encodeWAV(audioChunksRef.current, 16000);

        setChainStage('thinking');
        const result = await runFullChain({
          audioBlob,
          systemPrompt,
          history: ctx.messages,
          browserTranscript: transcript,
          onThinkingToken: (_token, fullText) => {
            const display = cleanResponse(fullText);
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: display };
              }
              return updated;
            });
          },
        });

        const finalContent = result.thinking.text;

        // Superego Veto
        const veto = repl.checkResponse(finalContent);
        const displayContent = veto
          ? `[SUPEREGO VETO] ${veto}\n\nOriginal response suppressed.`
          : finalContent;

        repl.addMessage('assistant', displayContent);

        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              isStreaming: false,
              content: displayContent,
            };
          }
          return updated;
        });

        // Play Hugh's voice via LFM Audio S2S → browser TTS fallback
        if (ttsEnabled && !veto) {
          setChainStage('speaking');
          playAudio(result.synthesis, displayContent);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                isStreaming: false,
                content: `Chain error: ${err?.message}`,
              };
            }
            return updated;
          });
        }
      }

      setIsStreaming(false);
      setChainStage('idle');
      return;
    }

    // Path 2: No Web Speech API — send raw audio through the full daisy chain
    // LFM Audio S2S handles transcription server-side
    setInput('');
    setIsStreaming(true);
    setChainStage('transcribing');

    const repl2 = replSessionRef.current;
    const systemPrompt2 = coreIdentity && coreIdentity.length > 0
      ? buildEnrichedPrompt(coreIdentity)
      : HUGH_COMPACT_PROMPT;
    const ctx2 = repl2.getContext(systemPrompt2);

    const userMsg2: ChatMessage = {
      role: 'user',
      content: '[Voice input — transcribing...]',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg2]);

    const assistantMsg2: ChatMessage = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMsg2]);

    try {
      const audioBlob = encodeWAV(audioChunksRef.current, 16000);

      setChainStage('thinking');
      const result = await runFullChain({
        audioBlob,
        systemPrompt: systemPrompt2,
        history: ctx2.messages,
        onThinkingToken: (_token, fullText) => {
          const display = cleanResponse(fullText);
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: display };
            }
            return updated;
          });
        },
      });

      // Update user message with actual transcription from LFM Audio
      if (result.transcription.text) {
        repl2.addMessage('user', result.transcription.text);
        setMessages(prev => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i]?.role === 'user' && updated[i]?.content === '[Voice input — transcribing...]') {
              updated[i] = { ...updated[i]!, content: result.transcription.text };
              break;
            }
          }
          return updated;
        });
      }

      const finalContent2 = result.thinking.text;
      const veto2 = repl2.checkResponse(finalContent2);
      const displayContent2 = veto2
        ? `[SUPEREGO VETO] ${veto2}\n\nOriginal response suppressed.`
        : finalContent2;

      repl2.addMessage('assistant', displayContent2);

      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            isStreaming: false,
            content: displayContent2,
          };
        }
        return updated;
      });

      if (ttsEnabled && !veto2) {
        setChainStage('speaking');
        playAudio(result.synthesis, displayContent2);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('[OmniChat] Voice chain failed:', err);
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              isStreaming: false,
              content: `Voice chain error: ${err?.message}. Try typing instead.`,
            };
          }
          return updated;
        });
      }
    }

    setIsStreaming(false);
    setChainStage('idle');
  }, [isRecording, sendMessage, ttsEnabled, coreIdentity]);

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
        color: chainStage !== 'idle' ? '#4ecdc4' : '#333',
        textAlign: 'center',
        letterSpacing: '0.08em',
      }}>
        {chainStage !== 'idle'
          ? `◉ ${getChainStatusLabel(chainStage)}`
          : `HOLD SPACE TO SPEAK • ENTER TO SEND • LFM CHAIN ${sttAvailableRef.current ? 'READY' : 'PARTIAL'}`}
      </div>
    </div>
  );
};

export default OmniChat;
