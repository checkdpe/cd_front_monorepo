import React from "react";
import { ChainlitContext, ChainlitAPI, useChatSession, useChatInteract, useChatMessages } from "@chainlit/react-client";
import { RecoilRoot } from "recoil";
import { ChainlitDrawer } from "@acme/chainlit";

export interface ChainlitChatDrawerProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  serverUrl: string;
  clientType?: "webapp" | "copilot" | "teams" | "slack" | "discord";
  // When true, connect without any auth flow (best-effort/anonymous if supported)
  skipAuth?: boolean;
  // Optional path used to probe server liveness before connecting (e.g. "/health")
  checkHealthPath?: string;
  // Static user environment variables passed to connect
  userEnv?: Record<string, string>;
  // Optional resolver to build user env (can be async). If provided, it overrides userEnv.
  resolveUserEnv?: () => Promise<Record<string, string>> | Record<string, string>;
  // Optional socket transports to use when connecting
  transports?: string[];
}

const ChatInner: React.FC<{
  open: boolean;
  serverUrl: string;
  checkHealthPath?: string;
  userEnv?: Record<string, string>;
  resolveUserEnv?: () => Promise<Record<string, string>> | Record<string, string>;
  transports?: string[];
}> = ({ open, serverUrl, checkHealthPath, userEnv, resolveUserEnv, transports }) => {
  const { connect, disconnect } = useChatSession();
  const { sendMessage } = useChatInteract();
  const { messages } = useChatMessages();
  const [input, setInput] = React.useState<string>("");
  const [connectionOk, setConnectionOk] = React.useState<boolean | null>(null);
  const messagesRef = React.useRef<HTMLDivElement | null>(null);

  function joinUrl(base: string, path: string) {
    if (!path) return base;
    try {
      const u = new URL(base);
      // Ensure single slash joining
      const joined = path.startsWith("/") ? path.substring(1) : path;
      u.pathname = [u.pathname.replace(/\/$/, ""), joined].filter(Boolean).join("/");
      return u.toString();
    } catch {
      // Fallback naive join
      const trimmed = base.replace(/\/$/, "");
      const suffix = path.startsWith("/") ? path : `/${path}`;
      return `${trimmed}${suffix}`;
    }
  }

  // Optional: probe the server before attempting to connect
  React.useEffect(() => {
    if (!open) { setConnectionOk(null); return; }
    if (!checkHealthPath) { setConnectionOk(true); return; }
    let cancelled = false;
    const tryHealthCheck = async () => {
      setConnectionOk(null);
      try {
        const res = await fetch(joinUrl(serverUrl, checkHealthPath), { method: "GET", credentials: "omit", cache: "no-store" });
        if (!cancelled) setConnectionOk(res.ok);
      } catch {
        if (!cancelled) setConnectionOk(false);
      }
    };
    void tryHealthCheck();
    return () => { cancelled = true; };
  }, [open, serverUrl, checkHealthPath]);

  React.useEffect(() => {
    if (!open) { disconnect(); return; }
    if (connectionOk === false) { return; }
    let cancelled = false;
    const doConnect = async () => {
      try {
        let env: Record<string, string> = {};
        if (resolveUserEnv) {
          // resolveUserEnv may be async or sync
          const maybe = resolveUserEnv();
          env = (maybe instanceof Promise) ? await maybe : maybe;
        } else if (userEnv) {
          env = userEnv;
        }
        if (!cancelled) {
          connect({ userEnv: env, transports });
        }
      } catch {}
    };
    void doConnect();
    return () => { cancelled = true; try { disconnect(); } catch {} };
  }, [open, serverUrl, connectionOk, connect, disconnect, resolveUserEnv, userEnv, transports]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Flatten nested messages to focus on message steps
  function flattenMessages(list: any[]): any[] {
    const result: any[] = [];
    for (const node of list || []) {
      if (node?.type && String(node.type).includes("message")) {
        result.push(node);
      }
      if (node?.steps?.length) {
        result.push(...flattenMessages(node.steps));
      }
    }
    return result;
  }
  const flatMessages = React.useMemo(() => flattenMessages(messages || []), [messages]);

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
      <div ref={messagesRef} style={{ flex: 1, overflow: "auto", padding: 12, gap: 8, display: "flex", flexDirection: "column" }}>
        {connectionOk === false && (
          <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", padding: "8px 10px", borderRadius: 8 }}>
            Cannot reach Chainlit server at {serverUrl}. Check the URL and server status.
          </div>
        )}
        {flatMessages?.map((m: any) => (
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
        {!flatMessages?.length && (
          <div style={{ color: "#6b7280" }}>
            {connectionOk === null && "Checking connectivity..."}
            {connectionOk === false && "Connection unavailable."}
            {connectionOk === true && `Connected to ${serverUrl}. Send a message below.`}
          </div>
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
  skipAuth = false,
  checkHealthPath,
  userEnv,
  resolveUserEnv,
  transports,
  children
}) => {
  const normalizedServerUrl = React.useMemo(() => serverUrl.replace(/\/+$/, ""), [serverUrl]);
  const apiClient = React.useMemo(() => new ChainlitAPI(
    normalizedServerUrl,
    clientType,
    skipAuth ? () => {} : undefined
  ), [normalizedServerUrl, clientType, skipAuth]);

  return (
    <ChainlitContext.Provider value={apiClient}>
      <RecoilRoot>
        <ChainlitDrawer open={open} onClose={onClose} title={title}>
          {children ?? (
            <ChatInner
              open={open}
              serverUrl={normalizedServerUrl}
              checkHealthPath={checkHealthPath}
              userEnv={userEnv}
              resolveUserEnv={resolveUserEnv}
              transports={transports}
            />
          )}
        </ChainlitDrawer>
      </RecoilRoot>
    </ChainlitContext.Provider>
  );
};


