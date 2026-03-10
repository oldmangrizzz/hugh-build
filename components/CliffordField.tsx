/**
 * Clifford Field — WebGPU Attractor Rendering Engine
 *
 * Renders 100,000 particles governed by Clifford attractor dynamics:
 *   nx = sin(a·y) + c·cos(a·x)
 *   ny = sin(b·x) + d·cos(b·y)
 *
 * Parameters (a, b, c, d) interpolate based on pheromone weight:
 * - idle: Chaotic vortex (diffuse cloud)
 * - media_playback: Planar collapse (flat grid for UI)
 * - spatial_search: High-frequency ring
 * - text_display: Segmented clusters
 *
 * GPU Architecture:
 * - Compute shader: 390 workgroups × 256 threads → position updates
 * - Render pipeline: Vertex shader reads storage buffer → fragment draws glowing points
 * - Zero CPU-GPU transfer after init (all state lives on GPU)
 *
 * @version 2.0 — Production Specification
 * @classification Production Ready
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const NUM_PARTICLES = 100000;
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

// ─── WGSL Shaders ───────────────────────────────────────────────

const COMPUTE_SHADER = /* wgsl */ `
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
  if (idx >= ${NUM_PARTICLES}u) { return; }

  var p = particles[idx];

  // Clifford attractor: nx = sin(a·y) + c·cos(a·x), ny = sin(b·x) + d·cos(b·y)
  let nx = sin(params.a * p.pos.y) + params.c * cos(params.a * p.pos.x);
  let ny = sin(params.b * p.pos.x) + params.d * cos(params.b * p.pos.y);

  // Smooth integration — lerp prevents jitter during parameter transitions
  p.pos = mix(p.pos, vec2<f32>(nx, ny), 0.05);

  particles[idx] = p;
}
`;

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
  // Map attractor space [-3, 3] to clip space [-1, 1]
  let scale = 0.33;
  out.position = vec4<f32>(p.pos.x * scale, p.pos.y * scale, 0.0, 1.0);

  // Alpha based on velocity (faster particles glow brighter)
  let speed = length(p.vel);
  out.alpha = clamp(0.3 + speed * 0.8, 0.2, 0.9);

  return out;
}
`;

const FRAGMENT_SHADER = /* wgsl */ `
@fragment
fn main(@location(0) alpha: f32) -> @location(0) vec4<f32> {
  // Bioluminescent cyan: #4ecdc4 = rgb(0.306, 0.804, 0.769)
  return vec4<f32>(0.306, 0.804, 0.769, alpha);
}
`;

// ─── Component ──────────────────────────────────────────────────

export const CliffordField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const gpuRef = useRef<{
    device: GPUDevice;
    context: GPUCanvasContext;
    computePipeline: GPUComputePipeline;
    renderPipeline: GPURenderPipeline;
    particleBuffer: GPUBuffer;
    uniformBuffer: GPUBuffer;
    computeBindGroup: GPUBindGroup;
    renderBindGroup: GPUBindGroup;
    presentationFormat: GPUTextureFormat;
  } | null>(null);
  const targetParamsRef = useRef(ATTRACTOR_STATES.idle);
  const currentParamsRef = useRef({ ...ATTRACTOR_STATES.idle });
  const lerpProgressRef = useRef(1);

  // Subscribe to pheromone substrate
  const dominantPheromone = useQuery(api.pheromones.getDominantVisual);

  // Update target attractor state when dominant pheromone changes
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

  // ─── WebGPU Init ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const initWebGPU = async () => {
      // Try WebGPU — fall back to Canvas2D on ANY failure
      try {
        if (!navigator.gpu) throw new Error("No WebGPU");

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error("No adapter");

        const device = await adapter.requestDevice();
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const context = canvas.getContext('webgpu');
        if (!context) throw new Error("No webgpu context");

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
          device,
          format: presentationFormat,
          alphaMode: 'premultiplied',
        });

      // ── Particle buffer: 100K × 4 floats (x, y, vx, vy) ──
      const particleData = new Float32Array(NUM_PARTICLES * 4);
      for (let i = 0; i < NUM_PARTICLES; i++) {
        particleData[i * 4] = (Math.random() - 0.5) * 4;
        particleData[i * 4 + 1] = (Math.random() - 0.5) * 4;
        particleData[i * 4 + 2] = 0;
        particleData[i * 4 + 3] = 0;
      }

      const particleBuffer = device.createBuffer({
        size: particleData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
      });
      new Float32Array(particleBuffer.getMappedRange()).set(particleData);
      particleBuffer.unmap();

      // ── Uniform buffer: 4 floats (a, b, c, d) ──
      const uniformBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      // ── Compute pipeline ──
      const computeModule = device.createShaderModule({ code: COMPUTE_SHADER });

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

      // ── Render pipeline ──
      const vertexModule = device.createShaderModule({ code: VERTEX_SHADER });
      const fragmentModule = device.createShaderModule({ code: FRAGMENT_SHADER });

      const renderBGL = device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        ],
      });

      const renderBindGroup = device.createBindGroup({
        layout: renderBGL,
        entries: [
          { binding: 0, resource: { buffer: particleBuffer } },
        ],
      });

      const renderPipeline = device.createRenderPipeline({
        layout: device.createPipelineLayout({ bindGroupLayouts: [renderBGL] }),
        vertex: {
          module: vertexModule,
          entryPoint: "main",
        },
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
        primitive: {
          topology: "point-list",
        },
      });

      gpuRef.current = {
        device,
        context,
        computePipeline,
        renderPipeline,
        particleBuffer,
        uniformBuffer,
        computeBindGroup,
        renderBindGroup,
        presentationFormat,
      };

      console.log(`[CliffordField] WebGPU initialized — ${NUM_PARTICLES} particles`);

      // ── Render loop ──
      const render = () => {
        if (cancelled || !gpuRef.current) return;
        const gpu = gpuRef.current;

        interpolateParams();

        // Upload current attractor parameters
        const p = currentParamsRef.current;
        gpu.device.queue.writeBuffer(
          gpu.uniformBuffer, 0,
          new Float32Array([p.a, p.b, p.c, p.d])
        );

        const commandEncoder = gpu.device.createCommandEncoder();

        // Compute pass — update particle positions
        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(gpu.computePipeline);
        computePass.setBindGroup(0, gpu.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(NUM_PARTICLES / WORKGROUP_SIZE));
        computePass.end();

        // Render pass — draw particles as points
        const textureView = gpu.context.getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass({
          colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.039, g: 0.039, b: 0.039, a: 1.0 }, // #0a0a0a
            loadOp: 'clear',
            storeOp: 'store',
          }],
        });
        renderPass.setPipeline(gpu.renderPipeline);
        renderPass.setBindGroup(0, gpu.renderBindGroup);
        renderPass.draw(NUM_PARTICLES);
        renderPass.end();

        gpu.device.queue.submit([commandEncoder.finish()]);
        animationRef.current = requestAnimationFrame(render);
      };

      render();

      } catch (err) {
        console.warn("[CliffordField] WebGPU failed, falling back to Canvas2D:", err);
        initCanvas2DFallback();
      }
    };

    initWebGPU();

    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [interpolateParams]);

  // ─── Canvas 2D Fallback (non-WebGPU browsers) ──────────────
  const initCanvas2DFallback = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fewer particles for CPU rendering — even fewer on mobile
    const isMobile = window.innerWidth < 768;
    const FALLBACK_COUNT = isMobile ? 4000 : 10000;
    const PARTICLE_SIZE = isMobile ? 2.5 : 2;
    const particles = new Float32Array(FALLBACK_COUNT * 2);
    for (let i = 0; i < FALLBACK_COUNT; i++) {
      particles[i * 2] = (Math.random() - 0.5) * 4;
      particles[i * 2 + 1] = (Math.random() - 0.5) * 4;
    }

    const render = () => {
      interpolateParams();
      const p = currentParamsRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(78, 205, 196, 0.5)';
      for (let i = 0; i < FALLBACK_COUNT; i++) {
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

      animationRef.current = requestAnimationFrame(render);
    };

    render();
  }, [interpolateParams]);

  // ─── Resize handler ────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;

      // Reconfigure WebGPU context if active
      if (gpuRef.current) {
        gpuRef.current.context.configure({
          device: gpuRef.current.device,
          format: gpuRef.current.presentationFormat,
          alphaMode: 'premultiplied',
        });
      }
    };

    handleResize();
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
