/**
 * VoicePortal — Spacebar Voice Input Component
 *
 * Captures audio via Web Audio API, processes through LFM 2.5,
 * and emits audio pheromones to the Convex substrate.
 *
 * Interaction:
 * - Hold spacebar: Start recording (visual feedback: particles tense)
 * - Release spacebar: Stop recording → process → emit pheromone
 *
 * Audio Pipeline:
 * 1. MediaDevices.getUserMedia({ audio: true })
 * 2. AudioContext + ScriptProcessor → Float32Array PCM
 * 3. POST to LFM 2.5 inference endpoint
 * 4. Emit audio pheromone with vector + intent
 *
 * @version 2.0 — Production Specification
 * @classification Production Ready
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { processAudioStream, generateEmitterSignature } from "../services/hughAudioService";

const AUDIO_SAMPLE_RATE = 16000; // LFM 2.5 expects 16kHz mono
const MIN_RECORDING_MS = 500; // Minimum recording duration

export const VoicePortal: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const startTimeRef = useRef<number>(0);

  // Convex mutation for emitting audio pheromone
  const emitAudio = useMutation(api.pheromones.emitAudio);

  /**
   * Initialize Audio Context
   */
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new AudioContext({
          sampleRate: AUDIO_SAMPLE_RATE,
        });

        // Request microphone access
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: AUDIO_SAMPLE_RATE,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        console.log("[VoicePortal] Audio context initialized");
      } catch (error) {
        console.error("[VoicePortal] Audio init failed:", error);
        setStatus('error');
      }
    };

    initAudio();

    return () => {
      // Cleanup: Stop microphone stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  /**
   * Start Recording
   *
   * Called on spacebar keydown.
   */
  const startRecording = useCallback(() => {
    if (!audioContextRef.current || !mediaStreamRef.current) {
      console.warn("[VoicePortal] Audio not initialized");
      return;
    }

    // Reset chunks
    audioChunksRef.current = [];
    startTimeRef.current = Date.now();

    // Create audio source + processor
    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      audioChunksRef.current.push(new Float32Array(inputData));
    };

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);

    setIsRecording(true);
    setStatus('idle');
    console.log("[VoicePortal] Recording started");
  }, []);

  /**
   * Stop Recording + Process + Emit
   *
   * Called on spacebar keyup.
   */
  const stopRecording = useCallback(async () => {
    if (!audioContextRef.current) return;

    const duration = Date.now() - startTimeRef.current;

    if (duration < MIN_RECORDING_MS) {
      console.warn("[VoicePortal] Recording too short (<500ms), discarding");
      setIsRecording(false);
      return;
    }

    setStatus('processing');

    // Concatenate all chunks
    const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const audioData = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunksRef.current) {
      audioData.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert Float32Array to Int16Array PCM (browser-native, no Buffer needed)
    const pcmData = new Int16Array(
      audioData.map(sample => Math.max(-32768, Math.min(32767, sample * 32767)))
    );
    const pcmBlob = new Blob([pcmData.buffer], { type: 'audio/pcm' });

    // Generate Soul Anchor signature
    const emitterSignature = generateEmitterSignature();

    try {
      // Process through LFM 2.5 → emit pheromone
      await processAudioStream(pcmBlob, emitterSignature);

      setStatus('idle');
      console.log("[VoicePortal] Audio pheromone emitted");

    } catch (error) {
      console.error("[VoicePortal] Processing failed:", error);
      setStatus('error');
    }

    setIsRecording(false);
  }, []);

  /**
   * Keyboard Handler
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault(); // Prevent page scroll
        startRecording();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        stopRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startRecording, stopRecording]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {/* Visual indicator */}
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: status === 'processing'
            ? 'rgba(255, 100, 100, 0.8)'
            : isRecording
              ? 'rgba(100, 200, 100, 0.8)'
              : 'rgba(200, 200, 200, 0.5)',
          boxShadow: isRecording
            ? '0 0 20px rgba(100, 255, 100, 0.6)'
            : 'none',
          transition: 'all 0.15s ease',
          pointerEvents: 'auto',
        }}
        aria-label={isRecording ? 'Recording' : 'Voice portal idle'}
      />

      {/* Transcript display */}
      {transcript && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'monospace',
          }}
        >
          {transcript}
        </div>
      )}

      {/* Status indicator */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '12px',
          color: status === 'error' ? '#ff6b6b' : '#888',
          fontFamily: 'monospace',
        }}
      >
        {status === 'processing' ? 'Processing...' : status === 'error' ? 'Error' : 'Hold SPACE to speak'}
      </div>
    </div>
  );
};

export default VoicePortal;
