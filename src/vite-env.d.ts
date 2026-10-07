/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** Chrome/Edge Extension ID (AMnote GDT Connector) — Load unpacked rồi copy ID. */
  readonly VITE_GDT_EXTENSION_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
