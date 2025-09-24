import React from "react";
import { ChainlitContext, ChainlitAPI, useChatSession, useChatInteract, useChatMessages } from "@chainlit/react-client";
import { RecoilRoot } from "recoil";
import { ChainlitDrawer } from "@acme/chainlit";

export interface ChainlitChatDrawerProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  serverUrl: string;
  clientType?: string;
}

const ChatInner: React.FC<{ open: boolean; serverUrl: string; }> = ({ open, serverUrl }) => {
  const { connect, disconnect } = useChatSession();
  const { sendMessage } = useChatInteract();
  const { messages } = useChatMessages();
  const [input, setInput] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) { disconnect(); return; }
    try {
      connect({ userEnv: {} });
    } catch {}
    return () => { try { disconnect(); } catch {} };
  }, [open, serverUrl, connect, disconnect]);

  function handleSend() {
    const content = input.trim();
    if (!content) return;
    sendMessage({
      id: String(Date.now()),
      name: "user",
      type: "user_message",
      output: content,
      createdAt: Date.now(),
    });
    setInput("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto", padding: 12, gap: 8, display: "flex", flexDirection: "column" }}>
        {messages?.map((m) => (
          <div key={m.id} style={{
            alignSelf: m.type === "user_message" ? "flex-end" : "flex-start",
            background: m.type === "user_message" ? "#e5f6ff" : "#f5f5f5",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "8px 10px",
            maxWidth: "80%",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {m.output}
          </div>
        ))}
        {!messages?.length && (
          <div style={{ color: "#6b7280" }}>Connected to {serverUrl}. Send a message below.</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid #e5e7eb" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message..."
          style={{ flex: 1, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
        />
        <button onClick={handleSend} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#0ea5e9", color: "#fff" }}>Send</button>
      </div>
    </div>
  );
};

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
      <RecoilRoot>
        <ChainlitDrawer open={open} onClose={onClose} title={title}>
          {children ?? <ChatInner open={open} serverUrl={serverUrl} />}
        </ChainlitDrawer>
      </RecoilRoot>
    </ChainlitContext.Provider>
  );
};


