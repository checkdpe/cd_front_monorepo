import React from "react";
import { ChainlitContext, ChainlitAPI } from "@chainlit/react-client";
import { ChainlitDrawer } from "@acme/chainlit";

export interface ChainlitChatDrawerProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  serverUrl: string;
  clientType?: string;
}

export const ChainlitChatDrawer: React.FC<React.PropsWithChildren<ChainlitChatDrawerProps>> = ({
  open,
  onClose,
  title = "Chainlit",
  serverUrl,
  clientType = "webapp",
  children
}) => {
  const apiClient = React.useMemo(() => new ChainlitAPI(serverUrl, clientType), [serverUrl, clientType]);

  return (
    <ChainlitContext.Provider value={apiClient}>
      <ChainlitDrawer open={open} onClose={onClose} title={title}>
        {children ?? <div style={{ padding: 16 }}>Connected to {serverUrl}</div>}
      </ChainlitDrawer>
    </ChainlitContext.Provider>
  );
};


