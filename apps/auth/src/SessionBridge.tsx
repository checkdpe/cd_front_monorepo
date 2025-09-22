import React, { useEffect } from "react";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import "./amplify";

export const SessionBridge: React.FC = () => {
  useEffect(() => {
    (async () => {
      let isAuthenticated = false;
      let username: string | undefined;
      let email: string | undefined;
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
        // fallback email from id token claim
        if (!email) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          email = (session as any)?.tokens?.idToken?.payload?.email as string | undefined;
        }
      } catch {}

      const payload = {
        type: "cognito-session-bridge",
        data: {
          isAuthenticated,
          username,
          email,
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


