/**
 * H.U.G.H. Audio Intent Service
 *
 * Processes audio from VoicePortal → calls LFM 2.5 inference → emits audio pheromones.
 *
 * Runs in the browser context. Uses fetch API for inference calls
 * and ConvexReactClient mutations for pheromone emission.
 *
 * @version 2.0 — Production Specification
 * @classification Production Ready
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Convex HTTP client for mutations from service context
const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL as string);

interface LFMInferenceResult {
  intent: string;
  transcription: string;
  vector: number[];
  confidence: number;
}

/**
 * Process Audio Stream
 *
 * Called by VoicePortal when user releases spacebar.
 *
 * @param audioBlob - PCM audio data as Blob
 * @param emitterSignature - Soul Anchor signature
 */
export async function processAudioStream(
  audioBlob: Blob,
  emitterSignature: string
): Promise<void> {
  try {
    const lfmEndpoint = import.meta.env.VITE_LFM_AUDIO_ENDPOINT || "http://localhost:8080/v1/audio/completions";
    const lfmApiKey = import.meta.env.VITE_LFM_API_KEY || "hugh-local";

    const lfmResponse = await fetch(lfmEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Authorization": `Bearer ${lfmApiKey}`,
      },
      body: audioBlob,
    });

    if (!lfmResponse.ok) {
      throw new Error(`LFM inference failed: ${lfmResponse.status}`);
    }

    const result: LFMInferenceResult = await lfmResponse.json();

    // Validate and normalize vector to 1536 dimensions
    let vector = result.vector ?? [];
    if (vector.length < 1536) {
      vector = [...vector, ...new Array(1536 - vector.length).fill(0)];
    } else if (vector.length > 1536) {
      vector = vector.slice(0, 1536);
    }

    // Emit audio pheromone — 5s TTL (ephemeral voice intent)
    const expiresAt = Date.now() + 5000;

    await convex.mutation(api.pheromones.emitAudio, {
      transcription: result.transcription,
      intentVector: vector,
      intentCategory: mapIntentCategory(result.intent),
      expiresAt,
      emitterSignature,
      confidence: result.confidence,
    });

    console.log(
      `[H.U.G.H Audio] Pheromone emitted: "${result.transcription}" → ${result.intent} (conf: ${result.confidence})`
    );

  } catch (error) {
    console.error("[H.U.G.H Audio] Inference or routing failure:", error);
    throw error;
  }
}

function mapIntentCategory(intent: string): string {
  const intentLower = intent.toLowerCase();
  if (intentLower.includes("play") || intentLower.includes("show")) return "media_playback";
  if (intentLower.includes("search") || intentLower.includes("find")) return "spatial_search";
  if (intentLower.includes("text") || intentLower.includes("read")) return "text_display";
  if (intentLower.includes("idle") || intentLower.includes("wait")) return "idle";
  return "spatial_search";
}

/**
 * Generate Soul Anchor Signature (browser-side stub)
 *
 * In production, this derives from hardware-bound keys.
 * For dev: deterministic signature format.
 */
export function generateEmitterSignature(): string {
  const nodeId = "audio_node_alpha";
  const timestamp = Date.now().toString();
  const hardwareSig = btoa(`${nodeId}:dev:${timestamp}`);
  return `${nodeId}:${hardwareSig}:${timestamp}`;
}
