import React, { useState, useEffect } from "react";
import { TopMenu } from "@acme/top-menu";
import { DpeList } from "./components/DpeList";
import { SessionBridge } from "./SessionBridge";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

export const App: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [bridgeReady, setBridgeReady] = useState<boolean>(false);
  const [bridgeAuthenticated, setBridgeAuthenticated] = useState<boolean>(false);

  // Get the auth URL from environment variables
  const authUrl = import.meta.env.VITE_AUTH_URL || "/auth";

  // Authentication state management (similar to simul app)
  useEffect(() => {
    let isCancelled = false;

    // Listen for authentication events from other apps
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "auth.bridge.ready") {
        setBridgeReady(true);
        setBridgeAuthenticated(Boolean(event.data.authenticated));
        if (event.data.userEmail && !isCancelled) {
          setUserEmail(event.data.userEmail);
        }
      }
    };

    window.addEventListener("message", handleMessage);

    // Try to get authentication state directly
    (async () => {
      try {
        // Prefer Cognito username (often the email) if available
        const { username } = await getCurrentUser();
        if (username && !isCancelled) {
          setUserEmail(username || undefined);
          return;
        }
      } catch {
        // ignore and fallback to token claim below
      }

      // Try fetching user attributes (email) when available
      try {
        const attrs = await fetchUserAttributes();
        const emailAttr = attrs?.email as string | undefined;
        if (emailAttr && !isCancelled) {
          setUserEmail(emailAttr);
          return;
        }
      } catch {
        // ignore and fallback to token claim below
      }

      try {
        const session = await fetchAuthSession();
        const emailClaim = (session as any)?.tokens?.idToken?.payload?.email as string | undefined;
        if (!isCancelled) setUserEmail(emailClaim ?? undefined);
      } catch {
        if (!isCancelled) setUserEmail(undefined);
      }
    })();

    return () => {
      isCancelled = true;
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      <TopMenu 
        authHref={authUrl}
        authLabel={userEmail || "login / sign-up"}
        isAuthenticated={Boolean(userEmail)}
        logoutHref={(() => {
          const domain = (import.meta.env.VITE_COGNITO_DOMAIN_URL as string | undefined)?.replace(/^https?:\/\//, "");
          if (!domain) return undefined;
          const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
          const logoutRedirect = (import.meta.env.VITE_LOGOUT_REDIRECT_URL as string | undefined) || window.location.origin;
          if (!clientId) return undefined;
          return `https://${domain}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(logoutRedirect)}`;
        })()}
      />
      {/* Invisible iframe to pull session from auth origin when on different ports */}
      {!bridgeReady && (
        <iframe
          src={`${import.meta.env.VITE_AUTH_URL || "/auth"}?bridge=true`}
          style={{ position: "fixed", inset: 0, opacity: 0, pointerEvents: "none", zIndex: -1 }}
          title="Auth Bridge"
        />
      )}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0 }}>
        <SessionBridge />
      </div>
      <div style={{ padding: 24 }}>
        <h1>DPE List</h1>
        <DpeList />
      </div>
    </div>
  );
};
