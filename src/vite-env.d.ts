/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public application title injected at build time (see `.env.example`). */
  readonly VITE_APP_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
