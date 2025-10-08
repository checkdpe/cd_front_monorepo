# Top menu component settings functionality
_Exported on 05/10/2025 at 7:55:55 CEST from Cursor (1.7.33)_

---

**User**

top menu component has a burger icon next to the app logo
it allows showing a modal settings : in which i have a switch allowing using one or the other env  (VITE_API_BASE_DEV default VS VITE_API_BASE) @.dev.env  

---

**Cursor**

I'll help you implement a top menu component with a burger icon that shows a modal with environment switching functionality. Let me first explore the current codebase to understand the structure and then implement the required features.


Now let me read the current TopMenu component to understand its structure:


Now let me check how the TopMenu is currently used in the dpes app:


Now let me start implementing the burger menu with environment switching. I'll need to:

1. Update the TopMenu component to include a burger icon
2. Create a settings modal component
3. Add environment switching logic


Let me first create a burger icon component and then update the TopMenu to include it:


```typescriptreact
import React from "react";

export interface BurgerIconProps {
  isOpen?: boolean;
  onClick?: () => void;
  size?: number;
  color?: string;
}

export const BurgerIcon: React.FC<BurgerIconProps> = ({
  isOpen = false,
  onClick,
  size = 24,
  color = "#374151"
}) => {
  return (
    <button
      onClick={onClick}
      style={{
        appearance: "none",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "4px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-around",
        alignItems: "center",
        width: size,
        height: size,
        transition: "all 0.3s ease"
      }}
      title="Settings"
    >
      <span
        style={{
          display: "block",
          width: "100%",
          height: "2px",
          backgroundColor: color,
          transition: "all 0.3s ease",
          transform: isOpen ? "rotate(45deg) translate(5px, 5px)" : "none"
        }}
      />
      <span
        style={{
          display: "block",
          width: "100%",
          height: "2px",
          backgroundColor: color,
          transition: "all 0.3s ease",
          opacity: isOpen ? 0 : 1
        }}
      />
      <span
        style={{
          display: "block",
          width: "100%",
          height: "2px",
          backgroundColor: color,
          transition: "all 0.3s ease",
          transform: isOpen ? "rotate(-45deg) translate(7px, -6px)" : "none"
        }}
      />
    </button>
  );
};
```

Now let me create a settings modal component:


```typescriptreact
import React from "react";

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  useDevEnvironment: boolean;
  onEnvironmentChange: (useDev: boolean) => void;
  devEnvironmentUrl?: string;
  prodEnvironmentUrl?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  useDevEnvironment,
  onEnvironmentChange,
  devEnvironmentUrl = "Development",
  prodEnvironmentUrl = "Production"
}) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827"
            }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              appearance: "none",
              border: "none",
              background: "transparent",
              fontSize: "20px",
              cursor: "pointer",
              color: "#6b7280",
              padding: "4px",
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px"
            }}
          >
            API Environment
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              backgroundColor: "#f9fafb"
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827",
                  marginBottom: "2px"
                }}
              >
                {useDevEnvironment ? devEnvironmentUrl : prodEnvironmentUrl}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280"
                }}
              >
                {useDevEnvironment 
                  ? "Development API endpoint" 
                  : "Production API endpoint"
                }
              </div>
            </div>
            <label
              style={{
                position: "relative",
                display: "inline-block",
                width: "44px",
                height: "24px"
              }}
            >
              <input
                type="checkbox"
                checked={useDevEnvironment}
                onChange={(e) => onEnvironmentChange(e.target.checked)}
                style={{
                  opacity: 0,
                  width: 0,
                  height: 0
                }}
              />
              <span
                style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: useDevEnvironment ? "#3b82f6" : "#d1d5db",
                  transition: "0.3s",
                  borderRadius: "24px"
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    content: '""',
                    height: "18px",
                    width: "18px",
                    left: useDevEnvironment ? "22px" : "3px",
                    bottom: "3px",
                    backgroundColor: "white",
                    transition: "0.3s",
                    borderRadius: "50%",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)"
                  }}
                />
              </span>
            </label>
          </div>
        </div>

        <div
          style={{
            padding: "12px",
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#92400e"
          }}
        >
          ⚠️ Changing the environment will require a page refresh to take effect.
        </div>
      </div>
    </div>
  );
};
```

Now let me update the TopMenu component to include the burger icon and settings modal:


```typescriptreact
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
}

export const TopMenu: React.FC<TopMenuProps> = ({ logoSrc = logoDefault, logoMobileSrc = logoMobileDefault, onAuthClick, authLabel = "login / sign-up", authHref = "/auth", isAuthenticated = false, logoutHref, onLogoutClick, centeredTitle, backgroundColor = "#ffffff", borderColor = "#e5e7eb" }) => {
  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: backgroundColor,
      borderBottom: `1px solid ${borderColor}`,
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
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {isAuthenticated ? (
          <>
            <span style={{
              fontSize: 14,
              color: "#111827",
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



```

```typescriptreact
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

export const TopMenu: React.FC<TopMenuProps> = ({ logoSrc = logoDefault, logoMobileSrc = logoMobileDefault, onAuthClick, authLabel = "login / sign-up", authHref = "/auth", isAuthenticated = false, logoutHref, onLogoutClick, centeredTitle, backgroundColor = "#ffffff", borderColor = "#e5e7eb" }) => {
  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: backgroundColor,
      borderBottom: `1px solid ${borderColor}`,
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
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {isAuthenticated ? (
          <>
            <span style={{
              fontSize: 14,
              color: "#111827",
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



```

```typescriptreact
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

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: backgroundColor,
      borderBottom: `1px solid ${borderColor}`,
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
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {isAuthenticated ? (
          <>
            <span style={{
              fontSize: 14,
              color: "#111827",
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



```

Now let me update the logo section to include the burger icon:


```typescriptreact
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

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: backgroundColor,
      borderBottom: `1px solid ${borderColor}`,
      padding: "8px 16px"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", maxWidth: 1200, margin: "0 auto", columnGap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <picture>
            {logoMobileSrc && <source media="(max-width: 640px)" srcSet={logoMobileSrc} />}
            <img src={logoSrc} alt="logo" style={{ height: 28, width: "auto" }} />
          </picture>
          {showSettings && (
            <BurgerIcon
              isOpen={settingsModalVisible}
              onClick={() => setSettingsModalVisible(!settingsModalVisible)}
            />
          )}
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
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {isAuthenticated ? (
          <>
            <span style={{
              fontSize: 14,
              color: "#111827",
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



```

Now let me add the SettingsModal at the end of the component:


```typescriptreact
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

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: backgroundColor,
      borderBottom: `1px solid ${borderColor}`,
      padding: "8px 16px"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", maxWidth: 1200, margin: "0 auto", columnGap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <picture>
            {logoMobileSrc && <source media="(max-width: 640px)" srcSet={logoMobileSrc} />}
            <img src={logoSrc} alt="logo" style={{ height: 28, width: "auto" }} />
          </picture>
          {showSettings && (
            <BurgerIcon
              isOpen={settingsModalVisible}
              onClick={() => setSettingsModalVisible(!settingsModalVisible)}
            />
          )}
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
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {isAuthenticated ? (
          <>
            <span style={{
              fontSize: 14,
              color: "#111827",
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
      
      {showSettings && (
        <SettingsModal
          visible={settingsModalVisible}
          onClose={() => setSettingsModalVisible(false)}
          useDevEnvironment={useDevEnvironment}
          onEnvironmentChange={handleEnvironmentChange}
          devEnvironmentUrl={import.meta.env.VITE_API_BASE_DEV || "Development"}
          prodEnvironmentUrl={import.meta.env.VITE_API_BASE || "Production"}
        />
      )}
    </div>
  );
};



```

Now I need to export the new components from the package index:


```typescript
export * from "./TopMenu";
export * from "./BurgerIcon";
export * from "./SettingsModal";



```

Now let me implement the environment switching logic. I need to create a context or hook to manage the environment state and update the API calls accordingly:


```typescriptreact
import React, { createContext, useContext, useState, useEffect } from "react";

interface EnvironmentContextType {
  useDevEnvironment: boolean;
  setUseDevEnvironment: (useDev: boolean) => void;
  getApiBaseUrl: () => string;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

const ENVIRONMENT_STORAGE_KEY = "top-menu-environment-preference";

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [useDevEnvironment, setUseDevEnvironmentState] = useState<boolean>(() => {
    // Default to dev environment as specified in requirements
    const stored = localStorage.getItem(ENVIRONMENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : true;
  });

  const setUseDevEnvironment = (useDev: boolean) => {
    setUseDevEnvironmentState(useDev);
    localStorage.setItem(ENVIRONMENT_STORAGE_KEY, JSON.stringify(useDev));
    
    // Show warning that page refresh is needed
    if (window.confirm("Environment changed. Page will refresh to apply the new settings.")) {
      window.location.reload();
    }
  };

  const getApiBaseUrl = () => {
    if (useDevEnvironment) {
      return import.meta.env.VITE_API_BASE_DEV || "https://api-dev.etiquettedpe.fr";
    } else {
      return import.meta.env.VITE_API_BASE || "https://api-stg.etiquettedpe.fr";
    }
  };

  return (
    <EnvironmentContext.Provider value={{
      useDevEnvironment,
      setUseDevEnvironment,
      getApiBaseUrl
    }}>
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = (): EnvironmentContextType => {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error("useEnvironment must be used within an EnvironmentProvider");
  }
  return context;
};
```

Now let me update the exports to include the environment context:


```typescript
export * from "./TopMenu";
export * from "./BurgerIcon";
export * from "./SettingsModal";
export * from "./EnvironmentContext";



```

Now let me update the dpes app to use the new environment switching functionality:


```typescriptreact
import React, { useState, useEffect } from "react";
import { TopMenu, EnvironmentProvider, useEnvironment } from "@acme/top-menu";
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

```

Now I need to create a component that uses the environment context and wrap the app with the provider:


```typescriptreact
import React, { useState, useEffect } from "react";
import { TopMenu, EnvironmentProvider, useEnvironment } from "@acme/top-menu";
import { DpeList } from "./components/DpeList";
import { SessionBridge } from "./SessionBridge";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

const AppContent: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [bridgeReady, setBridgeReady] = useState<boolean>(false);
  const [bridgeAuthenticated, setBridgeAuthenticated] = useState<boolean>(false);
  const { useDevEnvironment, setUseDevEnvironment } = useEnvironment();

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

```

Now let me update the TopMenu usage to include the settings functionality:


```typescriptreact
import React, { useState, useEffect } from "react";
import { TopMenu, EnvironmentProvider, useEnvironment } from "@acme/top-menu";
import { DpeList } from "./components/DpeList";
import { SessionBridge } from "./SessionBridge";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

const AppContent: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [bridgeReady, setBridgeReady] = useState<boolean>(false);
  const [bridgeAuthenticated, setBridgeAuthenticated] = useState<boolean>(false);
  const { useDevEnvironment, setUseDevEnvironment } = useEnvironment();

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
        showSettings={true}
        useDevEnvironment={useDevEnvironment}
        onEnvironmentChange={setUseDevEnvironment}
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

```

Now I need to add the main App component that wraps everything with the EnvironmentProvider:


```typescriptreact
import React, { useState, useEffect } from "react";
import { TopMenu, EnvironmentProvider, useEnvironment } from "@acme/top-menu";
import { DpeList } from "./components/DpeList";
import { SessionBridge } from "./SessionBridge";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";

const AppContent: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [bridgeReady, setBridgeReady] = useState<boolean>(false);
  const [bridgeAuthenticated, setBridgeAuthenticated] = useState<boolean>(false);
  const { useDevEnvironment, setUseDevEnvironment } = useEnvironment();

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
        showSettings={true}
        useDevEnvironment={useDevEnvironment}
        onEnvironmentChange={setUseDevEnvironment}
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

export const App: React.FC = () => {
  return (
    <EnvironmentProvider>
      <AppContent />
    </EnvironmentProvider>
  );
};

```

Now I need to update the API service to use the environment context. Let me check the current dpeApi.ts file:


I need to update the API service to use a dynamic function that can get the current environment. Let me create a function that can be called to get the current API base URL:


```typescript
import { DpeListResponse, DpeListParams } from '../types/dpe';
import { authorizedFetch } from '../auth';

// Function to get current API base URL based on environment preference
export const getApiBaseUrl = (): string => {
  const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
  if (useDevEnvironment) {
    return import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
  } else {
    return import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr';
  }
};

export interface LogItem {
  id?: string;
  timestamp?: string;
  level?: string;
  message?: string;
  ref_ademe?: string;
  [key: string]: any;
}

export interface LogsResponse {
  logs: LogItem[];
  total?: number;
  [key: string]: any;
}

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr'}/backoffice`;

export const fetchDpeList = async (params: DpeListParams = {}): Promise<DpeListResponse> => {
  const searchParams = new URLSearchParams();
  
  // Set default parameters
  const defaultParams = {
    q: 'all',
    from: 'control',
    start: 0,
    limit: 20,
    s: '',
    sort_col: 'last_modified',
    sort_order: 'desc',
    version: '1.0',
    ...params
  };

  Object.entries(defaultParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const url = `${API_BASE_URL}/dpe_list?${searchParams.toString()}`;
  
  const response = await authorizedFetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,la;q=0.6',
      'cache-control': 'no-cache',
      'origin': window.location.origin,
      'pragma': 'no-cache',
      'referer': window.location.origin + '/',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': navigator.userAgent,
      'x-authorization': 'dperdition'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

export const fetchLogs = async (refAdeme: string): Promise<LogsResponse> => {
  const apiBaseDev = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
  const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
  
  const url = `${apiBaseDev}/${apiLogsSuffix}`;
  
  const searchParams = new URLSearchParams();
  searchParams.append('ref_ademe', refAdeme);
  
  const fullUrl = `${url}?${searchParams.toString()}`;
  
  const response = await authorizedFetch(fullUrl, {
    method: 'GET',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,la;q=0.6',
      'cache-control': 'no-cache',
      'origin': window.location.origin,
      'pragma': 'no-cache',
      'referer': window.location.origin + '/',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': navigator.userAgent,
      'x-authorization': 'dperdition'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

```

```typescript
import { DpeListResponse, DpeListParams } from '../types/dpe';
import { authorizedFetch } from '../auth';

// Function to get current API base URL based on environment preference
export const getApiBaseUrl = (): string => {
  const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
  if (useDevEnvironment) {
    return import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
  } else {
    return import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr';
  }
};

export interface LogItem {
  id?: string;
  timestamp?: string;
  level?: string;
  message?: string;
  ref_ademe?: string;
  [key: string]: any;
}

export interface LogsResponse {
  logs: LogItem[];
  total?: number;
  [key: string]: any;
}

export const fetchDpeList = async (params: DpeListParams = {}): Promise<DpeListResponse> => {
  const API_BASE_URL = `${getApiBaseUrl()}/backoffice`;
  const searchParams = new URLSearchParams();
  
  // Set default parameters
  const defaultParams = {
    q: 'all',
    from: 'control',
    start: 0,
    limit: 20,
    s: '',
    sort_col: 'last_modified',
    sort_order: 'desc',
    version: '1.0',
    ...params
  };

  Object.entries(defaultParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const url = `${API_BASE_URL}/dpe_list?${searchParams.toString()}`;
  
  const response = await authorizedFetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,la;q=0.6',
      'cache-control': 'no-cache',
      'origin': window.location.origin,
      'pragma': 'no-cache',
      'referer': window.location.origin + '/',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': navigator.userAgent,
      'x-authorization': 'dperdition'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

export const fetchLogs = async (refAdeme: string): Promise<LogsResponse> => {
  const apiBaseDev = import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
  const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
  
  const url = `${apiBaseDev}/${apiLogsSuffix}`;
  
  const searchParams = new URLSearchParams();
  searchParams.append('ref_ademe', refAdeme);
  
  const fullUrl = `${url}?${searchParams.toString()}`;
  
  const response = await authorizedFetch(fullUrl, {
    method: 'GET',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,la;q=0.6',
      'cache-control': 'no-cache',
      'origin': window.location.origin,
      'pragma': 'no-cache',
      'referer': window.location.origin + '/',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': navigator.userAgent,
      'x-authorization': 'dperdition'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

```

```typescript
import { DpeListResponse, DpeListParams } from '../types/dpe';
import { authorizedFetch } from '../auth';

// Function to get current API base URL based on environment preference
export const getApiBaseUrl = (): string => {
  const useDevEnvironment = JSON.parse(localStorage.getItem("top-menu-environment-preference") || "true");
  if (useDevEnvironment) {
    return import.meta.env.VITE_API_BASE_DEV || 'https://api-dev.etiquettedpe.fr';
  } else {
    return import.meta.env.VITE_API_BASE || 'https://api-stg.etiquettedpe.fr';
  }
};

export interface LogItem {
  id?: string;
  timestamp?: string;
  level?: string;
  message?: string;
  ref_ademe?: string;
  [key: string]: any;
}

export interface LogsResponse {
  logs: LogItem[];
  total?: number;
  [key: string]: any;
}

export const fetchDpeList = async (params: DpeListParams = {}): Promise<DpeListResponse> => {
  const API_BASE_URL = `${getApiBaseUrl()}/backoffice`;
  const searchParams = new URLSearchParams();
  
  // Set default parameters
  const defaultParams = {
    q: 'all',
    from: 'control',
    start: 0,
    limit: 20,
    s: '',
    sort_col: 'last_modified',
    sort_order: 'desc',
    version: '1.0',
    ...params
  };

  Object.entries(defaultParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const url = `${API_BASE_URL}/dpe_list?${searchParams.toString()}`;
  
  const response = await authorizedFetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,la;q=0.6',
      'cache-control': 'no-cache',
      'origin': window.location.origin,
      'pragma': 'no-cache',
      'referer': window.location.origin + '/',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': navigator.userAgent,
      'x-authorization': 'dperdition'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

export const fetchLogs = async (refAdeme: string): Promise<LogsResponse> => {
  const apiBaseUrl = getApiBaseUrl();
  const apiLogsSuffix = import.meta.env.VITE_API_LOGS_SUFFIX || 'backoffice/get_redis_all_logs';
  
  const url = `${apiBaseUrl}/${apiLogsSuffix}`;
  
  const searchParams = new URLSearchParams();
  searchParams.append('ref_ademe', refAdeme);
  
  const fullUrl = `${url}?${searchParams.toString()}`;
  
  const response = await authorizedFetch(fullUrl, {
    method: 'GET',
    headers: {
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,la;q=0.6',
      'cache-control': 'no-cache',
      'origin': window.location.origin,
      'pragma': 'no-cache',
      'referer': window.location.origin + '/',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      'user-agent': navigator.userAgent,
      'x-authorization': 'dperdition'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

```

Now let me check for any linting errors in the files I've created and updated:


I need to fix the TypeScript errors related to import.meta.env. Let me check if there's a vite-env.d.ts file in the top-menu package:


Let me create the vite-env.d.ts file for the top-menu package:


```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_API_BASE_DEV: string;
  readonly VITE_AUTH_URL: string;
  readonly VITE_COGNITO_DOMAIN_URL: string;
  readonly VITE_COGNITO_CLIENT_ID: string;
  readonly VITE_LOGOUT_REDIRECT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Now let me check the lints again:


The TypeScript error is still there. Let me check if the vite-env.d.ts file is being properly recognized. Let me try a different approach by using a type assertion:


```typescriptreact
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

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: backgroundColor,
      borderBottom: `1px solid ${borderColor}`,
      padding: "8px 16px"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", maxWidth: 1200, margin: "0 auto", columnGap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <picture>
            {logoMobileSrc && <source media="(max-width: 640px)" srcSet={logoMobileSrc} />}
            <img src={logoSrc} alt="logo" style={{ height: 28, width: "auto" }} />
          </picture>
          {showSettings && (
            <BurgerIcon
              isOpen={settingsModalVisible}
              onClick={() => setSettingsModalVisible(!settingsModalVisible)}
            />
          )}
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
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {isAuthenticated ? (
          <>
            <span style={{
              fontSize: 14,
              color: "#111827",
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



```

Let me also fix the EnvironmentContext.tsx file:


```typescriptreact
import React, { createContext, useContext, useState, useEffect } from "react";

interface EnvironmentContextType {
  useDevEnvironment: boolean;
  setUseDevEnvironment: (useDev: boolean) => void;
  getApiBaseUrl: () => string;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

const ENVIRONMENT_STORAGE_KEY = "top-menu-environment-preference";

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [useDevEnvironment, setUseDevEnvironmentState] = useState<boolean>(() => {
    // Default to dev environment as specified in requirements
    const stored = localStorage.getItem(ENVIRONMENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : true;
  });

  const setUseDevEnvironment = (useDev: boolean) => {
    setUseDevEnvironmentState(useDev);
    localStorage.setItem(ENVIRONMENT_STORAGE_KEY, JSON.stringify(useDev));
    
    // Show warning that page refresh is needed
    if (window.confirm("Environment changed. Page will refresh to apply the new settings.")) {
      window.location.reload();
    }
  };

  const getApiBaseUrl = () => {
    if (useDevEnvironment) {
      return (import.meta as any).env.VITE_API_BASE_DEV || "https://api-dev.etiquettedpe.fr";
    } else {
      return (import.meta as any).env.VITE_API_BASE || "https://api-stg.etiquettedpe.fr";
    }
  };

  return (
    <EnvironmentContext.Provider value={{
      useDevEnvironment,
      setUseDevEnvironment,
      getApiBaseUrl
    }}>
      {children}
    </EnvironmentContext.Provider>
  );
};

export const useEnvironment = (): EnvironmentContextType => {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error("useEnvironment must be used within an EnvironmentProvider");
  }
  return context;
};

```

Let me check the lints again:


Great! Now let me mark the environment switching logic as completed and test the implementation:


Perfect! Let me also check if there are any linting errors in the dpes app:


Excellent! Now let me create a summary of what I've implemented:

## ✅ Implementation Complete

I have successfully implemented a top menu component with a burger icon that shows a modal settings panel allowing users to switch between development and production API environments. Here's what was created:

### 🔧 Components Created

1. **BurgerIcon Component** (`/packages/top-menu/src/BurgerIcon.tsx`)
   - Animated hamburger menu icon that transforms into an X when opened
   - Customizable size and color
   - Smooth transitions for opening/closing states

2. **SettingsModal Component** (`/packages/top-menu/src/SettingsModal.tsx`)
   - Clean, modern modal design with backdrop
   - Toggle switch for environment selection
   - Warning message about page refresh requirement
   - Responsive design with proper accessibility

3. **EnvironmentContext** (`/packages/top-menu/src/EnvironmentContext.tsx`)
   - React context for managing environment state globally
   - Persistent storage using localStorage
   - Automatic page refresh when environment changes
   - Defaults to development environment as requested

### 🔄 Updated Components

1. **TopMenu Component** (`/packages/top-menu/src/TopMenu.tsx`)
   - Added burger icon next to the app logo
   - Integrated settings modal functionality
   - New props: `showSettings`, `useDevEnvironment`, `onEnvironmentChange`
   - Maintains backward compatibility with existing usage

2. **DPE App** (`/apps/dpes/src/App.tsx`)
   - Wrapped with EnvironmentProvider
   - Connected to environment switching functionality
   - Shows settings menu with burger icon

3. **API Service** (`/apps/dpes/src/services/dpeApi.ts`)
   - Dynamic API base URL selection based on environment preference
   - Updated both `fetchDpeList` and `fetchLogs` functions
   - Reads environment preference from localStorage

### 🎯 Key Features

- **Burger Icon**: Animated hamburger menu icon next to the logo
- **Environment Switch**: Toggle between `VITE_API_BASE_DEV` (default) and `VITE_API_BASE`
- **Persistent Settings**: Environment preference saved in localStorage
- **Auto-refresh**: Page automatically refreshes when environment changes
- **Visual Feedback**: Clear indication of current environment in the modal
- **Warning Message**: Users are informed that a page refresh is required

### 🔧 Environment Variables Used

- `VITE_API_BASE_DEV`: Development API endpoint (default selection)
- `VITE_API_BASE`: Production API endpoint

The implementation is now ready and the burger menu with environment switching functionality is fully integrated into the top menu component!

---

**User**

cool; menu to be set on the left of the icon
if the env is set to VITE_API_BASE_DEV
then the top menu is turned with yellow/orange/ocre background

---

**Cursor**

I'll update the implementation to move the burger menu to the left of the logo and add a yellow/orange/ocre background when the development environment is selected.


```typescriptreact
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

  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: backgroundColor,
      borderBottom: `1px solid ${borderColor}`,
      padding: "8px 16px"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", maxWidth: 1200, margin: "0 auto", columnGap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {showSettings && (
            <BurgerIcon
              isOpen={settingsModalVisible}
              onClick={() => setSettingsModalVisible(!settingsModalVisible)}
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
              color: "#0b0c0f",
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
              color: "#111827",
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



```

Now let me update the background color logic to use a yellow/orange/ocre color when the development environment is selected:


```typescriptreact
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
              color: "#0b0c0f",
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
              color: "#111827",
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



```

I should also update the text colors to ensure good contrast against the amber background. Let me update the centered title and auth button colors:


```typescriptreact
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
              color: "#111827",
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



```

Now let me update the auth button colors to ensure good contrast:


```typescriptreact
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



```

```typescriptreact
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



```

Now let me update the login button colors as well:


```typescriptreact
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



```

I should also update the burger icon color to ensure good contrast against the amber background:


```typescriptreact
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



```

Now let me check for any linting errors:


Perfect! Let me mark the task as completed:


## ✅ Updates Complete!

I've successfully implemented the requested changes:

### 🔄 Layout Changes
- **Burger Menu Position**: Moved the burger icon to the **left** of the logo (instead of right)
- **Visual Hierarchy**: Now the order is: `[Burger Icon] [Logo] [Title] [Auth Button]`

### 🎨 Visual Environment Indicator
- **Amber Background**: When `VITE_API_BASE_DEV` is selected, the top menu now displays with a **yellow/orange/ocre background** (`#f59e0b`)
- **Contrast Optimization**: All text and UI elements automatically adjust for optimal readability:
  - **White text** (`#ffffff`) on amber background
  - **White burger icon** for better visibility
  - **Transparent buttons** with white borders and text
  - **Darker amber border** (`#d97706`) for definition

### 🎯 Key Features
- **Visual Environment Feedback**: Users can immediately see when they're in development mode
- **Consistent Design**: All UI elements maintain proper contrast and accessibility
- **Smooth Transitions**: The color changes are applied dynamically based on environment selection
- **Professional Look**: The amber color provides a clear but not jarring indication of the development environment

The top menu now clearly indicates the current environment state with the amber background when using the development API, and the burger menu is positioned to the left of the logo as requested!

