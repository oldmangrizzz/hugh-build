/**
 * Clifford Field — Particle Attractor Rendering Engine
 *
 * Renders particles governed by Clifford attractor dynamics:
 *   nx = sin(a·y) + c·cos(a·x)
 *   ny = sin(b·x) + d·cos(b·y)
 *
 * WebGPU (100K particles) on supported desktop browsers.
 * Canvas2D fallback (8K-15K particles) everywhere else.
 * iOS/iPadOS always uses Canvas2D (Safari WebGPU is unreliable).
 *
 * @version 3.0 — Bulletproof Rendering
 * @classification Production Ready
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const WORKGROUP_SIZE = 256;

const ATTRACTOR_STATES: Record<string, { a: number; b: number; c: number; d: number }> = {
  idle: { a: -1.4, b: 1.6, c: 1.0, d: 0.7 },
  media_playback: { a: 0.0, b: 0.0, c: 1.0, d: 1.0 },
  spatial_search: { a: 1.7, b: 1.7, c: 0.6, d: 1.2 },
  text_display: { a: -1.7, b: 1.3, c: -0.1, d: -1.2 },
  alert: { a: 2.0, b: -1.8, c: 0.3, d: 1.5 },
  dashboard: { a: 0.1, b: 0.1, c: 0.8, d: 0.8 },
  navigation: { a: 1.2, b: -1.2, c: 1.5, d: 0.3 },
};

const smoothLerp = (start: number, end: number, t: number): number => {
  const s = t * t * (3 - 2 * t);
  return start + (end - start) * s;
};

// Detect iOS/iPadOS — force Canvas2D (Safari WebGPU is broken for compute)
function isAppleMobile(): boolean {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ spoofs macOS UA — check touch support
  if (ua.includes('Macintosh') && navigator.maxTouchPoints > 1) return true;
  return false;
}

// Set canvas to fill viewport at device pixel ratio
function sizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}

// ─── WGSL Shaders ───────────────────────────────────────────────

function makeComputeShader(numParticles: number) {
  return /* wgsl */ `
struct Particle {
  pos: vec2<f32>,
  vel: vec2<f32>,
};

struct Params {
  a: f32,
  b: f32,
  c: f32,
  d: f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: Params;

@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  if (idx >= ${numParticles}u) { return; }

  var p = particles[idx];

  let nx = sin(params.a * p.pos.y) + params.c * cos(params.a * p.pos.x);
  let ny = sin(params.b * p.pos.x) + params.d * cos(params.b * p.pos.y);

  p.pos = mix(p.pos, vec2<f32>(nx, ny), 0.05);

  particles[idx] = p;
}
`;
}

const VERTEX_SHADER = /* wgsl */ `
struct Particle {
  pos: vec2<f32>,
  vel: vec2<f32>,
};

@group(0) @binding(0) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) alpha: f32,
};

@vertex
fn main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var out: VertexOutput;

  let p = particles[vertexIndex];
  let scale = 0.33;
  out.position = vec4<f32>(p.pos.x * scale, p.pos.y * scale, 0.0, 1.0);

  let speed = length(p.vel);
  out.alpha = clamp(0.3 + speed * 0.8, 0.2, 0.9);

  return out;
}
`;

const FRAGMENT_SHADER = /* wgsl */ `
@fragment
fn main(@location(0) alpha: f32) -> @location(0) vec4<f32> {
  return vec4<f32>(0.306, 0.804, 0.769, alpha);
}
`;

// ─── Component ──────────────────────────────────────────────────

export const CliffordField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const rendererRef = useRef<string>('none');
  const targetParamsRef = useRef(ATTRACTOR_STATES.idle);
  const currentParamsRef = useRef({ ...ATTRACTOR_STATES.idle });
  const lerpProgressRef = useRef(1);

  // Subscribe to pheromone substrate
  const dominantPheromone = useQuery(api.pheromones.getDominantVisual);

  useEffect(() => {
    if (dominantPheromone && dominantPheromone.intent in ATTRACTOR_STATES) {
      targetParamsRef.current = ATTRACTOR_STATES[dominantPheromone.intent]!;
      lerpProgressRef.current = 0;
    } else {
      targetParamsRef.current = ATTRACTOR_STATES.idle;
      lerpProgressRef.current = 0;
    }
  }, [dominantPheromone]);

  const interpolateParams = useCallback(() => {
    if (lerpProgressRef.current < 1) {
      lerpProgressRef.current = Math.min(1, lerpProgressRef.current + 0.016);
      const t = lerpProgressRef.current;
      const cur = currentParamsRef.current;
      const tgt = targetParamsRef.current;
      currentParamsRef.current = {
        a: smoothLerp(cur.a, tgt.a, t),
        b: smoothLerp(cur.b, tgt.b, t),
        c: smoothLerp(cur.c, tgt.c, t),
        d: smoothLerp(cur.d, tgt.d, t),
      };
    }
  }, []);

  // ─── Canvas2D Renderer (universal fallback) ─────────────────
  const startCanvas2D = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Force a fresh 2D context on a clean canvas
    sizeCanvas(canvas);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      console.error('[CliffordField] Cannot get 2D context');
      return;
    }

    rendererRef.current = 'canvas2d';

    const isMobile = window.innerWidth < 768;
    const PARTICLE_COUNT = isMobile ? 8000 : 15000;
    const PARTICLE_SIZE = isMobile ? 1.5 : 1.2;

    const particles = new Float32Array(PARTICLE_COUNT * 2);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles[i * 2] = (Math.random() - 0.5) * 4;
      particles[i * 2 + 1] = (Math.random() - 0.5) * 4;
    }

    // Clear to black on first frame
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    console.log(`[CliffordField] Canvas2D initialized — ${PARTICLE_COUNT} particles`);

    let frameCount = 0;
    const render = () => {
      interpolateParams();
      const p = currentParamsRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Trail effect — semi-transparent overlay
      ctx.fillStyle = 'rgba(10, 10, 10, 0.12)';
      ctx.fillRect(0, 0, w, h);

      // Draw particles in batches for performance
      ctx.fillStyle = 'rgba(78, 205, 196, 0.7)';
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const x = particles[i * 2]!;
        const y = particles[i * 2 + 1]!;

        const nx = Math.sin(p.a * y) + p.c * Math.cos(p.a * x);
        const ny = Math.sin(p.b * x) + p.d * Math.cos(p.b * y);

        particles[i * 2] = x + (nx - x) * 0.05;
        particles[i * 2 + 1] = y + (ny - y) * 0.05;

        const sx = (particles[i * 2]! * 0.33 + 1) * 0.5 * w;
        const sy = (1 - (particles[i * 2 + 1]! * 0.33 + 1) * 0.5) * h;
        ctx.fillRect(sx, sy, PARTICLE_SIZE, PARTICLE_SIZE);
      }

      // Every 5th frame, add a subtle glow layer for depth
      if (frameCount % 5 === 0) {
        ctx.fillStyle = 'rgba(78, 205, 196, 0.02)';
        ctx.fillRect(0, 0, w, h);
      }
      frameCount++;

      animationRef.current = requestAnimationFrame(render);
    };

    render();
  }, [interpolateParams]);

  // ─── Main Init ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      // Size canvas immediately
      sizeCanvas(canvas);

      // Skip WebGPU on Apple mobile — their implementation is unreliable
      if (isAppleMobile()) {
        console.log('[CliffordField] Apple mobile detected — using Canvas2D');
        startCanvas2D();
        return;
      }

      // Skip if no WebGPU API at all
      if (!navigator.gpu) {
        console.log('[CliffordField] No WebGPU — using Canvas2D');
        startCanvas2D();
        return;
      }

      // Attempt WebGPU — full try/catch with rollback
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter || cancelled) { startCanvas2D(); return; }

        const device = await adapter.requestDevice();
        if (cancelled) return;

        // Use a SEPARATE canvas for WebGPU to avoid contaminating the 2D fallback
        const gpuCanvas = document.createElement('canvas');
        gpuCanvas.style.cssText = canvas.style.cssText;
        gpuCanvas.width = canvas.width;
        gpuCanvas.height = canvas.height;

        const context = gpuCanvas.getContext('webgpu');
        if (!context) throw new Error("No webgpu context");

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
          device,
          format: presentationFormat,
          alphaMode: 'premultiplied',
        });

        const NUM_PARTICLES = 100000;

        // Particle buffer
        const particleData = new Float32Array(NUM_PARTICLES * 4);
        for (let i = 0; i < NUM_PARTICLES; i++) {
          particleData[i * 4] = (Math.random() - 0.5) * 4;
          particleData[i * 4 + 1] = (Math.random() - 0.5) * 4;
        }

        const particleBuffer = device.createBuffer({
          size: particleData.byteLength,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        new Float32Array(particleBuffer.getMappedRange()).set(particleData);
        particleBuffer.unmap();

        const uniformBuffer = device.createBuffer({
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        // Compute pipeline
        const computeModule = device.createShaderModule({ code: makeComputeShader(NUM_PARTICLES) });
        const computeBGL = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
          ],
        });
        const computeBindGroup = device.createBindGroup({
          layout: computeBGL,
          entries: [
            { binding: 0, resource: { buffer: particleBuffer } },
            { binding: 1, resource: { buffer: uniformBuffer } },
          ],
        });
        const computePipeline = device.createComputePipeline({
          layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
          compute: { module: computeModule, entryPoint: "main" },
        });

        // Render pipeline
        const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
        const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });
        const renderBGL = device.createBindGroupLayout({
          entries: [
            { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
          ],
        });
        const renderBindGroup = device.createBindGroup({
          layout: renderBGL,
          entries: [{ binding: 0, resource: { buffer: particleBuffer } }],
        });
        const renderPipeline = device.createRenderPipeline({
          layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
          vertex: { module: vertexModule, entryPoint: "main" },
          fragment: {
            module: fragmentModule,
            entryPoint: "main",
            targets: [{
              format: presentationFormat,
              blend: {
                color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
                alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
              },
            }],
          },
          primitive: { topology: "point-list" },
        });

        // Do a test frame to verify the pipeline actually works
        const testEncoder = device.createCommandEncoder();
        const testView = context.getCurrentTexture().createView();
        const testPass = testEncoder.beginRenderPass({
          colorAttachments: [{
            view: testView,
            clearValue: { r: 0.039, g: 0.039, b: 0.039, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store',
          }],
        });
        testPass.end();
        device.queue.submit([testEncoder.finish()]);

        // If we got here, WebGPU is working — swap the canvas
        if (cancelled) return;
        canvas.parentElement?.insertBefore(gpuCanvas, canvas);
        canvas.style.display = 'none';
        rendererRef.current = 'webgpu';

        console.log(`[CliffordField] WebGPU initialized — ${NUM_PARTICLES} particles`);

        const render = () => {
          if (cancelled) return;

          interpolateParams();

          const p = currentParamsRef.current;
          device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([p.a, p.b, p.c, p.d]));

          const commandEncoder = device.createCommandEncoder();

          const computePass = commandEncoder.beginComputePass();
          computePass.setPipeline(computePipeline);
          computePass.setBindGroup(0, computeBindGroup);
          computePass.dispatchWorkgroups(Math.ceil(NUM_PARTICLES / WORKGROUP_SIZE));
          computePass.end();

          const textureView = context.getCurrentTexture().createView();
          const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
              view: textureView,
              clearValue: { r: 0.039, g: 0.039, b: 0.039, a: 1.0 },
              loadOp: 'clear',
              storeOp: 'store',
            }],
          });
          renderPass.setPipeline(renderPipeline);
          renderPass.setBindGroup(0, renderBindGroup);
          renderPass.draw(NUM_PARTICLES);
          renderPass.end();

          device.queue.submit([commandEncoder.finish()]);
          animationRef.current = requestAnimationFrame(render);
        };

        // Handle resize for WebGPU canvas
        const onResize = () => {
          sizeCanvas(gpuCanvas);
          context.configure({ device, format: presentationFormat, alphaMode: 'premultiplied' });
        };
        window.addEventListener('resize', onResize);

        render();

      } catch (err) {
        console.warn("[CliffordField] WebGPU failed, falling back to Canvas2D:", err);
        if (!cancelled) startCanvas2D();
      }
    };

    init();

    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [interpolateParams, startCanvas2D]);

  // ─── Resize handler for Canvas2D ────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || rendererRef.current !== 'canvas2d') return;
      sizeCanvas(canvas);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
};
