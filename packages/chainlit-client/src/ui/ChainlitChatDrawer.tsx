import React from "react";
import {
  ChainlitContext,
  ChainlitAPI,
  useChatSession,
  useChatInteract,
  useChatMessages,
  IStep,
} from "@chainlit/react-client";
import { RecoilRoot } from "recoil";
import { ChainlitDrawer } from "@acme/chainlit";

export interface ChainlitChatDrawerProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  serverUrl: string;
  clientType?: "webapp" | "copilot" | "teams" | "slack" | "discord";
  userEnv?: Record<string, string>;
  userAvatarUrl?: string;
  assistantAvatarUrl?: string;
}

function flattenMessages(messages: IStep[], condition: (node: IStep) => boolean): IStep[] {
  return messages.reduce((acc: IStep[], node) => {
    if (condition(node)) {
      acc.push(node);
    }
    if (node.steps?.length) {
      acc.push(...flattenMessages(node.steps, condition));
    }
    return acc;
  }, []);
}

const ChatInner: React.FC<{
  open: boolean;
  serverUrl: string;
  userEnv?: Record<string, string>;
  userAvatarUrl?: string;
  assistantAvatarUrl?: string;
}> = ({ open, serverUrl, userEnv, userAvatarUrl, assistantAvatarUrl }) => {
  const { connect, disconnect } = useChatSession();
  const { sendMessage } = useChatInteract();
  const { messages } = useChatMessages();
  const [inputValue, setInputValue] = React.useState<string>("");
  const messageContainerRef = React.useRef<HTMLDivElement>(null);
  const connectedRef = React.useRef<boolean>(false);
  const connectRef = React.useRef(connect);
  const disconnectRef = React.useRef(disconnect);
  connectRef.current = connect;
  disconnectRef.current = disconnect;
  const envKey = React.useMemo(() => JSON.stringify(userEnv ?? {}), [userEnv]);

  React.useEffect(() => {
    // If drawer is closed, ensure we disconnect once
    if (!open) {
      if (connectedRef.current) {
        try { disconnectRef.current(); } catch {}
        connectedRef.current = false;
      }
      return;
    }

    // When opening or when serverUrl/userEnv changed, reconnect cleanly
    if (connectedRef.current) {
      try { disconnectRef.current(); } catch {}
      connectedRef.current = false;
    }

    try {
      connectRef.current({ userEnv: userEnv ?? {} });
      connectedRef.current = true;
    } catch {}

    return () => {
      if (connectedRef.current) {
        try { disconnectRef.current(); } catch {}
        connectedRef.current = false;
      }
    };
  }, [open, serverUrl, envKey]);

  const flatMessages = React.useMemo(() => {
    return flattenMessages(messages ?? [], (m) => (m.type as string)?.includes("message"));
  }, [messages]);

  React.useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [flatMessages]);

  function handleSend() {
    const content = inputValue.trim();
    if (!content) return;
    const message = {
      name: "user",
      type: "user_message" as const,
      output: content,
    };
    // second parameter is attachments array, aligned with example usage
    sendMessage(message, []);
    setInputValue("");
  }

  function renderMessage(message: IStep) {
    const dateOptions: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    const dateLabel = message.createdAt
      ? new Date(message.createdAt as unknown as number).toLocaleTimeString(undefined, dateOptions)
      : "";

    const isAssistant = message.type === "assistant_message";
    const containerStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "flex-start",
      flexDirection: isAssistant ? "row-reverse" : "row",
      gap: 8,
    };

    const avatarSrc = isAssistant ? assistantAvatarUrl : userAvatarUrl;

    return (
      <div key={message.id} style={containerStyle}>
        <div style={{ flexShrink: 0, fontSize: 12, color: "#22c55e" }}>
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={isAssistant ? "assistant" : "user"}
              style={{ width: 32, height: 32, borderRadius: "9999px", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "9999px",
                background: isAssistant ? "#111827" : "#2563eb",
              }}
            />
          )}
        </div>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 8,
            background: "#fff",
            maxWidth: "calc(100% - 3rem)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {/* No markdown dependency here; keep output as text */}
            {String(message.output ?? "")}
          </div>
          {dateLabel ? (
            <small style={{ fontSize: 10, color: "#6b7280" }}>{dateLabel}</small>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div ref={messageContainerRef} style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {flatMessages.map((m) => renderMessage(m))}
        </div>
      </div>
      <div style={{ borderTop: "1px solid #e5e7eb", padding: 16, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            autoFocus
            style={{ flex: 1, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8 }}
            id="message-input"
            placeholder="Ecrire un message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#1677ff",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Envoyer
          </button>
        </div>
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
  userEnv,
  userAvatarUrl,
  assistantAvatarUrl,
  children,
}) => {
  const apiClient = React.useMemo(
    () => new ChainlitAPI(serverUrl, clientType),
    [serverUrl, clientType]
  );

  return (
    <ChainlitContext.Provider value={apiClient}>
      <RecoilRoot>
        <ChainlitDrawer open={open} onClose={onClose} title={title}>
          {children ?? (
            <ChatInner
              open={open}
              serverUrl={serverUrl}
              userEnv={userEnv}
              userAvatarUrl={userAvatarUrl}
              assistantAvatarUrl={assistantAvatarUrl}
            />
          )}
        </ChainlitDrawer>
      </RecoilRoot>
    </ChainlitContext.Provider>
  );
};


