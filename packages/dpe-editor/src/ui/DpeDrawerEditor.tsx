import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, Drawer, Input, InputNumber, Space, Switch, message } from "antd";
import { fetchSimulationDpeFullJson } from "../api";

export type DpeDrawerEditorProps = {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  rootJsonText: string;
  onApply: (nextJsonText: string) => void;
  // When provided, component will call the API on open using a Cognito bearer token
  apiLoadParams?: { baseUrl?: string; ref_ademe: string };
  getAccessToken?: () => Promise<string | null>;
  onLoadedFromApi?: (data: unknown) => void;
  onHighlightJsonPath?: (args: { collection: "plancher_haut_collection" | "plancher_bas_collection"; itemKey: "plancher_haut" | "plancher_bas"; indices: number[] }) => void;
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

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "30%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantKey, { key: string; description: string; selected: boolean; payload: any }[]>>({ haut: [], bas: [] });
  const [highlighted, setHighlighted] = useState<Record<VariantKey, Record<string, boolean>>>({ haut: {}, bas: {} });
  // Fetch from API when the drawer opens if configured
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    let isCancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const data: any = await fetchSimulationDpeFullJson({
          baseUrl: apiLoadParams.baseUrl,
          ref_ademe: apiLoadParams.ref_ademe,
          accessToken: token,
        });
        if (!isCancelled) {
          onLoadedFromApi?.(data);
          try {
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const hautEntry = runs.find((r) => r && r.elements_variant === "dpe.logement.enveloppe.plancher_haut_collection.plancher_haut");
            const basEntry = runs.find((r) => r && r.elements_variant === "dpe.logement.enveloppe.plancher_bas_collection.plancher_bas");
            const hautScopes: number[] = Array.isArray(hautEntry?.elements_scope) ? (hautEntry.elements_scope as number[]) : [];
            const basScopes: number[] = Array.isArray(basEntry?.elements_scope) ? (basEntry.elements_scope as number[]) : [];
            const hautArr = Array.isArray(((data?.dpe?.logement?.enveloppe?.plancher_haut_collection || {}) as any).plancher_haut)
              ? ((data?.dpe?.logement?.enveloppe?.plancher_haut_collection as any).plancher_haut as any[])
              : [];
            const basArr = Array.isArray(((data?.dpe?.logement?.enveloppe?.plancher_bas_collection || {}) as any).plancher_bas)
              ? ((data?.dpe?.logement?.enveloppe?.plancher_bas_collection as any).plancher_bas as any[])
              : [];
            const nextHaut = hautArr.map((item: any, idx: number) => ({
              key: String(item?.donnee_entree?.reference || idx),
              description: String(item?.donnee_entree?.description || `Plancher haut ${idx + 1}`),
              selected: hautScopes.includes(idx),
              payload: item,
            }));
            const nextBas = basArr.map((item: any, idx: number) => ({
              key: String(item?.donnee_entree?.reference || idx),
              description: String(item?.donnee_entree?.description || `Plancher bas ${idx + 1}`),
              selected: basScopes.includes(idx),
              payload: item,
            }));
            setAvailableOptions({ haut: nextHaut, bas: nextBas });
          } catch {
            setAvailableOptions({ haut: [], bas: [] });
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    })();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken, onLoadedFromApi]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const hautEntry = runs.find((r) => r && r.elements_variant === "dpe.logement.enveloppe.plancher_haut_collection.plancher_haut");
      const basEntry = runs.find((r) => r && r.elements_variant === "dpe.logement.enveloppe.plancher_bas_collection.plancher_bas");
      const hautScopes: number[] = Array.isArray(hautEntry?.elements_scope) ? hautEntry.elements_scope as number[] : [];
      const basScopes: number[] = Array.isArray(basEntry?.elements_scope) ? basEntry.elements_scope as number[] : [];
      setAvailableOptions((prev) => ({
        haut: prev.haut.map((o, idx) => ({ ...o, selected: hautScopes.includes(idx) })),
        bas: prev.bas.map((o, idx) => ({ ...o, selected: basScopes.includes(idx) })),
      }));
    } catch {
      // ignore
    }
  }, [rootJsonText]);

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

  // (no-op)

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
      mask={false}
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
              {availableOptions[k]?.length ? (
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Options from API</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {availableOptions[k].map((opt, idx) => (
                      <label
                        key={opt.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 6px",
                          borderRadius: 6,
                          background: highlighted[k]?.[opt.key] ? "#fff7ed" : "transparent",
                          transition: "background-color 600ms ease",
                        }}
                      >
                        <Checkbox
                          checked={opt.selected}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            // Update JSON immediately (runs array with elements_scope) and highlight
                            try {
                              let parsed: any = [];
                              try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                              const runs: any[] = Array.isArray(parsed) ? parsed : [];
                              const collectionName = v.collection as "plancher_haut_collection" | "plancher_bas_collection";
                              const itemKey = v.itemKey as "plancher_haut" | "plancher_bas";
                              const variantPath = `dpe.logement.enveloppe.${collectionName}.${itemKey}`;
                              let entry = runs.find((r) => r && r.elements_variant === variantPath);
                              if (!entry) {
                                entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                runs.push(entry);
                              }
                              const optionIdx = idx; // 0-based index in available options order
                              const scopes: number[] = Array.isArray(entry.elements_scope) ? [...entry.elements_scope] : [];
                              const has = scopes.includes(optionIdx);
                              if (checked && !has) scopes.push(optionIdx);
                              if (!checked && has) {
                                const pos = scopes.indexOf(optionIdx);
                                if (pos !== -1) scopes.splice(pos, 1);
                              }
                              entry.elements_scope = scopes;

                              onApply(JSON.stringify(runs, null, 2));
                              message.success(checked ? "Added option to JSON" : "Removed option from JSON");

                              // Ask parent to highlight the corresponding indices in scope
                              try {
                                const indices = scopes.slice().sort((a, b) => a - b);
                                if (indices.length > 0) onHighlightJsonPath?.({ collection: collectionName, itemKey, indices });
                              } catch {}

                              const refKey = String(opt.key);
                              setHighlighted((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [k]: { ...(prev[k] || {}), [refKey]: false } }));
                              }, 1000);
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                          }}
                        />
                        <span style={{ fontSize: 12, color: "#374151" }}>{opt.description}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <div style={{ height: 8 }} />
              <Input.TextArea
                readOnly={!st.enabled}
                autoSize={{ minRows: 6 }}
                value={st.text}
                onChange={(e) => setEditorState((prev) => ({ ...prev, [k]: { ...prev[k], text: e.target.value } }))}
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
                  backgroundColor: st.enabled ? undefined : "#f5f5f5",
                  color: st.enabled ? undefined : "#6b7280",
                  cursor: st.enabled ? "text" : "default",
                  maxHeight: st.enabled ? undefined : 280,
                  overflow: st.enabled ? undefined : "auto",
                }}
              />
            </Card>
          );
        })}
      </Space>
    </Drawer>
  );
};


