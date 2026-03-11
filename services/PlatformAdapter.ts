/**
 * Platform Adapter — Cross-Platform Rendering Abstraction
 *
 * Whitepaper §5.3: Abstraction layer for web/WebXR/visionOS rendering backends.
 * Each platform implements this interface to provide particle rendering
 * appropriate to the device's capabilities.
 *
 * Platform targets:
 *   Web       — Canvas2D (8-15K) or WebGPU (100K particles)
 *   WebXR     — Three.js + WebGPURenderer (50K particles, Quest 3)
 *   visionOS  — RealityKit (200K particles, future)
 *
 * @version 1.0 — Phase 7: Platform Foundation
 * @classification Production Ready
 */

export interface AttractorParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

export interface SomaticState {
  hueShift: number;    // degrees rotation from base cyan (174°)
  turbulence: number;  // movement agitation multiplier (1.0 = normal)
  driftSpeed: number;  // interpolation rate modifier (1.0 = normal)
}

export interface ContentZone {
  cx: number;
  cy: number;
  radius: number;
  weight: number;
}

export interface SpatialPheromone {
  x: number;
  y: number;
  radius: number;
  weight: number;
  attractor: AttractorParams;
}

export type RendererType =
  | 'web-canvas2d'
  | 'web-webgpu'
  | 'webxr-threejs'
  | 'visionos-realitykit';

export interface PlatformCapabilities {
  maxParticles: number;
  supportsWebGPU: boolean;
  supportsWebXR: boolean;
  supportsHaptics: boolean;
  preferredRenderer: RendererType;
}

/**
 * PlatformAdapter — the contract every renderer must fulfill.
 *
 * CliffordField (Canvas2D/WebGPU) implements this implicitly today.
 * ImmersiveScene (Three.js) is the first explicit implementation.
 * Future: visionOS RealityKit adapter.
 */
export interface PlatformAdapter {
  readonly type: RendererType;
  readonly particleCount: number;

  initialize(container: HTMLElement): Promise<void>;
  setAttractorParams(params: AttractorParams): void;
  setSomaticState(state: SomaticState): void;
  setContentZones(zones: ContentZone[]): void;
  setSpatialPheromones(pheromones: SpatialPheromone[]): void;
  resize(): void;
  destroy(): void;
}

/**
 * Detect current platform capabilities.
 * Used by WorkshopApp to select the appropriate renderer.
 */
export function detectPlatform(): PlatformCapabilities {
  const ua = navigator.userAgent;
  const isAppleMobile =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);

  const hasWebGPU = !!navigator.gpu && !isAppleMobile;

  // WebXR detection — check for immersive-vr or immersive-ar support
  const hasWebXR = 'xr' in navigator;
  const hasHaptics = 'vibrate' in navigator;

  if (hasWebXR) {
    return {
      maxParticles: 50000,
      supportsWebGPU: hasWebGPU,
      supportsWebXR: true,
      supportsHaptics: hasHaptics,
      preferredRenderer: 'webxr-threejs',
    };
  }

  return {
    maxParticles: hasWebGPU ? 100000 : 15000,
    supportsWebGPU: hasWebGPU,
    supportsWebXR: false,
    supportsHaptics: hasHaptics,
    preferredRenderer: hasWebGPU ? 'web-webgpu' : 'web-canvas2d',
  };
}

// Attractor state presets — shared across all renderers
export const ATTRACTOR_PRESETS: Record<string, AttractorParams> = {
  idle:            { a: -1.4, b:  1.6, c:  1.0, d:  0.7 },
  media_playback:  { a:  0.0, b:  0.0, c:  1.0, d:  1.0 },
  spatial_search:  { a:  1.7, b:  1.7, c:  0.6, d:  1.2 },
  text_display:    { a: -1.7, b:  1.3, c: -0.1, d: -1.2 },
  alert:           { a:  2.0, b: -1.8, c:  0.3, d:  1.5 },
  dashboard:       { a:  0.1, b:  0.1, c:  0.8, d:  0.8 },
  navigation:      { a:  1.2, b: -1.2, c:  1.5, d:  0.3 },
};

export const SOMATIC_NEUTRAL: SomaticState = {
  hueShift: 0,
  turbulence: 1,
  driftSpeed: 1,
};
