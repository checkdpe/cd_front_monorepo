import React, { useMemo } from "react";
import { Authenticator, View, useTheme, ThemeProvider, useAuthenticator } from "@aws-amplify/ui-react";
import { TopMenu } from "@acme/top-menu";
import { SessionBridge } from "./SessionBridge";
import "./amplify";

function getReturnToFromQuery(): string | null {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get("returnTo");
  } catch {
    return null;
  }
}

const AppInner: React.FC = () => {
  const { tokens } = useTheme();
  const { user } = useAuthenticator((context) => [context.user]);
  // Persist returnTo from query in session storage so it survives the OAuth dance
  const returnToQuery = getReturnToFromQuery();
  if (returnToQuery) {
    sessionStorage.setItem("auth.returnTo", returnToQuery);
  }
  return (
    <View
      padding={tokens.space.medium}
      height="100vh"
      backgroundColor={tokens.colors.background.primary}
      color={tokens.colors.font.primary}
    >
      <TopMenu authHref={import.meta.env.VITE_AUTH_URL || "/auth"} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0 }}>
        <SessionBridge />
      </div>
      <div style={{ maxWidth: 480, margin: "24px auto 0" }}>
      <Authenticator>
        {({ signOut, user }) => (
          <div style={{ display: "grid", placeItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <h1>Welcome{user?.signInDetails?.loginId ? `, ${user.signInDetails.loginId}` : ""}</h1>
              <p>You are signed in via AWS Cognito.</p>
              <button
                onClick={() => {
                  const returnTo = sessionStorage.getItem("auth.returnTo");
                  if (returnTo) {
                    sessionStorage.removeItem("auth.returnTo");
                    window.location.href = returnTo;
                    return;
                  }
                  window.location.href = (import.meta.env.VITE_POST_LOGIN_URL as string | undefined) ||
                    (window.location.origin.replace(/\/$/, "") + "/simul/index.html");
                }}
              >
                Continue
              </button>
              <div style={{ height: 8 }} />
              <button onClick={signOut}>Sign out</button>
            </div>
          </div>
        )}
      </Authenticator>
      </div>
    </View>
  );
};

export const App: React.FC = () => {
  const theme = useMemo(() => ({}), []);
  return (
    <ThemeProvider theme={theme} colorMode="light">
      <Authenticator.Provider>
        <AppInner />
      </Authenticator.Provider>
    </ThemeProvider>
  );
};


