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
