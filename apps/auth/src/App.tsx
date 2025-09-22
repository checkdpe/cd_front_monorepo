import React, { useMemo } from "react";
import { Amplify } from "aws-amplify";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { Authenticator, View, useTheme, ThemeProvider, useAuthenticator } from "@aws-amplify/ui-react";
import { TopMenu } from "@acme/top-menu";

// Configure token storage to use cookies so multiple apps on the same domain/localhost ports share session
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

const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: {
        username: true,
        email: true,
        phone: false
      },
      oauth: {
        domain: import.meta.env.VITE_COGNITO_DOMAIN_URL?.replace(/^https?:\/\//, ""),
        redirectSignIn: window.location.origin,
        redirectSignOut: import.meta.env.VITE_LOGOUT_REDIRECT_URL || window.location.origin,
        responseType: "code",
        scopes: ["email", "openid", "profile"]
      }
    }
  }
} as const;

Amplify.configure(awsConfig);

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
                  window.location.href = import.meta.env.VITE_POST_LOGIN_URL || window.location.origin;
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


