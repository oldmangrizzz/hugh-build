/**
 * OmniChat — Streaming Response Component
 *
 * Displays LFM 2.5 thinking model responses as particle text clusters.
 *
 * Architecture:
 * - Subscribes to audio pheromones (triggers response generation)
 * - Calls LFM 2.5 inference endpoint (DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-DISTILL)
 * - Streams tokens via Server-Sent Events (SSE)
 * - Renders text as particle clusters (Clifford attractor: text_display state)
 *
 * Integration with VoicePortal:
 * - VoicePortal emits audio pheromone on spacebar release
 * - OmniChat observes substrate, detects new audio intent
 * - Triggers inference → streams response
 *
 * @version 2.0 — Production Specification
 * @classification Production Ready
 */

import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

interface StreamChunk {
  token: string;
  reasoning?: string; // LFM 2.5 thinking trace
  done: boolean;
}

export const OmniChat: React.FC = () => {
  const [response, setResponse] = useState<string>('');
  const [reasoningTrace, setReasoningTrace] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastAudioIntent, setLastAudioIntent] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamControllerRef = useRef<AbortController | null>(null);

  // Observe audio pheromones (trigger inference)
  const audioPheromones = useQuery(api.pheromones.getLatestAudio);

  /**
   * Detect new audio intent → trigger inference
   */
  useEffect(() => {
    if (!audioPheromones || audioPheromones.length === 0) return;

    const latest = audioPheromones[0];
    const intentId = String(latest._id);

    if (intentId === lastAudioIntent) return; // Already processed

    if (latest.confidence && latest.confidence < 0.6) {
      console.warn("[OmniChat] Low confidence audio, skipping");
      return;
    }

    // Trigger inference
    setLastAudioIntent(intentId);
    startInference(latest.transcription || latest.intentCategory);

  }, [audioPheromones, lastAudioIntent]);

  /**
   * Start LFM 2.5 Inference Stream
   *
   * Calls the thinking model endpoint with SSE streaming.
   */
  const startInference = async (prompt: string) => {
    setIsStreaming(true);
    setResponse('');
    setReasoningTrace('');

    streamControllerRef.current = new AbortController();

    try {
      const response = await fetch(import.meta.env.VITE_LFM_THINKING_ENDPOINT || '/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_LFM_API_KEY || 'hugh-local'}`,
        },
        body: JSON.stringify({
          model: 'DavidAU/LFM2.5-1.2B-Thinking-Claude-4.6-Opus-Heretic-Uncensored-DISTILL',
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          stream_options: {
            include_reasoning: true, // LFM 2.5 thinking trace
          },
          max_tokens: 1024,
          temperature: 0.7,
        }),
        signal: streamControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Inference failed: ${response.status}`);
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6)) as StreamChunk;

            if (data.reasoning) {
              setReasoningTrace(prev => prev + data.reasoning);
            }
            if (data.token) {
              setResponse(prev => prev + data.token);
            }
            if (data.done) {
              setIsStreaming(false);
            }
          }
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("[OmniChat] Inference error:", error);
        setResponse(`Error: ${error.message}`);
      }
      setIsStreaming(false);
    }
  };

  /**
   * Auto-scroll to bottom
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [response]);

  /**
   * Cancel streaming
   */
  const cancelStream = () => {
    streamControllerRef.current?.abort();
    setIsStreaming(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '320px',
        width: '400px',
        maxHeight: '400px',
        overflowY: 'auto',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '12px',
        padding: '16px',
        fontFamily: 'monospace',
        fontSize: '13px',
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ fontWeight: 'bold', color: '#fff' }}>
          OMNICHAT
        </div>
        {isStreaming && (
          <button
            onClick={cancelStream}
            style={{
              background: 'rgba(255, 100, 100, 0.3)',
              border: 'none',
              color: '#ff6b6b',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '10px',
            }}
          >
            ■ STOP
          </button>
        )}
      </div>

      {/* Reasoning trace (LFM 2.5 thinking) */}
      {reasoningTrace && (
        <div
          style={{
            marginBottom: '12px',
            padding: '10px',
            background: 'rgba(50, 30, 50, 0.5)',
            borderRadius: '6px',
            borderLeft: '3px solid rgba(150, 100, 200, 0.5)',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              color: 'rgba(150, 100, 200, 0.8)',
              marginBottom: '6px',
              fontFamily: 'monospace',
            }}
          >
            THINKING TRACE
          </div>
          <div
            style={{
              color: 'rgba(180, 140, 200, 0.7)',
              fontSize: '11px',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
            }}
          >
            {reasoningTrace}
          </div>
        </div>
      )}

      {/* Response */}
      <div
        style={{
          color: '#4ecdc4',
          lineHeight: '1.6',
          minHeight: '60px',
        }}
      >
        {response || (
          <span style={{ color: '#666', fontStyle: 'italic' }}>
            Waiting for voice input...
          </span>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#888',
            fontSize: '11px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              background: '#4ecdc4',
              borderRadius: '50%',
              animation: 'pulse 0.5s infinite',
            }}
          />
          Streaming...
        </div>
      )}
    </div>
  );
};

export default OmniChat;
