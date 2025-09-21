import React from "react";
import { Button as AntButton } from "antd";
import "@acme/theme-tokens/css";
import type { ButtonProps } from "../schema";

export const Button: React.FC<ButtonProps> = ({ label, variant = "primary", disabled, onClick }) => {
  const isGhost = variant === "ghost";
  return (
    <AntButton
      type="primary"
      ghost={isGhost}
      disabled={disabled}
      onClick={() => { if (!disabled && onClick) onClick(); }}
    >
      {label}
    </AntButton>
  );
};
