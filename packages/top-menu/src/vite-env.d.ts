/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_API_BASE_DEV: string;
  readonly VITE_AUTH_URL: string;
  readonly VITE_COGNITO_DOMAIN_URL: string;
  readonly VITE_COGNITO_CLIENT_ID: string;
  readonly VITE_LOGOUT_REDIRECT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
