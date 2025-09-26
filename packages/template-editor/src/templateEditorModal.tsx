import React, { useEffect, useMemo, useState } from "react";
import { Modal, Space, Typography, Input, Button, message } from "antd";

export type TemplateEditorModalProps = {
  open: boolean;
  onCancel: () => void;
  /** endpoint base URL; defaults to dev */
  baseUrl?: string;
  /** ADEME reference to load template for */
  refAdeme?: string;
  /** Provide function returning Cognito bearer token */
  getAccessToken: () => Promise<string | null>;
  /** Optional: receive raw data after fetch */
  onLoaded?: (data: unknown) => void;
};

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({ open, onCancel, baseUrl = "https://api-dev.etiquettedpe.fr", refAdeme, getAccessToken, onLoaded }) => {
  const [effectiveRef, setEffectiveRef] = useState<string>(refAdeme || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string>("\n");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setText("\n");
    setEffectiveRef(refAdeme || "");
  }, [open, refAdeme]);

  useEffect(() => {
    if (!open) return;
    if (!effectiveRef) return;
    void fetchTemplate();
  }, [open, effectiveRef]);

  async function fetchTemplate() {
    try {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      const url = new URL("/backoffice/simulation_template", baseUrl);
      if (effectiveRef) url.searchParams.set("ref_ademe", effectiveRef);
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json, text/plain, */*",
        },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const data = await res.json().catch(() => null);
      const runs = Array.isArray((data as any)?.runs) ? (data as any).runs : (Array.isArray(data) ? data : []);
      const pretty = JSON.stringify(runs, null, 2) + "\n";
      setText(pretty);
      onLoaded?.(data);
    } catch (e: any) {
      setError(e?.message || "Request failed");
      message.error("Failed to load template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title="Template editor"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      width={720}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <div>
          <div style={{ marginBottom: 6, color: "#4b5563" }}>ref_ademe</div>
          <Input value={effectiveRef} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEffectiveRef(e.target.value)} placeholder="e.g. 2508E0243162W" />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button onClick={onCancel}>Close</Button>
          <Button type="primary" onClick={fetchTemplate} loading={loading}>Reload</Button>
        </div>
        {error ? <div style={{ color: "#b91c1c" }}>{error}</div> : null}
        <Input.TextArea
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          autoSize={{ minRows: 10 }}
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
        />
      </Space>
    </Modal>
  );
}


