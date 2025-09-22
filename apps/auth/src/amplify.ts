import { Amplify } from "aws-amplify";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";

function setCookie(name: string, value: string, domain: string) {
  const secure = location.protocol === "https:";
  const base = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
  const hasDot = domain.includes(".");
  document.cookie = hasDot ? `${base}; Domain=${domain}` : base;
}

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string, domain: string) {
  const base = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
  const hasDot = domain.includes(".");
  document.cookie = hasDot ? `${base}; Domain=${domain}` : base;
}

const cookieDomain = (import.meta.env.VITE_AUTH_COOKIE_DOMAIN as string) || window.location.hostname;

cognitoUserPoolsTokenProvider.setKeyValueStorage({
  getItem: (key: string) => getCookie(key),
  setItem: (key: string, value: string) => setCookie(key, value, cookieDomain),
  removeItem: (key: string) => deleteCookie(key, cookieDomain),
});

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: { username: true, email: true, phone: false },
      oauth: {
        domain: (import.meta.env.VITE_COGNITO_DOMAIN_URL as string)?.replace(/^https?:\/\//, ""),
        redirectSignIn: window.location.origin,
        redirectSignOut: import.meta.env.VITE_LOGOUT_REDIRECT_URL || window.location.origin,
        responseType: "code",
        scopes: ["email", "openid", "profile"],
      },
    },
  },
});


