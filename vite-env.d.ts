/// <reference types="vite/client" />
/// <reference types="@webgpu/types" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
  readonly VITE_LFM_API_KEY: string;
  readonly VITE_LFM_AUDIO_ENDPOINT: string;
  readonly VITE_LFM_THINKING_ENDPOINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
