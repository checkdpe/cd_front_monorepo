import React, { useMemo, useState } from "react";
import { Button, Card, Drawer, Input, InputNumber, Space, Switch, message } from "antd";

export type DpeDrawerEditorProps = {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  rootJsonText: string;
  onApply: (nextJsonText: string) => void;
};

type VariantKey = "haut" | "bas";
type EditorVariantState = { enabled: boolean; index: number; text: string };

const editorVariants = {
  haut: { base: ["dpe", "logement", "enveloppe"] as const, collection: "plancher_haut_collection", itemKey: "plancher_haut", label: "Plancher haut" },
  bas: { base: ["dpe", "logement", "enveloppe"] as const, collection: "plancher_bas_collection", itemKey: "plancher_bas", label: "Plancher bas" },
} as const;

function deepGet(root: any, path: (string | number)[]): any {
  return path.reduce((acc: any, key: any) => (acc != null ? acc[key] : undefined), root);
}

function ensurePath(root: any, path: string[]): any {
  let cursor = root;
  for (const key of path) {
    if (cursor[key] == null || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  return cursor;
}

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "30%", rootJsonText, onApply }) => {
  const initialState = useMemo((): Record<VariantKey, EditorVariantState> => {
    try {
      const root = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      const next: Record<VariantKey, EditorVariantState> = { haut: { enabled: false, index: 0, text: "{\n}\n" }, bas: { enabled: false, index: 0, text: "{\n}\n" } };
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        const baseObj = deepGet(root, v.base as unknown as string[]) || {};
        const coll = baseObj?.[v.collection];
        const arr = Array.isArray(coll) ? coll : undefined;
        const idx = 0;
        const slot = arr && arr[idx];
        const value = slot && typeof slot === "object" ? slot[v.itemKey] : undefined;
        if (value != null) {
          next[k] = { enabled: true, index: idx, text: JSON.stringify(value, null, 2) + "\n" };
        }
      });
      return next;
    } catch {
      return { haut: { enabled: false, index: 0, text: "{\n}\n" }, bas: { enabled: false, index: 0, text: "{\n}\n" } };
    }
  }, [rootJsonText]);

  const [editorState, setEditorState] = useState<Record<VariantKey, EditorVariantState>>(initialState);

  function applyEditorChanges() {
    try {
      const root = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        const idx = Math.max(0, Math.floor(editorState[k].index || 0));
        const baseObj = ensurePath(root, v.base as unknown as string[]);
        if (!Array.isArray(baseObj[v.collection])) {
          baseObj[v.collection] = [] as any[];
        }
        const arr: any[] = baseObj[v.collection];
        if (editorState[k].enabled) {
          let parsed: any = {};
          try { parsed = editorState[k].text.trim() ? JSON.parse(editorState[k].text) : {}; } catch {
            throw new Error(`${editorVariants[k].label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      });
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
      onClose();
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="right"
      open={open}
      onClose={onClose}
      width={width}
      extra={
        <Space>
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" onClick={applyEditorChanges}>Apply changes</Button>
        </Space>
      }
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {(Object.keys(editorVariants) as VariantKey[]).map((k) => {
          const v = editorVariants[k];
          const st = editorState[k];
          return (
            <Card key={k} size="small" styles={{ body: { padding: 12 } }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => setEditorState((prev) => ({ ...prev, [k]: { ...prev[k], enabled: checked } }))}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              <Space size={8}>
                <div style={{ color: "#4b5563" }}>index</div>
                <InputNumber min={0} value={st.index} onChange={(val) => setEditorState((prev) => ({ ...prev, [k]: { ...prev[k], index: Number(val ?? 0) } }))} />
              </Space>
              <div style={{ height: 8 }} />
              <Input.TextArea
                disabled={!st.enabled}
                autoSize={{ minRows: 6 }}
                value={st.text}
                onChange={(e) => setEditorState((prev) => ({ ...prev, [k]: { ...prev[k], text: e.target.value } }))}
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </Card>
          );
        })}
      </Space>
    </Drawer>
  );
};


