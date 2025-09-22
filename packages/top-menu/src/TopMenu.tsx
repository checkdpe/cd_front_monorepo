import React from "react";
const logoDefault = new URL("./assets/logo-checkdpe.png", import.meta.url).href;
const logoMobileDefault = new URL("./assets/logo-checkdpe-mobile.png", import.meta.url).href;

export interface TopMenuProps {
  logoSrc?: string;
  logoMobileSrc?: string;
  onAuthClick?: () => void;
  authLabel?: string;
}

export const TopMenu: React.FC<TopMenuProps> = ({ logoSrc = logoDefault, logoMobileSrc = logoMobileDefault, onAuthClick, authLabel = "login / sign-up" }) => {
  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "#ffffff",
      borderBottom: "1px solid #e5e7eb",
      padding: "8px 16px"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <picture>
            {logoMobileSrc && <source media="(max-width: 640px)" srcSet={logoMobileSrc} />}
            <img src={logoSrc} alt="logo" style={{ height: 28, width: "auto" }} />
          </picture>
        </div>
        <button
          onClick={onAuthClick}
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
      </div>
    </div>
  );
};


