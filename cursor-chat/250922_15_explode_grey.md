# Add explode switch to API options
_Exported on 22/09/2025 at 23:22:43 CEST from Cursor (1.5.5)_

---

**User**

between "Options from API" and "Pricing" add a switch "explode" off by default (means "all") and linked to scope_strategy in JSON

---

**Cursor**

I'll search the codebase for the UI that contains "Options from API" and "Pricing" to place the new "explode" switch and find where `scope_strategy` is handled in JSON.

I'll look for how `scope_strategy` is used elsewhere to decide the value when "explode" is on, then add the switch UI in `DpeDrawerEditor.tsx` between the existing "Options from API" and the "Pricing" section, wiring it to update the JSON.

I'll open `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx` to locate the "Pricing" section and add the "explode" switch UI between "Options from API" and "Pricing", wiring it to `scope_strategy`.

I’m going to add an "explode" switch between the "Options from API" and "Pricing" sections in `DpeDrawerEditor.tsx`, backed by a new `scopeStrategy` state synced from `rootJsonText`, and wire it to update `scope_strategy` in the runs JSON. Then I’ll run a quick lint check on the edited file.

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
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantKey, "all" | "explode">>({ haut: "all", bas: "all" });
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

  // Sync scope strategy from JSON (default to "all")
  useEffect(() => {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const next: Record<VariantKey, "all" | "explode"> = { haut: "all", bas: "all" };
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        next[k] = entry?.scope_strategy === "explode" ? "explode" : "all";
      });
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText]);

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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 500 }}>explode</div>
                <Switch
                  checked={scopeStrategy[k] === "explode"}
                  onChange={(checked) => {
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
                      entry.scope_strategy = checked ? "explode" : "all";
                      onApply(JSON.stringify(runs, null, 2));
                      setScopeStrategy((prev) => ({ ...prev, [k]: entry.scope_strategy }));
                    } catch {
                      message.error("Failed to update scope strategy");
                    }
                  }}
                />
              </div>
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

- I added the "explode" switch between "Options from API" and "Pricing" in `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx`, defaulting to off and mapping to `scope_strategy` as "all" when off and "explode" when on. It syncs from the current JSON and writes back immediately on toggle.

- Key edit: new `scopeStrategy` state synced from `rootJsonText`; switch updates runs entry for the current variant.

- Lint: no errors.

Would you like the switch label capitalized or any tooltip explaining "explode" (apply each selected scope separately)?

---

**User**

can put "explode" title stick to the switch

---

**Cursor**

I'll update the layout so the "explode" label sits next to the switch by removing the space-between justification in that row. Then I'll lint the file.

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
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantKey, "all" | "explode">>({ haut: "all", bas: "all" });
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

  // Sync scope strategy from JSON (default to "all")
  useEffect(() => {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const next: Record<VariantKey, "all" | "explode"> = { haut: "all", bas: "all" };
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        next[k] = entry?.scope_strategy === "explode" ? "explode" : "all";
      });
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText]);

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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 500 }}>explode</div>
                <Switch
                  checked={scopeStrategy[k] === "explode"}
                  onChange={(checked) => {
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
                      entry.scope_strategy = checked ? "explode" : "all";
                      onApply(JSON.stringify(runs, null, 2));
                      setScopeStrategy((prev) => ({ ...prev, [k]: entry.scope_strategy }));
                    } catch {
                      message.error("Failed to update scope strategy");
                    }
                  }}
                />
              </div>
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

Done. The "explode" label now sits next to the switch in `DpeDrawerEditor.tsx`. No lint issues.

---

**User**

and both (switch/title) stick to the right as others

---

**Cursor**

I'll align the "explode" label and switch to the right by adding justifyContent: "flex-end" to that row, then check lint.

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
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantKey, "all" | "explode">>({ haut: "all", bas: "all" });
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

  // Sync scope strategy from JSON (default to "all")
  useEffect(() => {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const next: Record<VariantKey, "all" | "explode"> = { haut: "all", bas: "all" };
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        next[k] = entry?.scope_strategy === "explode" ? "explode" : "all";
      });
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText]);

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
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                <div style={{ fontWeight: 500 }}>explode</div>
                <Switch
                  checked={scopeStrategy[k] === "explode"}
                  onChange={(checked) => {
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
                      entry.scope_strategy = checked ? "explode" : "all";
                      onApply(JSON.stringify(runs, null, 2));
                      setScopeStrategy((prev) => ({ ...prev, [k]: entry.scope_strategy }));
                    } catch {
                      message.error("Failed to update scope strategy");
                    }
                  }}
                />
              </div>
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

Aligned. The "explode" label and switch are right-aligned like the others in `DpeDrawerEditor.tsx`. No lint issues.

---

**User**

if an element is disabled, make its card a bit grey

---

**Cursor**

I'll make the Card background slightly grey when its `enabled` switch is off by adding a conditional `style` to the Card, then check lint.

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
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantKey, "all" | "explode">>({ haut: "all", bas: "all" });
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

  // Sync scope strategy from JSON (default to "all")
  useEffect(() => {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const next: Record<VariantKey, "all" | "explode"> = { haut: "all", bas: "all" };
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const v = editorVariants[k];
        const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        next[k] = entry?.scope_strategy === "explode" ? "explode" : "all";
      });
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText]);

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
            <Card key={k} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                <div style={{ fontWeight: 500 }}>explode</div>
                <Switch
                  checked={scopeStrategy[k] === "explode"}
                  onChange={(checked) => {
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
                      entry.scope_strategy = checked ? "explode" : "all";
                      onApply(JSON.stringify(runs, null, 2));
                      setScopeStrategy((prev) => ({ ...prev, [k]: entry.scope_strategy }));
                    } catch {
                      message.error("Failed to update scope strategy");
                    }
                  }}
                />
              </div>
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

Done. When the element is disabled, its Card now uses a light grey background in `DpeDrawerEditor.tsx`. No lint issues.

