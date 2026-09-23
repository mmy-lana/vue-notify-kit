/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public application title injected at build time (see `.env.example`). */
  readonly VITE_APP_TITLE?: string;
  /**
   * Overrides the repository link in the documentation header, so forks and
   * downstream templates point at their own remote (see `.env.example`).
   */
  readonly VITE_REPO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
