/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_URL: string
  readonly VITE_AUTH_COOKIE_DOMAIN: string
  readonly VITE_CHAINLIT_URL: string
  readonly VITE_API_BASE: string
  readonly VITE_API_BASE_DEV: string
  readonly VITE_API_LOGS_SUFFIX: string
  readonly VITE_COGNITO_USER_POOL_ID: string
  readonly VITE_COGNITO_CLIENT_ID: string
  readonly VITE_COGNITO_DOMAIN_URL: string
  readonly VITE_LOGOUT_REDIRECT_URL: string
  readonly VITE_RETRIES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

