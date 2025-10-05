/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_URL: string
  readonly VITE_AUTH_COOKIE_DOMAIN: string
  readonly VITE_CHAINLIT_URL: string
  readonly VITE_API_BASE: string
  readonly VITE_API_BASE_DEV: string
  readonly VITE_API_LOGS_SUFFIX: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

