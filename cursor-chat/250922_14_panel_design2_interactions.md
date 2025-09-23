# Invert pricing settings layout
_Exported on 22/09/2025 at 22:53:08 CEST from Cursor (1.5.5)_

---

**User**

for "Pricing" setting in right panel, invert line/column so "Increment", "price var", "price fix" appear as columns

---

**Cursor**

I'll look for the right panel component and the "Pricing" setting to adjust its table layout.

I'll open the `DpeDrawerEditor.tsx` to inspect the current Pricing grid and update it to transpose rows/columns so the three labels become columns.

I'll update the "Pricing" section in `DpeDrawerEditor.tsx` to transpose the layout so "Increment", "Price var", and "Price fix" become the columns, with rows for each scenario index. Then I'll check for linter issues.

```typescriptreact
import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
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
  const [pricing, setPricing] = useState<Record<VariantKey, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({
    haut: { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" },
    bas: { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" },
  });

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantKey | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantKey, { inputKey?: string; costKey?: string }>>({ haut: {}, bas: {} });
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

  // (no-op)

  const initialState = useMemo((): Record<VariantKey, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      const root = rootRaw && typeof rootRaw === "object" && !Array.isArray(rootRaw) ? rootRaw : {};
      const defaultState: Record<VariantKey, EditorVariantState> = { haut: { enabled: false, index: 0, text: "{\n}\n" }, bas: { enabled: false, index: 0, text: "{\n}\n" } };
      const next: Record<VariantKey, EditorVariantState> = { ...defaultState };
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        let enabled = false;
        let index = 0;
        let text = "{\n}\n";

        // Shape A: dpe.logement.enveloppe.<collection>.<itemKey> is an array of items
        const baseObj = deepGet(root, v.base as unknown as string[]) || {};
        const collectionObj = baseObj?.[v.collection];
        const nestedArr = Array.isArray(collectionObj?.[v.itemKey]) ? (collectionObj[v.itemKey] as any[]) : undefined;
        if (nestedArr && nestedArr.length > 0) {
          const first = nestedArr[0];
          if (first && typeof first === "object") {
            enabled = true;
            index = 0;
            text = JSON.stringify(first, null, 2) + "\n";
          }
        } else {
          // Shape B: dpe.logement.enveloppe.<collection> is an array of items that may contain { <itemKey>: {...} }
          const arr = Array.isArray(collectionObj) ? (collectionObj as any[]) : undefined;
          if (arr && arr.length > 0) {
            const foundIndex = arr.findIndex((slot) => slot && typeof slot === "object" && slot[v.itemKey] != null);
            if (foundIndex !== -1) {
              const value = arr[foundIndex][v.itemKey];
              if (value != null) {
                enabled = true;
                index = foundIndex;
                text = JSON.stringify(value, null, 2) + "\n";
              }
            }
          }
        }

        // Shape C: root is actually a runs[] array with an entry for this variant
        if (!enabled) {
          const runs = Array.isArray(rootRaw) ? (rootRaw as any[]) : [];
          const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
          const entry = runs.find((r) => r && r.elements_variant === variantPath);
          if (entry) {
            enabled = true;
            index = 0;
            text = "{\n}\n";
          }
        }

        next[k] = { enabled, index, text };
      });
      return next;
    } catch {
      return { haut: { enabled: false, index: 0, text: "{\n}\n" }, bas: { enabled: false, index: 0, text: "{\n}\n" } };
    }
  }, [rootJsonText]);

  const [editorState, setEditorState] = useState<Record<VariantKey, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

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

  function getFirstScenarioInputKey(variantKey: VariantKey): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const inputObj = firstScenario?.input || firstScenario?.inputs || undefined;
      if (inputObj && typeof inputObj === "object") {
        const keys = Object.keys(inputObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getFirstScenarioCostKey(variantKey: VariantKey): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const costObj = firstScenario?.cost || undefined;
      if (costObj && typeof costObj === "object") {
        const keys = Object.keys(costObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function deriveVariantPricing(variantKey: VariantKey): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantKey]?.inputKey || getFirstScenarioInputKey(variantKey) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantKey]?.costKey || getFirstScenarioCostKey(variantKey) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Sync pricing grid from JSON scenarios when opening or when JSON/mapping keys change
  useEffect(() => {
    if (!open) return;
    try {
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const derived = deriveVariantPricing(k);
        setPricing((prev) => {
          const current = prev[k];
          const nextLen = derived.increments.length || current.increments.length || 0;
          const ensureLen = (arr: number[], len: number) => {
            const out = arr.slice(0, len);
            while (out.length < len) out.push(0);
            return out;
          };
        
          const nextIncrements = derived.increments.length ? derived.increments : current.increments;
          const nextPriceVar = derived.priceVar.length ? derived.priceVar : current.priceVar;
          const nextPriceFix = ensureLen(current.priceFix, Math.max(nextLen, nextPriceVar.length));
          return {
            ...prev,
            [k]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      });
    } catch {}
  }, [open, rootJsonText, mappingKeys]);

  function updateVariantPricingInJson(
    variantKey: VariantKey,
    _override?: { increments?: number[]; priceVar?: number[]; priceFix?: number[]; incrementUnit?: string; priceUnit?: string },
    updateScenarioIndex?: number,
    scenarioValue?: number
  ) {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      let entry = runs.find((r) => r && r.elements_variant === variantPath);
      if (!entry) {
        entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
        runs.push(entry);
      }
      // Ensure any previous pricing block is removed from JSON – UI-only feature
      if (entry.pricing) {
        try { delete entry.pricing; } catch {}
      }

      if (typeof updateScenarioIndex === "number") {
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        while (entry.scenarios.length <= updateScenarioIndex) {
          entry.scenarios.push({ id: entry.scenarios.length + 1, input: {} });
        }
        const sc = entry.scenarios[updateScenarioIndex] || ({} as any);
        const key = mappingKeys[variantKey]?.inputKey || getFirstScenarioInputKey(variantKey) || "donnee_entree.epaisseur_isolation";
        if (!sc.input || typeof sc.input !== "object") sc.input = {};
        const fallbackVal = (() => {
          try { return pricing[variantKey].increments[updateScenarioIndex]; } catch { return scenarioValue; }
        })();
        sc.input[key] = { set: typeof scenarioValue === "number" ? scenarioValue : fallbackVal };
        entry.scenarios[updateScenarioIndex] = sc;
      }

      onApply(JSON.stringify(runs, null, 2));
    } catch {
      // ignore
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
              {/* index selector removed */}
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
                              // noop
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
              <div>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>Pricing</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `80px repeat(3, minmax(72px, 1fr))`,
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Increment</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].incrementUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "increments", tempUnit: pricing[k].incrementUnit, tempKey: mappingKeys[k]?.inputKey || getFirstScenarioInputKey(k) || "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price var</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].priceUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "priceVar", tempUnit: pricing[k].priceUnit, tempKey: mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price fix</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].priceUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "priceFix", tempUnit: pricing[k].priceUnit, tempKey: mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "" })} />
                  </div>

                  {(() => {
                    const rowCount = Math.max(
                      pricing[k].increments.length,
                      pricing[k].priceVar.length,
                      pricing[k].priceFix.length
                    );
                    return Array.from({ length: rowCount }).map((_, idx) => {
                      const incVal = pricing[k].increments[idx] ?? 0;
                      const priceVarVal = pricing[k].priceVar[idx] ?? 0;
                      const priceFixVal = pricing[k].priceFix[idx] ?? 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <div style={{ color: "#6b7280", fontSize: 12 }}>#{idx + 1}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextIncs = current.increments.slice();
                                  while (nextIncs.length <= idx) nextIncs.push(0);
                                  nextIncs[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, increments: nextIncs } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? incVal);
                                updateVariantPricingInJson(k, undefined, idx, value);
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextPrices = current.priceVar.slice();
                                  while (nextPrices.length <= idx) nextPrices.push(0);
                                  nextPrices[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? priceVarVal);
                                try {
                                  let parsed: any = [];
                                  try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                                  const runs: any[] = Array.isArray(parsed) ? parsed : [];
                                  const v = editorVariants[k];
                                  const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
                                  let entry = runs.find((r) => r && r.elements_variant === variantPath);
                                  if (!entry) {
                                    entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                    runs.push(entry);
                                  }
                                  if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
                                  while (entry.scenarios.length <= idx) {
                                    entry.scenarios.push({ id: entry.scenarios.length + 1, input: {}, cost: {} });
                                  }
                                  const sc = entry.scenarios[idx] || ({} as any);
                                  const configuredCostKey = mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "donnee_entree.surface_paroi_opaque";
                                  if (!sc.cost || typeof sc.cost !== "object") sc.cost = {};
                                  sc.cost[configuredCostKey] = { multiply: value };
                                  entry.scenarios[idx] = sc;
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceFixVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextPrices = current.priceFix.slice();
                                  while (nextPrices.length <= idx) nextPrices.push(0);
                                  nextPrices[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, priceFix: nextPrices } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? priceFixVal);
                                updateVariantPricingInJson(k, undefined, idx, value);
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              </div>
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            setPricing((prev) => {
              const current = prev[variant];
              if (field === "increments") {
                return { ...prev, [variant]: { ...current, incrementUnit: colSettings.tempUnit || current.incrementUnit } };
              }
              return { ...prev, [variant]: { ...current, priceUnit: colSettings.tempUnit || current.priceUnit } };
            });
            setMappingKeys((prev) => {
              const current = prev[variant] || {};
              if (field === "increments") return { ...prev, [variant]: { ...current, inputKey: colSettings.tempKey || current.inputKey } };
              return { ...prev, [variant]: { ...current, costKey: colSettings.tempKey || current.costKey } };
            });
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "" });
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>
              {colSettings.field === "increments" ? "Scenario input key (index mapping)" : "Scenario cost key (index mapping)"}
            </div>
            <Input
              value={colSettings.tempKey}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempKey: e.target.value }))}
              placeholder={colSettings.variant ? (
                colSettings.field === "increments"
                  ? (getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
              ) : ""}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>Unit</div>
            <Input
              value={colSettings.tempUnit}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempUnit: e.target.value }))}
              placeholder="e.g. cm or EUR/m2"
            />
          </div>
        </Space>
      </Modal>
    </Drawer>
  );
};



```

I'll run a quick lint check on the file I edited to ensure there are no errors.

- I found the Pricing grid in `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx` and inverted it so the column headers are now Increment, Price var, Price fix, with each row representing a scenario index.
- The grid now has a header row with the three settings as columns, and inputs are aligned per scenario row. Units and the settings gear buttons are preserved.
- Lint passed with no issues.

---

**User**

stuck to #1 , #2, ... as line index => a check box allowing to select them in "scenarios" or not ; json updated accordingly

---

**Cursor**

I'm going to add a checkbox per scenario row to toggle whether that scenario is present in the JSON. I'll maintain a `scenarioEnabled` state synced from the JSON and update the JSON on toggle without shifting indices (using null placeholders). Then I'll lint the file.

```typescriptreact
import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
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
  const [pricing, setPricing] = useState<Record<VariantKey, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({
    haut: { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" },
    bas: { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" },
  });

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantKey | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantKey, { inputKey?: string; costKey?: string }>>({ haut: {}, bas: {} });
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantKey, boolean[]>>({ haut: [], bas: [] });
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

  // (no-op)

  const initialState = useMemo((): Record<VariantKey, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      const root = rootRaw && typeof rootRaw === "object" && !Array.isArray(rootRaw) ? rootRaw : {};
      const defaultState: Record<VariantKey, EditorVariantState> = { haut: { enabled: false, index: 0, text: "{\n}\n" }, bas: { enabled: false, index: 0, text: "{\n}\n" } };
      const next: Record<VariantKey, EditorVariantState> = { ...defaultState };
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        let enabled = false;
        let index = 0;
        let text = "{\n}\n";

        // Shape A: dpe.logement.enveloppe.<collection>.<itemKey> is an array of items
        const baseObj = deepGet(root, v.base as unknown as string[]) || {};
        const collectionObj = baseObj?.[v.collection];
        const nestedArr = Array.isArray(collectionObj?.[v.itemKey]) ? (collectionObj[v.itemKey] as any[]) : undefined;
        if (nestedArr && nestedArr.length > 0) {
          const first = nestedArr[0];
          if (first && typeof first === "object") {
            enabled = true;
            index = 0;
            text = JSON.stringify(first, null, 2) + "\n";
          }
        } else {
          // Shape B: dpe.logement.enveloppe.<collection> is an array of items that may contain { <itemKey>: {...} }
          const arr = Array.isArray(collectionObj) ? (collectionObj as any[]) : undefined;
          if (arr && arr.length > 0) {
            const foundIndex = arr.findIndex((slot) => slot && typeof slot === "object" && slot[v.itemKey] != null);
            if (foundIndex !== -1) {
              const value = arr[foundIndex][v.itemKey];
              if (value != null) {
                enabled = true;
                index = foundIndex;
                text = JSON.stringify(value, null, 2) + "\n";
              }
            }
          }
        }

        // Shape C: root is actually a runs[] array with an entry for this variant
        if (!enabled) {
          const runs = Array.isArray(rootRaw) ? (rootRaw as any[]) : [];
          const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
          const entry = runs.find((r) => r && r.elements_variant === variantPath);
          if (entry) {
            enabled = true;
            index = 0;
            text = "{\n}\n";
          }
        }

        next[k] = { enabled, index, text };
      });
      return next;
    } catch {
      return { haut: { enabled: false, index: 0, text: "{\n}\n" }, bas: { enabled: false, index: 0, text: "{\n}\n" } };
    }
  }, [rootJsonText]);

  const [editorState, setEditorState] = useState<Record<VariantKey, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

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

  function getFirstScenarioInputKey(variantKey: VariantKey): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const inputObj = firstScenario?.input || firstScenario?.inputs || undefined;
      if (inputObj && typeof inputObj === "object") {
        const keys = Object.keys(inputObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getFirstScenarioCostKey(variantKey: VariantKey): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const costObj = firstScenario?.cost || undefined;
      if (costObj && typeof costObj === "object") {
        const keys = Object.keys(costObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function deriveVariantPricing(variantKey: VariantKey): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantKey]?.inputKey || getFirstScenarioInputKey(variantKey) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantKey]?.costKey || getFirstScenarioCostKey(variantKey) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Sync pricing grid from JSON scenarios when opening or when JSON/mapping keys change
  useEffect(() => {
    if (!open) return;
    try {
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const derived = deriveVariantPricing(k);
        setPricing((prev) => {
          const current = prev[k];
          const nextLen = derived.increments.length || current.increments.length || 0;
          const ensureLen = (arr: number[], len: number) => {
            const out = arr.slice(0, len);
            while (out.length < len) out.push(0);
            return out;
          };
        
          const nextIncrements = derived.increments.length ? derived.increments : current.increments;
          const nextPriceVar = derived.priceVar.length ? derived.priceVar : current.priceVar;
          const nextPriceFix = ensureLen(current.priceFix, Math.max(nextLen, nextPriceVar.length));
          return {
            ...prev,
            [k]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      });
    } catch {}
  }, [open, rootJsonText, mappingKeys]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [k]: flags }));
      });
    } catch {}
  }, [open, rootJsonText]);

  function toggleScenarioPresence(variantKey: VariantKey, idx: number, enabled: boolean) {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      let entry = runs.find((r) => r && r.elements_variant === variantPath);
      if (!entry) {
        entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
        runs.push(entry);
      }
      if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
      while (entry.scenarios.length <= idx) entry.scenarios.push(null);
      if (enabled) {
        const current = entry.scenarios[idx];
        entry.scenarios[idx] = current && typeof current === "object" ? current : { id: idx + 1, input: {}, cost: {} };
      } else {
        entry.scenarios[idx] = null;
      }
      onApply(JSON.stringify(runs, null, 2));
      setScenarioEnabled((prev) => {
        const current = prev[variantKey] ? prev[variantKey].slice() : [];
        while (current.length <= idx) current.push(false);
        current[idx] = enabled;
        return { ...prev, [variantKey]: current };
      });
    } catch {}
  }

  function updateVariantPricingInJson(
    variantKey: VariantKey,
    _override?: { increments?: number[]; priceVar?: number[]; priceFix?: number[]; incrementUnit?: string; priceUnit?: string },
    updateScenarioIndex?: number,
    scenarioValue?: number
  ) {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      let entry = runs.find((r) => r && r.elements_variant === variantPath);
      if (!entry) {
        entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
        runs.push(entry);
      }
      // Ensure any previous pricing block is removed from JSON – UI-only feature
      if (entry.pricing) {
        try { delete entry.pricing; } catch {}
      }

      if (typeof updateScenarioIndex === "number") {
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        while (entry.scenarios.length <= updateScenarioIndex) {
          entry.scenarios.push({ id: entry.scenarios.length + 1, input: {} });
        }
        const sc = entry.scenarios[updateScenarioIndex] || ({} as any);
        const key = mappingKeys[variantKey]?.inputKey || getFirstScenarioInputKey(variantKey) || "donnee_entree.epaisseur_isolation";
        if (!sc.input || typeof sc.input !== "object") sc.input = {};
        const fallbackVal = (() => {
          try { return pricing[variantKey].increments[updateScenarioIndex]; } catch { return scenarioValue; }
        })();
        sc.input[key] = { set: typeof scenarioValue === "number" ? scenarioValue : fallbackVal };
        entry.scenarios[updateScenarioIndex] = sc;
      }

      onApply(JSON.stringify(runs, null, 2));
    } catch {
      // ignore
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
              {/* index selector removed */}
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
                              // noop
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
              <div>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>Pricing</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `80px repeat(3, minmax(72px, 1fr))`,
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Increment</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].incrementUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "increments", tempUnit: pricing[k].incrementUnit, tempKey: mappingKeys[k]?.inputKey || getFirstScenarioInputKey(k) || "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price var</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].priceUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "priceVar", tempUnit: pricing[k].priceUnit, tempKey: mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price fix</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].priceUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "priceFix", tempUnit: pricing[k].priceUnit, tempKey: mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "" })} />
                  </div>

                  {(() => {
                    const rowCount = Math.max(
                      pricing[k].increments.length,
                      pricing[k].priceVar.length,
                      pricing[k].priceFix.length
                    );
                    return Array.from({ length: rowCount }).map((_, idx) => {
                      const incVal = pricing[k].increments[idx] ?? 0;
                      const priceVarVal = pricing[k].priceVar[idx] ?? 0;
                      const priceFixVal = pricing[k].priceFix[idx] ?? 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[k]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(k, idx, e.target.checked)}
                            />
                            <span>#{idx + 1}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextIncs = current.increments.slice();
                                  while (nextIncs.length <= idx) nextIncs.push(0);
                                  nextIncs[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, increments: nextIncs } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? incVal);
                                updateVariantPricingInJson(k, undefined, idx, value);
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextPrices = current.priceVar.slice();
                                  while (nextPrices.length <= idx) nextPrices.push(0);
                                  nextPrices[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? priceVarVal);
                                try {
                                  let parsed: any = [];
                                  try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                                  const runs: any[] = Array.isArray(parsed) ? parsed : [];
                                  const v = editorVariants[k];
                                  const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
                                  let entry = runs.find((r) => r && r.elements_variant === variantPath);
                                  if (!entry) {
                                    entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                    runs.push(entry);
                                  }
                                  if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
                                  while (entry.scenarios.length <= idx) {
                                    entry.scenarios.push({ id: entry.scenarios.length + 1, input: {}, cost: {} });
                                  }
                                  const sc = entry.scenarios[idx] || ({} as any);
                                  const configuredCostKey = mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "donnee_entree.surface_paroi_opaque";
                                  if (!sc.cost || typeof sc.cost !== "object") sc.cost = {};
                                  sc.cost[configuredCostKey] = { multiply: value };
                                  entry.scenarios[idx] = sc;
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceFixVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextPrices = current.priceFix.slice();
                                  while (nextPrices.length <= idx) nextPrices.push(0);
                                  nextPrices[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, priceFix: nextPrices } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? priceFixVal);
                                updateVariantPricingInJson(k, undefined, idx, value);
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              </div>
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            setPricing((prev) => {
              const current = prev[variant];
              if (field === "increments") {
                return { ...prev, [variant]: { ...current, incrementUnit: colSettings.tempUnit || current.incrementUnit } };
              }
              return { ...prev, [variant]: { ...current, priceUnit: colSettings.tempUnit || current.priceUnit } };
            });
            setMappingKeys((prev) => {
              const current = prev[variant] || {};
              if (field === "increments") return { ...prev, [variant]: { ...current, inputKey: colSettings.tempKey || current.inputKey } };
              return { ...prev, [variant]: { ...current, costKey: colSettings.tempKey || current.costKey } };
            });
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "" });
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>
              {colSettings.field === "increments" ? "Scenario input key (index mapping)" : "Scenario cost key (index mapping)"}
            </div>
            <Input
              value={colSettings.tempKey}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempKey: e.target.value }))}
              placeholder={colSettings.variant ? (
                colSettings.field === "increments"
                  ? (getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
              ) : ""}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>Unit</div>
            <Input
              value={colSettings.tempUnit}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempUnit: e.target.value }))}
              placeholder="e.g. cm or EUR/m2"
            />
          </div>
        </Space>
      </Modal>
    </Drawer>
  );
};



```

I added per-row checkboxes to toggle each scenario index and update the underlying JSON while keeping indices stable. I'll lint the file to catch any issues.

- Added a checkbox next to each row label `#1`, `#2`, … in the Pricing grid of `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx`.
- Toggling a checkbox adds/removes that scenario in the `runs[].scenarios` array without shifting indices (uses `null` placeholders for disabled rows).
- State `scenarioEnabled` syncs from JSON when opening/JSON changes; toggling updates JSON immediately.
- Lint passed with no issues.

---

**User**

right pane takes 50% width of total screen not 40, "Apply changes" button becomes "OK" , "Close" button removed, "X" button (close with cross) stays and would cancel any change from right panel after asking for confirmation

---

**Cursor**

I'll search for where `DpeDrawerEditor` is used to see if a custom width is passed, then implement the width change, button updates, and a confirm-on-close that reverts JSON to the snapshot from when the drawer opened.

I'll update the drawer to default to 50% width, change the extra buttons so only an "OK" button remains, and add a confirmation on close (X) that restores the original JSON snapshot if the user confirms. Then I'll run lint on the modified file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
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

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantKey, { key: string; description: string; selected: boolean; payload: any }[]>>({ haut: [], bas: [] });
  const [highlighted, setHighlighted] = useState<Record<VariantKey, Record<string, boolean>>>({ haut: {}, bas: {} });
  const [pricing, setPricing] = useState<Record<VariantKey, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({
    haut: { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" },
    bas: { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" },
  });

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantKey | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantKey, { inputKey?: string; costKey?: string }>>({ haut: {}, bas: {} });
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantKey, boolean[]>>({ haut: [], bas: [] });
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

  // Capture original JSON when opening, used to rollback on close (X)
  useEffect(() => {
    if (open) {
      originalJsonRef.current = rootJsonText;
    }
  }, [open]);

  // (no-op)

  const initialState = useMemo((): Record<VariantKey, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      const root = rootRaw && typeof rootRaw === "object" && !Array.isArray(rootRaw) ? rootRaw : {};
      const defaultState: Record<VariantKey, EditorVariantState> = { haut: { enabled: false, index: 0, text: "{\n}\n" }, bas: { enabled: false, index: 0, text: "{\n}\n" } };
      const next: Record<VariantKey, EditorVariantState> = { ...defaultState };
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        let enabled = false;
        let index = 0;
        let text = "{\n}\n";

        // Shape A: dpe.logement.enveloppe.<collection>.<itemKey> is an array of items
        const baseObj = deepGet(root, v.base as unknown as string[]) || {};
        const collectionObj = baseObj?.[v.collection];
        const nestedArr = Array.isArray(collectionObj?.[v.itemKey]) ? (collectionObj[v.itemKey] as any[]) : undefined;
        if (nestedArr && nestedArr.length > 0) {
          const first = nestedArr[0];
          if (first && typeof first === "object") {
            enabled = true;
            index = 0;
            text = JSON.stringify(first, null, 2) + "\n";
          }
        } else {
          // Shape B: dpe.logement.enveloppe.<collection> is an array of items that may contain { <itemKey>: {...} }
          const arr = Array.isArray(collectionObj) ? (collectionObj as any[]) : undefined;
          if (arr && arr.length > 0) {
            const foundIndex = arr.findIndex((slot) => slot && typeof slot === "object" && slot[v.itemKey] != null);
            if (foundIndex !== -1) {
              const value = arr[foundIndex][v.itemKey];
              if (value != null) {
                enabled = true;
                index = foundIndex;
                text = JSON.stringify(value, null, 2) + "\n";
              }
            }
          }
        }

        // Shape C: root is actually a runs[] array with an entry for this variant
        if (!enabled) {
          const runs = Array.isArray(rootRaw) ? (rootRaw as any[]) : [];
          const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
          const entry = runs.find((r) => r && r.elements_variant === variantPath);
          if (entry) {
            enabled = true;
            index = 0;
            text = "{\n}\n";
          }
        }

        next[k] = { enabled, index, text };
      });
      return next;
    } catch {
      return { haut: { enabled: false, index: 0, text: "{\n}\n" }, bas: { enabled: false, index: 0, text: "{\n}\n" } };
    }
  }, [rootJsonText]);

  const [editorState, setEditorState] = useState<Record<VariantKey, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

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
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    Modal.confirm({
      title: "Discard changes?",
      content: "Closing will revert any changes made in this panel.",
      okText: "Discard",
      cancelText: "Cancel",
      onOk: () => {
        try {
          onApply(originalJsonRef.current);
        } finally {
          onClose();
        }
      },
    });
  }

  function getFirstScenarioInputKey(variantKey: VariantKey): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const inputObj = firstScenario?.input || firstScenario?.inputs || undefined;
      if (inputObj && typeof inputObj === "object") {
        const keys = Object.keys(inputObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getFirstScenarioCostKey(variantKey: VariantKey): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const costObj = firstScenario?.cost || undefined;
      if (costObj && typeof costObj === "object") {
        const keys = Object.keys(costObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function deriveVariantPricing(variantKey: VariantKey): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantKey]?.inputKey || getFirstScenarioInputKey(variantKey) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantKey]?.costKey || getFirstScenarioCostKey(variantKey) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Sync pricing grid from JSON scenarios when opening or when JSON/mapping keys change
  useEffect(() => {
    if (!open) return;
    try {
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const derived = deriveVariantPricing(k);
        setPricing((prev) => {
          const current = prev[k];
          const nextLen = derived.increments.length || current.increments.length || 0;
          const ensureLen = (arr: number[], len: number) => {
            const out = arr.slice(0, len);
            while (out.length < len) out.push(0);
            return out;
          };
        
          const nextIncrements = derived.increments.length ? derived.increments : current.increments;
          const nextPriceVar = derived.priceVar.length ? derived.priceVar : current.priceVar;
          const nextPriceFix = ensureLen(current.priceFix, Math.max(nextLen, nextPriceVar.length));
          return {
            ...prev,
            [k]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      });
    } catch {}
  }, [open, rootJsonText, mappingKeys]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [k]: flags }));
      });
    } catch {}
  }, [open, rootJsonText]);

  function toggleScenarioPresence(variantKey: VariantKey, idx: number, enabled: boolean) {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      let entry = runs.find((r) => r && r.elements_variant === variantPath);
      if (!entry) {
        entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
        runs.push(entry);
      }
      if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
      while (entry.scenarios.length <= idx) entry.scenarios.push(null);
      if (enabled) {
        const current = entry.scenarios[idx];
        entry.scenarios[idx] = current && typeof current === "object" ? current : { id: idx + 1, input: {}, cost: {} };
      } else {
        entry.scenarios[idx] = null;
      }
      onApply(JSON.stringify(runs, null, 2));
      setScenarioEnabled((prev) => {
        const current = prev[variantKey] ? prev[variantKey].slice() : [];
        while (current.length <= idx) current.push(false);
        current[idx] = enabled;
        return { ...prev, [variantKey]: current };
      });
    } catch {}
  }

  function updateVariantPricingInJson(
    variantKey: VariantKey,
    _override?: { increments?: number[]; priceVar?: number[]; priceFix?: number[]; incrementUnit?: string; priceUnit?: string },
    updateScenarioIndex?: number,
    scenarioValue?: number
  ) {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      let entry = runs.find((r) => r && r.elements_variant === variantPath);
      if (!entry) {
        entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
        runs.push(entry);
      }
      // Ensure any previous pricing block is removed from JSON – UI-only feature
      if (entry.pricing) {
        try { delete entry.pricing; } catch {}
      }

      if (typeof updateScenarioIndex === "number") {
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        while (entry.scenarios.length <= updateScenarioIndex) {
          entry.scenarios.push({ id: entry.scenarios.length + 1, input: {} });
        }
        const sc = entry.scenarios[updateScenarioIndex] || ({} as any);
        const key = mappingKeys[variantKey]?.inputKey || getFirstScenarioInputKey(variantKey) || "donnee_entree.epaisseur_isolation";
        if (!sc.input || typeof sc.input !== "object") sc.input = {};
        const fallbackVal = (() => {
          try { return pricing[variantKey].increments[updateScenarioIndex]; } catch { return scenarioValue; }
        })();
        sc.input[key] = { set: typeof scenarioValue === "number" ? scenarioValue : fallbackVal };
        entry.scenarios[updateScenarioIndex] = sc;
      }

      onApply(JSON.stringify(runs, null, 2));
    } catch {
      // ignore
    }
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="right"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>OK</Button>
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
              {/* index selector removed */}
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
                              // noop
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
              <div>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>Pricing</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `80px repeat(3, minmax(72px, 1fr))`,
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Increment</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].incrementUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "increments", tempUnit: pricing[k].incrementUnit, tempKey: mappingKeys[k]?.inputKey || getFirstScenarioInputKey(k) || "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price var</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].priceUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "priceVar", tempUnit: pricing[k].priceUnit, tempKey: mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price fix</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].priceUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "priceFix", tempUnit: pricing[k].priceUnit, tempKey: mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "" })} />
                  </div>

                  {(() => {
                    const rowCount = Math.max(
                      pricing[k].increments.length,
                      pricing[k].priceVar.length,
                      pricing[k].priceFix.length
                    );
                    return Array.from({ length: rowCount }).map((_, idx) => {
                      const incVal = pricing[k].increments[idx] ?? 0;
                      const priceVarVal = pricing[k].priceVar[idx] ?? 0;
                      const priceFixVal = pricing[k].priceFix[idx] ?? 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[k]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(k, idx, e.target.checked)}
                            />
                            <span>#{idx + 1}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextIncs = current.increments.slice();
                                  while (nextIncs.length <= idx) nextIncs.push(0);
                                  nextIncs[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, increments: nextIncs } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? incVal);
                                updateVariantPricingInJson(k, undefined, idx, value);
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextPrices = current.priceVar.slice();
                                  while (nextPrices.length <= idx) nextPrices.push(0);
                                  nextPrices[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? priceVarVal);
                                try {
                                  let parsed: any = [];
                                  try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                                  const runs: any[] = Array.isArray(parsed) ? parsed : [];
                                  const v = editorVariants[k];
                                  const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
                                  let entry = runs.find((r) => r && r.elements_variant === variantPath);
                                  if (!entry) {
                                    entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                    runs.push(entry);
                                  }
                                  if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
                                  while (entry.scenarios.length <= idx) {
                                    entry.scenarios.push({ id: entry.scenarios.length + 1, input: {}, cost: {} });
                                  }
                                  const sc = entry.scenarios[idx] || ({} as any);
                                  const configuredCostKey = mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "donnee_entree.surface_paroi_opaque";
                                  if (!sc.cost || typeof sc.cost !== "object") sc.cost = {};
                                  sc.cost[configuredCostKey] = { multiply: value };
                                  entry.scenarios[idx] = sc;
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceFixVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextPrices = current.priceFix.slice();
                                  while (nextPrices.length <= idx) nextPrices.push(0);
                                  nextPrices[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, priceFix: nextPrices } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? priceFixVal);
                                updateVariantPricingInJson(k, undefined, idx, value);
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              </div>
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            setPricing((prev) => {
              const current = prev[variant];
              if (field === "increments") {
                return { ...prev, [variant]: { ...current, incrementUnit: colSettings.tempUnit || current.incrementUnit } };
              }
              return { ...prev, [variant]: { ...current, priceUnit: colSettings.tempUnit || current.priceUnit } };
            });
            setMappingKeys((prev) => {
              const current = prev[variant] || {};
              if (field === "increments") return { ...prev, [variant]: { ...current, inputKey: colSettings.tempKey || current.inputKey } };
              return { ...prev, [variant]: { ...current, costKey: colSettings.tempKey || current.costKey } };
            });
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "" });
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>
              {colSettings.field === "increments" ? "Scenario input key (index mapping)" : "Scenario cost key (index mapping)"}
            </div>
            <Input
              value={colSettings.tempKey}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempKey: e.target.value }))}
              placeholder={colSettings.variant ? (
                colSettings.field === "increments"
                  ? (getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
              ) : ""}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>Unit</div>
            <Input
              value={colSettings.tempUnit}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempUnit: e.target.value }))}
              placeholder="e.g. cm or EUR/m2"
            />
          </div>
        </Space>
      </Modal>
    </Drawer>
  );
};



```

I'll run a lint on the edited file to ensure these UI changes didn't introduce errors.

I'll quickly search for where `DpeDrawerEditor` is instantiated to ensure no explicit width overrides conflict with the new default, and adjust if needed.

I'll open the simulation app where `DpeDrawerEditor` is instantiated to ensure no width prop overrides the new 50% default, and update if needed.

I'll update the simulation app to set the drawer width to 50% explicitly and then run a lint check on that file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./amplify";
import { authorizedFetch, waitForAccessToken, getAccessToken, setBridgeAccessToken } from "./auth";
import { Hub } from "aws-amplify/utils";
import { Button, Card, Col, Flex, Input, InputNumber, Row, Select, Space, Typography, message, Spin, Collapse } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { SimulationScenariosModal } from "@acme/simulation-scenarios";
import { DpeDrawerEditor } from "@acme/dpe-editor";
import { TopMenu } from "@acme/top-menu";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { flushSync } from "react-dom";

const { Title, Paragraph } = Typography;

export const App: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>("{\n  \"items\": []\n}");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [apiDebug, setApiDebug] = useState<number | undefined>(undefined);
  const [skip, setSkip] = useState<number>(0);
  const [limit, setLimit] = useState<number>(0);
  const [numChunks, setNumChunks] = useState<number>(1);
  const [numWorkers, setNumWorkers] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [bridgeReady, setBridgeReady] = useState<boolean>(false);
  const [bridgeAuthenticated, setBridgeAuthenticated] = useState<boolean>(false);
  const hasInitFetchedRef = useRef<boolean>(false);
  const hasUserEditedRef = useRef<boolean>(false);
  const [refAdeme, setRefAdeme] = useState<string | undefined>(undefined);
  const [simulLog, setSimulLog] = useState<string | undefined>(undefined);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [resultsUrl, setResultsUrl] = useState<string | undefined>(undefined);
  const activePollAbortRef = useRef<{ cancel: () => void } | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isScenariosOpen, setIsScenariosOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  function openEditor() { setIsEditorOpen(true); }

  useEffect(() => {
    let isCancelled = false;
    // Listen to session bridge messages from auth app
    function onMessage(ev: MessageEvent) {
      try {
        const payload = ev.data;
        if (!payload || payload.type !== "cognito-session-bridge") return;
        const authOrigin = payload?.data?.authOrigin as string | undefined;
        // Optionally validate origin
        if (authOrigin && !ev.origin.startsWith(authOrigin)) {
          // origin mismatch – ignore
          return;
        }
        setBridgeReady(true);
        const isAuthenticated = Boolean(payload?.data?.isAuthenticated);
        const tokenFromBridge = (payload?.data?.accessToken as string | undefined) || undefined;
        if (tokenFromBridge) setBridgeAccessToken(tokenFromBridge);
        if (isAuthenticated) setBridgeAuthenticated(true);
        const emailFromBridge = (payload?.data?.email as string | undefined) || (payload?.data?.username as string | undefined);
        if (!isCancelled && emailFromBridge) {
          setUserEmail((prev) => prev || emailFromBridge);
        }
      } catch {}
    }
    window.addEventListener("message", onMessage);
    
    (async () => {
      try {
        const url = new URL(window.location.href);
        const ra = url.searchParams.get("ref_ademe") || undefined;
        const sim = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string | undefined) || undefined;
        if (!isCancelled) {
          setRefAdeme(ra);
          setSimulLog(sim);
        }
      } catch {}
      // Immediate cookie-based fallback for username/email
      try {
        const parts = document.cookie.split("; ").filter(Boolean);
        for (const part of parts) {
          const idx = part.indexOf("=");
          if (idx === -1) continue;
          const key = part.substring(0, idx);
          const val = part.substring(idx + 1);
          if (key.startsWith("CognitoIdentityServiceProvider.") && key.endsWith(".LastAuthUser")) {
            const raw = decodeURIComponent(val);
            if (raw && !isCancelled) {
              setUserEmail(raw);
              return; // found username from cookie; stop here
            }
          }
        }
      } catch {}

      // Fallback #2: decode idToken cookie to extract email claim
      try {
        const all = document.cookie.split("; ").filter(Boolean);
        const prefix = "CognitoIdentityServiceProvider.";
        for (const cookie of all) {
          const eq = cookie.indexOf("=");
          if (eq === -1) continue;
          const name = cookie.substring(0, eq);
          if (!name.startsWith(prefix) || !name.endsWith(".idToken")) continue;
          const raw = decodeURIComponent(cookie.substring(eq + 1));
          const parts = raw.split(".");
          if (parts.length >= 2) {
            const mid = parts[1]!;
            const payload = JSON.parse(atob(mid.replace(/-/g, "+").replace(/_/g, "/")));
            const emailClaim = (payload && (payload.email || payload.username)) as string | undefined;
            if (emailClaim && !isCancelled) {
              setUserEmail(emailClaim);
              break;
            }
          }
        }
      } catch {}

      try {
        // Prefer Cognito username (often the email) if available
        const { username } = await getCurrentUser();
        if (username && !isCancelled) {
          setUserEmail(username || undefined);
          return;
        }
      } catch {
        // ignore and fallback to token claim below
      }

      // Try fetching user attributes (email) when available
      try {
        const attrs = await fetchUserAttributes();
        const emailAttr = attrs?.email as string | undefined;
        if (emailAttr && !isCancelled) {
          setUserEmail(emailAttr);
          return;
        }
      } catch {
        // ignore and fallback to token claim below
      }

      try {
        const session = await fetchAuthSession();
        const emailClaim = (session as any)?.tokens?.idToken?.payload?.email as string | undefined;
        if (!isCancelled) setUserEmail(emailClaim ?? undefined);
      } catch {
        if (!isCancelled) setUserEmail(undefined);
      }
    })();
    return () => {
      isCancelled = true;
      window.removeEventListener("message", onMessage);
    };
  }, []);

  // Also try firing when bridge reports authenticated (helps cross-port first load)
  useEffect(() => {
    if (!bridgeAuthenticated || hasInitFetchedRef.current) return;
    const url = new URL(window.location.href);
    const refAdeme = url.searchParams.get("ref_ademe");
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (!refAdeme) return;

    const controller = new AbortController();
    (async () => {
      try {
        const token = await waitForAccessToken(15000, 250);
        if (!token) return;
        if (hasInitFetchedRef.current) return;
        hasInitFetchedRef.current = true;
        const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const apiUrl = new URL("/backoffice/get_redis_detail", base);
        apiUrl.searchParams.set("ref_ademe", refAdeme);
        apiUrl.searchParams.set("log", simul);
        // eslint-disable-next-line no-console
        console.debug("[simulation] calling get_redis_detail (bridge)", apiUrl.toString());
        const res = await authorizedFetch(apiUrl.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => null);
        if (data && !hasUserEditedRef.current) {
          setJsonText(JSON.stringify(data, null, 2));
        }
        // eslint-disable-next-line no-console
        console.log("get_redis_detail (bridge)", data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("get_redis_detail failed (bridge)", err);
      }
    })();
    return () => controller.abort();
  }, [bridgeAuthenticated]);

  // On init: if URL contains ?ref_ademe=..., call backoffice endpoint (Bearer included when available)
  useEffect(() => {
    if (hasInitFetchedRef.current) return;
    const url = new URL(window.location.href);
    const refAdeme = url.searchParams.get("ref_ademe");
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (!refAdeme) return;

    const controller = new AbortController();
    const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
    const apiUrl = new URL("/backoffice/get_redis_detail", base);
    apiUrl.searchParams.set("ref_ademe", refAdeme);
    apiUrl.searchParams.set("log", simul);

    async function doFetchOnce() {
      if (hasInitFetchedRef.current) return;
      hasInitFetchedRef.current = true;
      try {
        // eslint-disable-next-line no-console
        console.debug("[simulation] calling get_redis_detail", apiUrl.toString());
        const res = await authorizedFetch(apiUrl.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => null);
        if (data && !hasUserEditedRef.current) {
          setJsonText(JSON.stringify(data, null, 2));
        }
        // eslint-disable-next-line no-console
        console.log("get_redis_detail", data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("get_redis_detail failed", err);
      }
    }

    (async () => {
      try {
        // Wait for a valid access token before calling the endpoint
        const token = await waitForAccessToken(15000, 250);
        if (!token) {
          // eslint-disable-next-line no-console
          console.warn("[simulation] skipping get_redis_detail: no Cognito token available");
          return; // we'll rely on auth Hub events below if sign-in happens later
        }
        await doFetchOnce();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("get_redis_detail failed", err);
      }
    })();

    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh"){ doFetchOnce(); }
      } catch {}
    });

    // Poll as a safety net in case Hub events fired before subscribe
    const pollId = window.setInterval(async () => {
      try {
        if (hasInitFetchedRef.current) { window.clearInterval(pollId); return; }
        const token = await getAccessToken();
        if (token) {
          window.clearInterval(pollId);
          await doFetchOnce();
        }
      } catch {}
    }, 500);

    return () => {
      try { (removeHub as any)?.(); } catch {}
      try { window.clearInterval(pollId); } catch {}
      controller.abort();
    };
  }, []);

  const apiDebugOptions = useMemo(() => [
    { label: "none", value: undefined },
    { label: "1", value: 1 },
    { label: "2", value: 2 },
  ], []);

  useEffect(() => {
    return () => {
      try { activePollAbortRef.current?.cancel(); setIsPolling(false); } catch {}
    };
  }, []);

  function startPollingForResults(ref: string, log: string) {
    // cancel any previous polling
    try { activePollAbortRef.current?.cancel(); } catch {}
    let cancelled = false;
    activePollAbortRef.current = { cancel: () => { cancelled = true; setIsPolling(false); } };

    const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
    const resultsHref = `https://bo.scandpe.fr/simulation/index.html?tab=results&dpe=${encodeURIComponent(ref)}`;

    setIsPolling(true);
    const tick = async () => {
      if (cancelled) return;
      try {
        const apiUrl = new URL("/backoffice/get_redis_detail", base);
        apiUrl.searchParams.set("ref_ademe", ref);
        apiUrl.searchParams.set("log", log);
        const res = await authorizedFetch(apiUrl.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.status === "processed") {
            setResultsUrl(resultsHref);
            cancelled = true;
            setIsPolling(false);
            return;
          }
        }
      } catch {}
      if (!cancelled) {
        window.setTimeout(tick, 1000);
      }
    };
    tick();
  }

  async function handleSaveToBackoffice() {
    try {
      if (!refAdeme || !simulLog) {
        message.error("Missing ref_ademe or simul");
        setIsSaveMenuOpen(false);
        return;
      }
      const ref = `${refAdeme}-${simulLog}`;
      const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
      const apiUrl = new URL("/backoffice/redis_file_manage", base);
      setIsSaving(true);
      // eslint-disable-next-line no-console
      console.debug("[simulation] POST redis_file_manage", { url: apiUrl.toString(), ref });
      const res = await authorizedFetch(apiUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
          "x-authorization": "dperdition",
        },
        body: JSON.stringify({ ref, text: jsonText }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      message.success(`saved ${simulLog}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("redis_file_manage failed", err);
      message.error("save failed");
    } finally {
      setIsSaving(false);
      setIsSaveMenuOpen(false);
    }
  }

  async function handleSubmit() {
    try {
      const parsed = jsonText.trim() ? JSON.parse(jsonText) : {};
      const baseQuery = {
        api_debug: Boolean(apiDebug),
        skip,
        limit,
        ref_ademe: refAdeme,
      } as Record<string, unknown>;
      const query = { ...baseQuery, runs: parsed } as Record<string, unknown>;
      const lambdaUrl = (import.meta.env.VITE_SIMULATION_LAMBDA_URL as string) || "https://6vyebgqw4plhmxrewmsgh6yere0bwpos.lambda-url.eu-west-3.on.aws/";
      const body = {
        redis_db: 1,
        task: "tasks.ext_o3cl_managing.direct_scenarios",
        args: {
          ref_ademe: refAdeme,
          query,
        },
      };
      setSubmitting(true);
      try {
        // Use plain fetch to avoid adding Authorization header
        const res = await fetch(lambdaUrl, {
          method: "POST",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${txt}`);
        }
        message.success("Submitted simulation");
        if (refAdeme) {
          startPollingForResults(refAdeme, "dev_report_o3cl");
        }
      } catch (e) {
        message.error("Failed to submit");
      } finally {
        setSubmitting(false);
        // eslint-disable-next-line no-console
        console.log("simulation payload", body);
      }
    } catch (err) {
      message.error("Invalid JSON");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0b0c0f" }}>
      <TopMenu
        authLabel={userEmail || "login / sign-up"}
        authHref={(() => {
          const configured = import.meta.env.VITE_AUTH_URL as string | undefined;
          if (configured) {
            try {
              const configuredUrl = new URL(configured);
              const isConfiguredLocal = ["localhost", "127.0.0.1"].includes(configuredUrl.hostname);
              const isPageLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
              if (isConfiguredLocal && !isPageLocal) {
                // ignore local auth URL on non-localhost pages
              } else {
                // On non-local hosts, prefer explicit index.html so returnTo is added to the file URL
                if (!isConfiguredLocal) {
                  const pathname = configuredUrl.pathname || "/";
                  const endsWithHtml = /\.html$/i.test(pathname);
                  const hasTrailingSlash = /\/$/.test(pathname);
                  if (!endsWithHtml) {
                    const base = hasTrailingSlash ? configured.replace(/\/$/, "") : configured;
                    return base + "/index.html";
                  }
                }
                return configured;
              }
            } catch {
              return configured;
            }
          }
          if (window.location.hostname === "localhost") return "http://localhost:5173";
          return "/auth/index.html";
        })()}
        isAuthenticated={Boolean(userEmail)}
        centeredTitle={refAdeme}
        logoutHref={(() => {
          const domain = (import.meta.env.VITE_COGNITO_DOMAIN_URL as string | undefined)?.replace(/^https?:\/\//, "");
          if (!domain) return undefined;
          const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
          const logoutRedirect = (import.meta.env.VITE_LOGOUT_REDIRECT_URL as string | undefined) || window.location.origin;
          if (!clientId) return undefined;
          return `https://${domain}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(logoutRedirect)}`;
        })()}
      />
      {/* Invisible iframe to pull session from auth origin when on different ports */}
      {!bridgeReady && (
        <iframe
          src={(() => {
            const configured = import.meta.env.VITE_AUTH_URL as string | undefined;
            if (configured) {
              try {
                const configuredUrl = new URL(configured);
                const isConfiguredLocal = ["localhost", "127.0.0.1"].includes(configuredUrl.hostname);
                const isPageLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
                if (!(isConfiguredLocal && !isPageLocal)) {
                  const pathname = configuredUrl.pathname || "/";
                  const endsWithHtml = /\.html$/i.test(pathname);
                  const hasTrailingSlash = /\/$/.test(pathname);
                  const base = endsWithHtml ? configured : (hasTrailingSlash ? configured.replace(/\/$/, "") + "/index.html" : configured + "/index.html");
                  return base;
                }
              } catch {
                return configured.replace(/\/$/, "") + "/index.html";
              }
            }
            if (window.location.hostname === "localhost") return "http://localhost:5173/index.html";
            return "/auth/index.html";
          })()}
          style={{ display: "none" }}
          title="session-bridge"
        />
      )}
      <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={0} lg={4}></Col>
        <Col xs={24} lg={16}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Simulation</Title>
            <Button type="primary" size="large" onClick={openEditor}>Edit</Button>
          </div>
          <Paragraph style={{ color: "#4b5563", marginTop: 4 }}>Provide JSON and configure options, then submit.</Paragraph>
          
          <Card style={{ background: "#ffffff", borderColor: "#e5e7eb" }} styles={{ body: { padding: 16 } }}>
            <div style={{ display: "grid" }}>
              <textarea
                ref={textAreaRef}
                value={jsonText}
                onChange={(e) => { hasUserEditedRef.current = true; setJsonText(e.target.value); }}
                placeholder="Paste or write JSON here"
                style={{
                  minHeight: 420,
                  width: "100%",
                  background: isEditorOpen ? "#f3f4f6" : "#ffffff",
                  color: isEditorOpen ? "#6b7280" : "#111827",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
                  fontSize: 14,
                  lineHeight: 1.45,
                  resize: "vertical",
                  cursor: isEditorOpen ? "default" : "text",
                  overflow: "auto",
                }}
                readOnly={isEditorOpen}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <Collapse
                destroyOnHidden
                items={[
                  {
                    key: "options",
                    label: "Options",
                    children: (
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>api_debug</div>
                          <Select
                            value={apiDebug as number | undefined}
                            onChange={(v) => setApiDebug(v)}
                            allowClear
                            placeholder="none"
                            options={apiDebugOptions}
                            style={{ width: "100%" }}
                          />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>skip</div>
                          <InputNumber value={skip} onChange={(v) => setSkip(Number(v ?? 0))} style={{ width: "100%" }} min={0} />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>limit</div>
                          <InputNumber value={limit} onChange={(v) => setLimit(Number(v ?? 0))} style={{ width: "100%" }} min={0} />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>nb chunks</div>
                          <InputNumber value={numChunks} onChange={(v) => setNumChunks(Number(v ?? 1))} style={{ width: "100%" }} min={1} />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>nb workers</div>
                          <InputNumber value={numWorkers} onChange={(v) => setNumWorkers(Number(v ?? 1))} style={{ width: "100%" }} min={1} />
                        </div>
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                <Button type="primary" onClick={handleSubmit} loading={submitting}>submit</Button>
                <div style={{ position: "relative" }}>
                  <Button onClick={() => setIsSaveMenuOpen((v) => !v)}>...</Button>
                  {isSaveMenuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, width: 260, boxShadow: "0 4px 14px rgba(0,0,0,0.08)", zIndex: 10 }}>
                    <div style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6 }} onClick={() => { setIsScenariosOpen(true); setIsSaveMenuOpen(false); }}>load scenario</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={() => { if (!isSaving) handleSaveToBackoffice(); }}>save {simulLog || "default"}</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={async () => {
                      if (isSaving) return;
                      const name = window.prompt("Save as name:", simulLog || "custom");
                      if (!name) { setIsSaveMenuOpen(false); return; }
                      try {
                        const ref = `${refAdeme || "unknown"}-${name}`;
                        const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
                        const apiUrl = new URL("/backoffice/redis_file_manage", base);
                        setIsSaving(true);
                        // eslint-disable-next-line no-console
                        console.debug("[simulation] POST redis_file_manage (save as)", { url: apiUrl.toString(), ref });
                        const res = await authorizedFetch(apiUrl.toString(), {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json, text/plain, */*",
                            "x-authorization": "dperdition",
                          },
                          body: JSON.stringify({ ref, text: jsonText }),
                        });
                        if (!res.ok) {
                          const txt = await res.text().catch(() => "");
                          throw new Error(`HTTP ${res.status} ${txt}`);
                        }
                        message.success(`saved ${name}`);
                      } catch {
                        message.error("save failed");
                      } finally {
                        setIsSaving(false);
                        setIsSaveMenuOpen(false);
                      }
                    }}>save as…</div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", minHeight: 24 }}>
                {!resultsUrl && isPolling && (
                  <Spin size="small" />
                )}
                {resultsUrl && (
                  <a href={resultsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Open simulation results <ExportOutlined />
                  </a>
                )}
              </div>
              <DpeDrawerEditor
                open={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                width="50%"
                rootJsonText={jsonText}
                onApply={(next) => { hasUserEditedRef.current = true; flushSync(() => setJsonText(next)); }}
                apiLoadParams={refAdeme ? { baseUrl: (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr", ref_ademe: refAdeme } : undefined}
                getAccessToken={getAccessToken}
                onLoadedFromApi={(data) => {
                  try {
                    const text = JSON.stringify(data, null, 2);
                    setJsonText((prev) => (prev?.trim() ? prev : text));
                  } catch {}
                }}
                onHighlightJsonPath={({ collection, itemKey, indices }) => {
                  try {
                    const ta = textAreaRef.current;
                    if (!ta) return;
                    const text = ta.value;
                    // New highlight strategy: target the runs entry with elements_variant, then the elements_scope array
                    const variantPath = `dpe.logement.enveloppe.${collection}.${itemKey}`;
                    const variantKeyIdx = text.indexOf('"elements_variant"');
                    let searchFrom = 0;
                    let entryStart = -1;
                    let scopeArrayStart = -1;
                    let scopeArrayEnd = -1;
                    // Scan for the entry containing the variantPath
                    while (true) {
                      const varIdx = text.indexOf('"elements_variant"', searchFrom);
                      if (varIdx === -1) break;
                      const quoteIdx = text.indexOf('"', varIdx + 18);
                      const quoteEnd = quoteIdx !== -1 ? text.indexOf('"', quoteIdx + 1) : -1;
                      const value = quoteIdx !== -1 && quoteEnd !== -1 ? text.slice(quoteIdx + 1, quoteEnd) : '';
                      if (value === variantPath) {
                        // Backtrack to entry start '{'
                        let i = varIdx;
                        while (i >= 0 && text[i] !== '{') i--;
                        entryStart = i >= 0 ? i : varIdx;
                        // Find elements_scope within this entry
                        const scopeKeyIdx = text.indexOf('"elements_scope"', varIdx);
                        if (scopeKeyIdx !== -1) {
                          const openBracket = text.indexOf('[', scopeKeyIdx);
                          if (openBracket !== -1) {
                            scopeArrayStart = openBracket;
                            // find matching closing bracket (not perfect but ok for flat arrays)
                            const closeBracket = text.indexOf(']', openBracket);
                            if (closeBracket !== -1) scopeArrayEnd = closeBracket + 1;
                          }
                        }
                        break;
                      }
                      searchFrom = varIdx + 1;
                    }
                    if (scopeArrayStart === -1 || scopeArrayEnd === -1) return;
                    const prevSelStart = ta.selectionStart;
                    const prevSelEnd = ta.selectionEnd;
                    const prevScrollTop = ta.scrollTop;
                    const prevScrollLeft = ta.scrollLeft;
                    try {
                      // Avoid scrolling when focusing for selection highlight
                      (ta as any).focus({ preventScroll: true });
                    } catch {
                      try { ta.focus(); } catch {}
                    }
                    try {
                      ta.setSelectionRange(scopeArrayStart, scopeArrayEnd);
                    } catch {}
                    // Immediately restore scroll so the viewport doesn't jump
                    try {
                      ta.scrollTop = prevScrollTop;
                      ta.scrollLeft = prevScrollLeft;
                    } catch {}
                    window.setTimeout(() => {
                      try {
                        // Restore previous selection and scroll position without jumping
                        (ta as any).focus({ preventScroll: true });
                        ta.setSelectionRange(prevSelStart, prevSelEnd);
                        ta.scrollTop = prevScrollTop;
                        ta.scrollLeft = prevScrollLeft;
                      } catch {}
                    }, 600);
                  } catch {}
                }}
              />
            </div>
            <SimulationScenariosModal
              open={isScenariosOpen}
              onCancel={() => setIsScenariosOpen(false)}
              onLoad={(runs) => {
                try {
                  setJsonText(JSON.stringify(runs, null, 2));
                } catch {
                  // fallback to empty array
                  setJsonText(JSON.stringify([], null, 2));
                }
                setIsScenariosOpen(false);
              }}
            />
          </Card>
        </Col>
        <Col xs={0} lg={4}></Col>

      </Row>
      </div>
    </div>
  );
};



```

I'll update the OK button to apply changes and close the drawer (keeping the X button behavior to confirm and discard), then lint the file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
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

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantKey, { key: string; description: string; selected: boolean; payload: any }[]>>({ haut: [], bas: [] });
  const [highlighted, setHighlighted] = useState<Record<VariantKey, Record<string, boolean>>>({ haut: {}, bas: {} });
  const [pricing, setPricing] = useState<Record<VariantKey, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({
    haut: { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" },
    bas: { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" },
  });

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantKey | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantKey, { inputKey?: string; costKey?: string }>>({ haut: {}, bas: {} });
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantKey, boolean[]>>({ haut: [], bas: [] });
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

  // Capture original JSON when opening, used to rollback on close (X)
  useEffect(() => {
    if (open) {
      originalJsonRef.current = rootJsonText;
    }
  }, [open]);

  // (no-op)

  const initialState = useMemo((): Record<VariantKey, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      const root = rootRaw && typeof rootRaw === "object" && !Array.isArray(rootRaw) ? rootRaw : {};
      const defaultState: Record<VariantKey, EditorVariantState> = { haut: { enabled: false, index: 0, text: "{\n}\n" }, bas: { enabled: false, index: 0, text: "{\n}\n" } };
      const next: Record<VariantKey, EditorVariantState> = { ...defaultState };
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        let enabled = false;
        let index = 0;
        let text = "{\n}\n";

        // Shape A: dpe.logement.enveloppe.<collection>.<itemKey> is an array of items
        const baseObj = deepGet(root, v.base as unknown as string[]) || {};
        const collectionObj = baseObj?.[v.collection];
        const nestedArr = Array.isArray(collectionObj?.[v.itemKey]) ? (collectionObj[v.itemKey] as any[]) : undefined;
        if (nestedArr && nestedArr.length > 0) {
          const first = nestedArr[0];
          if (first && typeof first === "object") {
            enabled = true;
            index = 0;
            text = JSON.stringify(first, null, 2) + "\n";
          }
        } else {
          // Shape B: dpe.logement.enveloppe.<collection> is an array of items that may contain { <itemKey>: {...} }
          const arr = Array.isArray(collectionObj) ? (collectionObj as any[]) : undefined;
          if (arr && arr.length > 0) {
            const foundIndex = arr.findIndex((slot) => slot && typeof slot === "object" && slot[v.itemKey] != null);
            if (foundIndex !== -1) {
              const value = arr[foundIndex][v.itemKey];
              if (value != null) {
                enabled = true;
                index = foundIndex;
                text = JSON.stringify(value, null, 2) + "\n";
              }
            }
          }
        }

        // Shape C: root is actually a runs[] array with an entry for this variant
        if (!enabled) {
          const runs = Array.isArray(rootRaw) ? (rootRaw as any[]) : [];
          const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
          const entry = runs.find((r) => r && r.elements_variant === variantPath);
          if (entry) {
            enabled = true;
            index = 0;
            text = "{\n}\n";
          }
        }

        next[k] = { enabled, index, text };
      });
      return next;
    } catch {
      return { haut: { enabled: false, index: 0, text: "{\n}\n" }, bas: { enabled: false, index: 0, text: "{\n}\n" } };
    }
  }, [rootJsonText]);

  const [editorState, setEditorState] = useState<Record<VariantKey, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

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

  function handleDrawerClose() {
    Modal.confirm({
      title: "Discard changes?",
      content: "Closing will revert any changes made in this panel.",
      okText: "Discard",
      cancelText: "Cancel",
      onOk: () => {
        try {
          onApply(originalJsonRef.current);
        } finally {
          onClose();
        }
      },
    });
  }

  function getFirstScenarioInputKey(variantKey: VariantKey): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const inputObj = firstScenario?.input || firstScenario?.inputs || undefined;
      if (inputObj && typeof inputObj === "object") {
        const keys = Object.keys(inputObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getFirstScenarioCostKey(variantKey: VariantKey): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const costObj = firstScenario?.cost || undefined;
      if (costObj && typeof costObj === "object") {
        const keys = Object.keys(costObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function deriveVariantPricing(variantKey: VariantKey): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantKey]?.inputKey || getFirstScenarioInputKey(variantKey) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantKey]?.costKey || getFirstScenarioCostKey(variantKey) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Sync pricing grid from JSON scenarios when opening or when JSON/mapping keys change
  useEffect(() => {
    if (!open) return;
    try {
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const derived = deriveVariantPricing(k);
        setPricing((prev) => {
          const current = prev[k];
          const nextLen = derived.increments.length || current.increments.length || 0;
          const ensureLen = (arr: number[], len: number) => {
            const out = arr.slice(0, len);
            while (out.length < len) out.push(0);
            return out;
          };
        
          const nextIncrements = derived.increments.length ? derived.increments : current.increments;
          const nextPriceVar = derived.priceVar.length ? derived.priceVar : current.priceVar;
          const nextPriceFix = ensureLen(current.priceFix, Math.max(nextLen, nextPriceVar.length));
          return {
            ...prev,
            [k]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      });
    } catch {}
  }, [open, rootJsonText, mappingKeys]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [k]: flags }));
      });
    } catch {}
  }, [open, rootJsonText]);

  function toggleScenarioPresence(variantKey: VariantKey, idx: number, enabled: boolean) {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      let entry = runs.find((r) => r && r.elements_variant === variantPath);
      if (!entry) {
        entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
        runs.push(entry);
      }
      if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
      while (entry.scenarios.length <= idx) entry.scenarios.push(null);
      if (enabled) {
        const current = entry.scenarios[idx];
        entry.scenarios[idx] = current && typeof current === "object" ? current : { id: idx + 1, input: {}, cost: {} };
      } else {
        entry.scenarios[idx] = null;
      }
      onApply(JSON.stringify(runs, null, 2));
      setScenarioEnabled((prev) => {
        const current = prev[variantKey] ? prev[variantKey].slice() : [];
        while (current.length <= idx) current.push(false);
        current[idx] = enabled;
        return { ...prev, [variantKey]: current };
      });
    } catch {}
  }

  function updateVariantPricingInJson(
    variantKey: VariantKey,
    _override?: { increments?: number[]; priceVar?: number[]; priceFix?: number[]; incrementUnit?: string; priceUnit?: string },
    updateScenarioIndex?: number,
    scenarioValue?: number
  ) {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      let entry = runs.find((r) => r && r.elements_variant === variantPath);
      if (!entry) {
        entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
        runs.push(entry);
      }
      // Ensure any previous pricing block is removed from JSON – UI-only feature
      if (entry.pricing) {
        try { delete entry.pricing; } catch {}
      }

      if (typeof updateScenarioIndex === "number") {
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        while (entry.scenarios.length <= updateScenarioIndex) {
          entry.scenarios.push({ id: entry.scenarios.length + 1, input: {} });
        }
        const sc = entry.scenarios[updateScenarioIndex] || ({} as any);
        const key = mappingKeys[variantKey]?.inputKey || getFirstScenarioInputKey(variantKey) || "donnee_entree.epaisseur_isolation";
        if (!sc.input || typeof sc.input !== "object") sc.input = {};
        const fallbackVal = (() => {
          try { return pricing[variantKey].increments[updateScenarioIndex]; } catch { return scenarioValue; }
        })();
        sc.input[key] = { set: typeof scenarioValue === "number" ? scenarioValue : fallbackVal };
        entry.scenarios[updateScenarioIndex] = sc;
      }

      onApply(JSON.stringify(runs, null, 2));
    } catch {
      // ignore
    }
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="right"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>OK</Button>
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
              {/* index selector removed */}
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
                              // noop
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
              <div>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>Pricing</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `80px repeat(3, minmax(72px, 1fr))`,
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Increment</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].incrementUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "increments", tempUnit: pricing[k].incrementUnit, tempKey: mappingKeys[k]?.inputKey || getFirstScenarioInputKey(k) || "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price var</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].priceUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "priceVar", tempUnit: pricing[k].priceUnit, tempKey: mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price fix</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].priceUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "priceFix", tempUnit: pricing[k].priceUnit, tempKey: mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "" })} />
                  </div>

                  {(() => {
                    const rowCount = Math.max(
                      pricing[k].increments.length,
                      pricing[k].priceVar.length,
                      pricing[k].priceFix.length
                    );
                    return Array.from({ length: rowCount }).map((_, idx) => {
                      const incVal = pricing[k].increments[idx] ?? 0;
                      const priceVarVal = pricing[k].priceVar[idx] ?? 0;
                      const priceFixVal = pricing[k].priceFix[idx] ?? 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[k]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(k, idx, e.target.checked)}
                            />
                            <span>#{idx + 1}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextIncs = current.increments.slice();
                                  while (nextIncs.length <= idx) nextIncs.push(0);
                                  nextIncs[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, increments: nextIncs } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? incVal);
                                updateVariantPricingInJson(k, undefined, idx, value);
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextPrices = current.priceVar.slice();
                                  while (nextPrices.length <= idx) nextPrices.push(0);
                                  nextPrices[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? priceVarVal);
                                try {
                                  let parsed: any = [];
                                  try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                                  const runs: any[] = Array.isArray(parsed) ? parsed : [];
                                  const v = editorVariants[k];
                                  const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
                                  let entry = runs.find((r) => r && r.elements_variant === variantPath);
                                  if (!entry) {
                                    entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                    runs.push(entry);
                                  }
                                  if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
                                  while (entry.scenarios.length <= idx) {
                                    entry.scenarios.push({ id: entry.scenarios.length + 1, input: {}, cost: {} });
                                  }
                                  const sc = entry.scenarios[idx] || ({} as any);
                                  const configuredCostKey = mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "donnee_entree.surface_paroi_opaque";
                                  if (!sc.cost || typeof sc.cost !== "object") sc.cost = {};
                                  sc.cost[configuredCostKey] = { multiply: value };
                                  entry.scenarios[idx] = sc;
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceFixVal}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextPrices = current.priceFix.slice();
                                  while (nextPrices.length <= idx) nextPrices.push(0);
                                  nextPrices[idx] = nextVal;
                                  return { ...prev, [k]: { ...current, priceFix: nextPrices } };
                                });
                              }}
                              onBlur={(e) => {
                                const value = Number((e?.target as HTMLInputElement)?.value ?? priceFixVal);
                                updateVariantPricingInJson(k, undefined, idx, value);
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              </div>
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            setPricing((prev) => {
              const current = prev[variant];
              if (field === "increments") {
                return { ...prev, [variant]: { ...current, incrementUnit: colSettings.tempUnit || current.incrementUnit } };
              }
              return { ...prev, [variant]: { ...current, priceUnit: colSettings.tempUnit || current.priceUnit } };
            });
            setMappingKeys((prev) => {
              const current = prev[variant] || {};
              if (field === "increments") return { ...prev, [variant]: { ...current, inputKey: colSettings.tempKey || current.inputKey } };
              return { ...prev, [variant]: { ...current, costKey: colSettings.tempKey || current.costKey } };
            });
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "" });
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>
              {colSettings.field === "increments" ? "Scenario input key (index mapping)" : "Scenario cost key (index mapping)"}
            </div>
            <Input
              value={colSettings.tempKey}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempKey: e.target.value }))}
              placeholder={colSettings.variant ? (
                colSettings.field === "increments"
                  ? (getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
              ) : ""}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>Unit</div>
            <Input
              value={colSettings.tempUnit}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempUnit: e.target.value }))}
              placeholder="e.g. cm or EUR/m2"
            />
          </div>
        </Space>
      </Modal>
    </Drawer>
  );
};



```

- I set the drawer to 50% width by default and updated its usage in `apps/simul/src/App.tsx` to `width="50%"`.
- Replaced the footer actions with a single OK button that applies changes and closes the drawer. Removed the Close button.
- The X (close icon) now prompts for confirmation; on confirm it reverts the JSON to the snapshot taken when the drawer opened, cancelling any panel changes.
- Lint checks passed.

- Updated files:
  - `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx`
  - `apps/simul/src/App.tsx`

