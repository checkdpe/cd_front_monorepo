import { fetchAuthSession } from "aws-amplify/auth";

let bridgeToken: string | null = null;
export function setBridgeAccessToken(token: string | null) {
  bridgeToken = token;
}

export async function getAccessToken(): Promise<string | null> {
  if (bridgeToken) {
    return bridgeToken;
  }
  
  try {
    const session = await fetchAuthSession({ forceRefresh: true } as any);
    const token = session?.tokens?.accessToken?.toString();
    if (token) {
      return token;
    }
  } catch (error) {
    // ignore and try cookie fallback below
  }

  // Cookie fallback: parse Amplify cookies regardless of clientId
  try {
    const all = document.cookie.split("; ").filter(Boolean);
    const prefix = "CognitoIdentityServiceProvider.";
    for (const part of all) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      const key = part.substring(0, eq);
      if (!key.startsWith(prefix) || !key.endsWith(".LastAuthUser")) continue;
      const clientId = key.slice(prefix.length, -".LastAuthUser".length);
      const username = decodeURIComponent(part.substring(eq + 1));
      
      if (!clientId || !username) continue;
      const accessKey = `${prefix}${clientId}.${username}.accessToken`;
      const match = document.cookie.match(new RegExp(`(?:^|; )${accessKey.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1")}=([^;]*)`));
      if (match && match[1]) {
        const val = decodeURIComponent(match[1]);
        if (val) {
          return val;
        }
      }
    }
  } catch (error) {
    // ignore
  }
  
  return null;
}

export async function authorizedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export async function waitForAccessToken(timeoutMs = 6000, intervalMs = 200): Promise<string | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const token = await getAccessToken();
    if (token) return token;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return null;
}
