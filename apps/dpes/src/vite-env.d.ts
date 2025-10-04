/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_URL: string
  readonly VITE_AUTH_COOKIE_DOMAIN: string
  readonly VITE_CHAINLIT_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
