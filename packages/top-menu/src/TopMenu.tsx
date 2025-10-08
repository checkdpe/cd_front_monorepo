import React, { useState } from "react";
import { BurgerIcon } from "./BurgerIcon";
import { SettingsModal } from "./SettingsModal";
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
  backgroundColor?: string;
  borderColor?: string;
  showSettings?: boolean;
  onEnvironmentChange?: (useDev: boolean) => void;
  useDevEnvironment?: boolean;
}

export const TopMenu: React.FC<TopMenuProps> = ({ 
  logoSrc = logoDefault, 
  logoMobileSrc = logoMobileDefault, 
  onAuthClick, 
  authLabel = "login / sign-up", 
  authHref = "/auth", 
  isAuthenticated = false, 
  logoutHref, 
  onLogoutClick, 
  centeredTitle, 
  backgroundColor = "#ffffff", 
  borderColor = "#e5e7eb",
  showSettings = false,
  onEnvironmentChange,
  useDevEnvironment = false
}) => {
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const handleEnvironmentChange = (useDev: boolean) => {
    if (onEnvironmentChange) {
      onEnvironmentChange(useDev);
    }
  };

  // Dynamic background color based on environment
  const dynamicBackgroundColor = useDevEnvironment ? "#f59e0b" : backgroundColor; // Amber/orange color for dev
  const dynamicBorderColor = useDevEnvironment ? "#d97706" : borderColor; // Darker amber border for dev

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: dynamicBackgroundColor,
      borderBottom: `1px solid ${dynamicBorderColor}`,
      padding: "8px 16px"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", maxWidth: 1200, margin: "0 auto", columnGap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {showSettings && (
            <BurgerIcon
              isOpen={settingsModalVisible}
              onClick={() => setSettingsModalVisible(!settingsModalVisible)}
              color={useDevEnvironment ? "#ffffff" : "#374151"}
            />
          )}
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
              color: useDevEnvironment ? "#ffffff" : "#0b0c0f",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 600,
              margin: "0 auto"
            }}>{centeredTitle}</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {isAuthenticated ? (
          <>
            <span style={{
              fontSize: 14,
              color: useDevEnvironment ? "#ffffff" : "#111827",
              fontWeight: 500
            }}>
              {authLabel}
            </span>
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
                border: useDevEnvironment ? "1px solid #ffffff" : "1px solid #d1d5db",
                background: useDevEnvironment ? "transparent" : "#ffffff",
                color: useDevEnvironment ? "#ffffff" : "#111827",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer"
              }}
              title="Sign out"
            >
              Sign out
            </button>
          </>
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
              border: useDevEnvironment ? "1px solid #ffffff" : "1px solid #d1d5db",
              background: useDevEnvironment ? "transparent" : "#ffffff",
              color: useDevEnvironment ? "#ffffff" : "#111827",
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
      
      {showSettings && (
        <SettingsModal
          visible={settingsModalVisible}
          onClose={() => setSettingsModalVisible(false)}
          useDevEnvironment={useDevEnvironment}
          onEnvironmentChange={handleEnvironmentChange}
          devEnvironmentUrl={(import.meta as any).env.VITE_API_BASE_DEV || "Development"}
          prodEnvironmentUrl={(import.meta as any).env.VITE_API_BASE || "Production"}
        />
      )}
    </div>
  );
};


