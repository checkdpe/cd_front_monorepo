import { fetchAuthSession } from 'aws-amplify/auth';

// Token cache with expiration
let cachedToken: string | null = null;
let tokenCacheTime: number = 0;
const TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let bridgeToken: string | null = null;

// Helper function to set bridge token (can be called from outside)
export const setBridgeAccessToken = (token: string | null) => {
  bridgeToken = token;
};

// Helper function to get access token with Cognito refresh and caching
export const getAccessToken = async (): Promise<string | null> => {
  // Check if we have a valid cached token
  const now = Date.now();
  if (cachedToken && (now - tokenCacheTime) < TOKEN_CACHE_DURATION) {
    return cachedToken;
  }

  // Check bridge token first
  if (bridgeToken) {
    cachedToken = bridgeToken;
    tokenCacheTime = now;
    return bridgeToken;
  }

  // Try to get fresh token from Cognito
  try {
    const session = await fetchAuthSession({ forceRefresh: true } as any);
    const token = session?.tokens?.accessToken?.toString();
    if (token) {
      cachedToken = token;
      tokenCacheTime = now;
      return token;
    }
  } catch (error) {
    console.log('Failed to fetch from Cognito, falling back to cookies:', error);
    // Continue to cookie fallback
  }

  // Cookie fallback: parse Amplify cookies
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
          // Cache the token
          cachedToken = val;
          tokenCacheTime = now;
          return val;
        }
      }
    }
  } catch (error) {
    console.error('Error retrieving access token from cookies:', error);
  }
  
  return null;
};

// Helper function to wait for token with retry
export const waitForAccessToken = async (timeoutMs: number = 6000, intervalMs: number = 200): Promise<string | null> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const token = await getAccessToken();
    if (token) return token;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return null;
};

// Invalidate token cache (call this when getting 401 errors)
export const invalidateTokenCache = () => {
  cachedToken = null;
  tokenCacheTime = 0;
};

