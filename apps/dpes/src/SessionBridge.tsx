import React, { useEffect } from "react";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

export const SessionBridge: React.FC = () => {
  useEffect(() => {
    let isActive = true;

    const broadcastAuthState = async () => {
      try {
        // Try to get user email from various sources
        let userEmail: string | undefined;

        try {
          const { username } = await getCurrentUser();
          userEmail = username || undefined;
        } catch {
          // ignore
        }

        if (!userEmail) {
          try {
            const attrs = await fetchUserAttributes();
            userEmail = attrs?.email as string | undefined;
          } catch {
            // ignore
          }
        }

        if (!userEmail) {
          try {
            const session = await fetchAuthSession();
            userEmail = (session as any)?.tokens?.idToken?.payload?.email as string | undefined;
          } catch {
            // ignore
          }
        }

        if (isActive) {
          // Broadcast authentication state to other apps
          window.parent.postMessage({
            type: "auth.bridge.ready",
            authenticated: Boolean(userEmail),
            userEmail: userEmail
          }, "*");
        }
      } catch (error) {
        if (isActive) {
          window.parent.postMessage({
            type: "auth.bridge.ready",
            authenticated: false,
            userEmail: undefined
          }, "*");
        }
      }
    };

    // Initial broadcast
    broadcastAuthState();

    // Set up periodic checks for auth state changes
    const interval = setInterval(broadcastAuthState, 2000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  return null; // This component doesn't render anything
};
