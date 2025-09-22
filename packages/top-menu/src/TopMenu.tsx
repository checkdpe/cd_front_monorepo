import React from "react";
const logoDefault = new URL("./assets/logo-checkdpe.png", import.meta.url).href;
const logoMobileDefault = new URL("./assets/logo-checkdpe-mobile.png", import.meta.url).href;

export interface TopMenuProps {
  logoSrc?: string;
  logoMobileSrc?: string;
  onAuthClick?: () => void;
  authLabel?: string;
  authHref?: string;
  isAuthenticated?: boolean;
  logoutHref?: string;
  onLogoutClick?: () => void;
  centeredTitle?: string;
}

export const TopMenu: React.FC<TopMenuProps> = ({ logoSrc = logoDefault, logoMobileSrc = logoMobileDefault, onAuthClick, authLabel = "login / sign-up", authHref = "/auth", isAuthenticated = false, logoutHref, onLogoutClick, centeredTitle }) => {
  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "#ffffff",
      borderBottom: "1px solid #e5e7eb",
      padding: "8px 16px"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", maxWidth: 1200, margin: "0 auto", columnGap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <picture>
            {logoMobileSrc && <source media="(max-width: 640px)" srcSet={logoMobileSrc} />}
            <img src={logoSrc} alt="logo" style={{ height: 28, width: "auto" }} />
          </picture>
        </div>
        <div style={{ textAlign: "center" }}>
          {centeredTitle && (
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#0b0c0f",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 600,
              margin: "0 auto"
            }}>{centeredTitle}</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {isAuthenticated ? (
          <button
            onClick={() => {
              if (onLogoutClick) {
                onLogoutClick();
                return;
              }
              if (logoutHref) {
                try {
                  const url = new URL(logoutHref, window.location.href);
                  window.location.href = url.toString();
                } catch {
                  window.location.href = logoutHref;
                }
                return;
              }
              // Fallback to auth page if logout link not provided
              try {
                const url = new URL(authHref, window.location.href);
                window.location.href = url.toString();
              } catch {
                window.location.href = authHref;
              }
            }}
            style={{
              appearance: "none",
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer"
            }}
            title="Sign out"
          >
            {authLabel}
          </button>
        ) : (
          <button
            onClick={() => {
              if (onAuthClick) {
                onAuthClick();
                return;
              }
              try {
                const url = new URL(authHref, window.location.href);
                url.searchParams.set("returnTo", window.location.href);
                window.location.href = url.toString();
              } catch {
                const sep = authHref.includes("?") ? "&" : "?";
                window.location.href = `${authHref}${sep}returnTo=${encodeURIComponent(window.location.href)}`;
              }
            }}
            style={{
              appearance: "none",
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer"
            }}
          >
            {authLabel}
          </button>
        )}
        </div>
      </div>
    </div>
  );
};


