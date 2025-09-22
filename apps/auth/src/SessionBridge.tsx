import React, { useEffect } from "react";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import "./amplify";

export const SessionBridge: React.FC = () => {
  useEffect(() => {
    (async () => {
      let isAuthenticated = false;
      let username: string | undefined;
      let email: string | undefined;
      let accessToken: string | undefined;
      try {
        const user = await getCurrentUser();
        username = user?.username || undefined;
      } catch {}
      try {
        const attrs = await fetchUserAttributes();
        email = (attrs as any)?.email as string | undefined;
      } catch {}
      try {
        const session = await fetchAuthSession();
        // If we have an access token, consider authenticated
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasToken = Boolean((session as any)?.tokens?.accessToken);
        isAuthenticated = hasToken;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          accessToken = (session as any)?.tokens?.accessToken?.toString?.();
        } catch {}
        // fallback email from id token claim
        if (!email) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          email = (session as any)?.tokens?.idToken?.payload?.email as string | undefined;
        }
      } catch {}

      // Cookie fallback when Amplify storage is not readable across origins
      try {
        if (!accessToken) {
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
                accessToken = val;
                isAuthenticated = true;
                break;
              }
            }
          }
        }
      } catch {}

      const payload = {
        type: "cognito-session-bridge",
        data: {
          isAuthenticated,
          username,
          email,
          accessToken,
          authOrigin: window.location.origin,
        },
      };
      try {
        // Send to parent regardless; parent must validate origin
        window.parent?.postMessage(payload, "*");
      } catch {}
    })();
  }, []);

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", fontSize: 14, padding: 8 }}>
      Ready
    </div>
  );
};


