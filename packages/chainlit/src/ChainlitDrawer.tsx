import React from "react";
import { Drawer } from "antd";

export interface ChainlitDrawerProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
}

export const ChainlitDrawer: React.FC<ChainlitDrawerProps> = ({ open, onClose, title = "Chainlit" }) => {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={560}
      destroyOnClose
      mask
    >
      <h1>{title}</h1>
    </Drawer>
  );
};


