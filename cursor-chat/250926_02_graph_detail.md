# Add first scenario with checkbox settings
_Exported on 26/09/2025 at 12:00:33 CEST from Cursor (1.5.5)_

---

**User**

on the left panel , for scenarios add systematically a 1st scenario with checkbox always checked id #current price always zero, and value is the one of dpe_full corresponding to path 
dpe.logement.enveloppe.plancher_haut_collection.plancher_haut
+ Scenario input key (index mapping) (ex. donnee_entree.epaisseur_isolation) if all same among selected scope items, else the range
ex. 14-18 (depending on min/max of scope items)

---

**Cursor**

I'll scan the codebase to locate the left panel scenarios UI and the data structures (`dpe_full`, `donnee_entree`, `plancher_haut_collection`) so I can add the default scenario and show the index key or range. Then I'll implement the changes.

I'll open the left panel editor component to see how scenarios are rendered so I can add the default first row and compute its values from dpe_full.

I'll add a "current" scenario row at the top of each variant's Scenarios grid in `DpeDrawerEditor.tsx`, showing a disabled, always-checked checkbox labeled #current, a read-only value derived from `envelopeData` at the configured input key across the selected scope (single value if all equal, or min-max range), and a disabled price set to 0. Then I'll run a quick lint check on the edited file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

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
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);
  // Keep a copy of the fetched envelope to derive options when variants appear
  const [envelopeData, setEnvelopeData] = useState<any | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Store envelope for later option derivation (after variant defs resolve)
            try {
              const env = (data as any)?.dpe?.logement?.enveloppe || null;
              setEnvelopeData(env);
            } catch {}
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Rebuild available options whenever variants resolve and we have envelope data, also sync selected from JSON
  useEffect(() => {
    try {
      if (!envelopeData) return;
      const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
        const collectionObj = envelopeData?.[v.collection];
        let items: any[] = [];
        if (Array.isArray(collectionObj?.[v.itemKey])) {
          items = collectionObj[v.itemKey] as any[];
        } else if (Array.isArray(collectionObj)) {
          items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
        }
        optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
          key: String(item?.donnee_entree?.reference || idx),
          description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
          selected: scopes.includes(idx),
          payload: item,
        }));
      }
      setAvailableOptions(optionsMap);
    } catch {}
  }, [envelopeData, variantDefs]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

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
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
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

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
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

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
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
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] } as any;
                              // Default scope to all available options for this variant when enabling
                              try {
                                const opts = availableOptions[v.id] || [];
                                entry.elements_scope = opts.map((_, i) => i);
                              } catch {}
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
                            } else {
                              const entry = runs[idxInRuns];
                              if (!Array.isArray(entry.elements_scope) || entry.elements_scope.length === 0) {
                                try {
                                  const opts = availableOptions[v.id] || [];
                                  entry.elements_scope = opts.map((_: any, i: number) => i);
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
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
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
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
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {/* Row 0: always-present current scenario derived from envelopeData */}
                  {(() => {
                    try {
                      // Determine configured input key to read from envelope items
                      const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
                      const inputPath = String(configuredInputKey || "").split(".").filter(Boolean);
                      // Determine current scopes for this variant
                      let parsed: any = [];
                      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                      const runsArr: any[] = Array.isArray(parsed) ? parsed : [];
                      const entry = runsArr.find((r) => r && r.elements_variant === v.id) || {};
                      let scopes: number[] = Array.isArray(entry.elements_scope) ? (entry.elements_scope as number[]) : [];
                      if (!scopes.length) {
                        // Fallback to UI options selection if JSON has no scopes
                        scopes = (availableOptions[v.id] || []).map((o, idx) => (o.selected ? idx : -1)).filter((n) => n !== -1);
                      }
                      // Collect values from envelope items for selected scopes
                      const collectionObj = envelopeData?.[v.collection];
                      let items: any[] = [];
                      if (Array.isArray(collectionObj?.[v.itemKey])) {
                        items = collectionObj[v.itemKey] as any[];
                      } else if (Array.isArray(collectionObj)) {
                        items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
                      }
                      const nums: number[] = scopes
                        .map((idx) => {
                          const item = items?.[idx];
                          const val = inputPath.length ? deepGet(item, inputPath as any) : undefined;
                          const num = typeof val === "number" ? val : Number(val);
                          return Number.isFinite(num) ? num : NaN;
                        })
                        .filter((n) => Number.isFinite(n)) as number[];
                      let displayVal: string = "—";
                      if (nums.length) {
                        const min = Math.min(...nums);
                        const max = Math.max(...nums);
                        displayVal = min === max ? String(min) : `${min}-${max}`;
                      }
                      return (
                        <>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 12 }}>
                            <Checkbox checked disabled />
                            <span>#current</span>
                          </label>
                          <div style={{ fontSize: 12, color: "#374151" }}>
                            {displayVal}
                          </div>
                          <div>
                            <InputNumber size="small" controls={false} min={0} value={0} disabled style={{ width: "100%" }} />
                          </div>
                        </>
                      );
                    } catch {
                      return null;
                    }
                  })()}

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
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
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
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
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

I added the #current row logic and now I'll check for linter errors in the edited file.

I added the “#current” scenario row to the left panel.

- Always-visible first row with a disabled, checked checkbox labeled “#current”
- Value is derived from `dpe_full` envelope items at the configured Scenario input key per selected scope:
  - If all scope items share the same value: shows that value
  - Otherwise: shows “min-max” range (e.g., 14-18)
- Price is always 0 and disabled
- Works across variants by reading from `envelopeData` at `dpe.logement.enveloppe.{collection}.{itemKey}` + the Scenario input key (e.g., `donnee_entree.epaisseur_isolation`)

No linter errors.

- Edited: `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx`

---

**User**

when calling @https://api-dev.etiquettedpe.fr/backoffice/simulation_graph_detail?ref_ademe=2508E0243162W&run_name=dev_simul_test0003&id=2508E0243162W%3Adev_simul_test0003-19_o3cl_report_2508E0243162W-9 

I receive object like that
please display "redis_obj" as a json view in details under

{
    "graph_id": "2508E0243162W-9",
    "_parts": [
        "2508E0243162W:dev_simul_test0003",
        "19_o3cl_report_2508E0243162W",
        "9"
    ],
    "simul_name": "dev_simul_test0003",
    "simul_path": "2508E0243162W:dev_simul_test0003-19_o3cl_report",
    "simul_part": "dev_simul_test0003-19-19",
    "id": "2508E0243162W:dev_simul_test0003-19_o3cl_report_2508E0243162W-9",
    "redis_obj": "{\"status\": \"processed\", \"data\": {\"result\": [{\"id\": \"2508E0243162W-0\", \"modifierId\": [{\"path\": \"dpe.logement.enveloppe.plancher_haut_collection.plancher_haut\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.plancher_bas_collection.plancher_bas\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.mur_collection.mur\", \"seq\": [-1, 202, 203, 203, 202]}], \"lastResult\": {\"inputs\": [{}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 10}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 10}], \"result\": {\"deperdition\": {\"hvent\": 86.43480000000001, \"hperm\": 43.1856679149934, \"deperdition_renouvellement_air\": 129.6204679149934, \"deperdition_mur\": 35.23014740576275, \"deperdition_plancher_bas\": 39.1868891790545, \"deperdition_plancher_haut\": 11.532507407407408, \"deperdition_baie_vitree\": 57.291000000000004, \"deperdition_porte\": 15.264, \"deperdition_pont_thermique\": 54.56699999999999, \"deperdition_enveloppe\": 342.6920119072181}, \"apport_et_besoin\": {\"nadeq\": 2.08, \"v40_ecs_journalier\": 116.48, \"v40_ecs_journalier_depensier\": 164.32, \"surface_sud_equivalente\": 79.49305220000001, \"besoin_ecs\": 1380.4280788480005, \"besoin_ecs_depensier\": 1947.3896112320003, \"apport_interne_ch\": 3003947.3828571434, \"apport_interne_fr\": 98157.46285714286, \"apport_solaire_ch\": 2821998.025798, \"apport_solaire_fr\": 540464.3709780001, \"besoin_fr\": 748.2103492935356, \"besoin_fr_depensier\": 1974.6720011367859, \"besoin_ch\": 15046.233860622011, \"besoin_ch_depensier\": 18616.191474532407, \"pertes_distribution_ecs_recup\": 41.43553433385943, \"pertes_distribution_ecs_recup_depensier\": 60.075635678006364, \"pertes_stockage_ecs_recup\": 127.66111298630136, \"pertes_generateur_ch_recup\": 0, \"pertes_generateur_ch_recup_depensier\": 0, \"fraction_apport_gratuit_ch\": 0.2611165686906057, \"fraction_apport_gratuit_depensier_ch\": 0.22939620035729802}, \"confort_ete\": {\"inertie_lourde\": 1, \"aspect_traversant\": 1, \"isolation_toiture\": 1, \"protection_solaire_exterieure\": 0, \"brasseur_air\": 0, \"enum_indicateur_confort_ete_id\": \"1\"}, \"qualite_isolation\": {\"ubat\": 0.648185519567488, \"qualite_isol_enveloppe\": 2, \"qualite_isol_mur\": 1, \"qualite_isol_plancher_bas\": 4, \"qualite_isol_menuiserie\": 4, \"qualite_isol_plancher_haut_comble_perdu\": 2}, \"production_electricite\": {\"production_pv\": 0, \"conso_elec_ac\": 0, \"conso_elec_ac_ch\": 0, \"conso_elec_ac_ecs\": 0, \"conso_elec_ac_fr\": 0, \"conso_elec_ac_eclairage\": 0, \"conso_elec_ac_auxiliaire\": 0, \"conso_elec_ac_autre_usage\": 0}, \"ef_conso\": {\"conso_auxiliaire_ventilation\": 0, \"conso_eclairage\": 207.5598, \"conso_auxiliaire_generation_ch\": 0, \"conso_auxiliaire_generation_ch_depensier\": 0, \"conso_auxiliaire_distribution_ch\": 0, \"conso_ch\": 5390.2408533292, \"conso_ch_depensier\": 6669.16098400155, \"conso_auxiliaire_generation_ecs\": 0, \"conso_auxiliaire_generation_ecs_depensier\": 0, \"conso_auxiliaire_distribution_ecs\": 0, \"conso_ecs\": 1909.6352675784951, \"conso_ecs_depensier\": 2519.271323905377, \"conso_fr\": 105.79565033215742, \"conso_fr_depensier\": 279.2152083304175, \"conso_totale_auxiliaire\": 0, \"conso_5_usages\": 7613.231571239852, \"conso_5_usages_m2\": 66}, \"ep_conso\": {\"ep_conso_auxiliaire_ventilation\": 0, \"ep_conso_eclairage\": 477.38753999999994, \"ep_conso_auxiliaire_generation_ch\": 0, \"ep_conso_auxiliaire_generation_ch_depensier\": 0, \"ep_conso_auxiliaire_distribution_ch\": 0, \"ep_conso_ch\": 12397.553962657159, \"ep_conso_ch_depensier\": 15339.070263203563, \"ep_conso_auxiliaire_generation_ecs\": 0, \"ep_conso_auxiliaire_generation_ecs_depensier\": 0, \"ep_conso_auxiliaire_distribution_ecs\": 0, \"ep_conso_ecs\": 4392.161115430538, \"ep_conso_ecs_depensier\": 5794.324044982366, \"ep_conso_fr\": 243.32999576396205, \"ep_conso_fr_depensier\": 642.1949791599602, \"ep_conso_totale_auxiliaire\": 0, \"ep_conso_5_usages\": 17510.43261385166, \"ep_conso_5_usages_m2\": 153, \"classe_bilan_dpe\": \"C\"}, \"emission_ges\": {\"emission_ges_auxiliaire_ventilation\": 0, \"emission_ges_eclairage\": 14.3216262, \"emission_ges_auxiliaire_generation_ch\": 0, \"emission_ges_auxiliaire_generation_ch_depensier\": 0, \"emission_ges_auxiliaire_distribution_ch\": 0, \"emission_ges_ch\": 425.8290274130068, \"emission_ges_ch_depensier\": 526.8637177361225, \"emission_ges_auxiliaire_generation_ecs\": 0, \"emission_ges_auxiliaire_generation_ecs_depensier\": 0, \"emission_ges_auxiliaire_distribution_ecs\": 0, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_ecs_depensier\": 163.7526360538495, \"emission_ges_fr\": 6.770921621258075, \"emission_ges_fr_depensier\": 17.86977333314672, \"emission_ges_totale_auxiliaire\": 0, \"emission_ges_5_usages\": 571.047867626867, \"emission_ges_5_usages_m2\": 5, \"classe_emission_ges\": \"A\"}, \"cout\": {\"cout_auxiliaire_ventilation\": 0, \"cout_eclairage\": 60.206871186, \"cout_auxiliaire_generation_ch\": 0, \"cout_auxiliaire_generation_ch_depensier\": 0, \"cout_auxiliaire_distribution_ch\": 0, \"cout_ch\": 942.1543982713496, \"cout_ch_depensier\": 1143.3924808326437, \"cout_auxiliaire_generation_ecs\": 0, \"cout_auxiliaire_generation_ecs_depensier\": 0, \"cout_auxiliaire_distribution_ecs\": 0, \"cout_ecs\": 417.60929673759114, \"cout_ecs_depensier\": 504.32461611588, \"cout_fr\": 30.688144291848904, \"cout_fr_depensier\": 80.9919554804042, \"cout_total_auxiliaire\": 0, \"cout_5_usages\": 1450.6587104867895}, \"sortie_par_energie_collection\": {\"sortie_par_energie\": [{\"conso_ch\": 5390.2408533292, \"conso_ecs\": 1909.6352675784951, \"conso_5_usages\": 7613.231571239852, \"emission_ges_ch\": 425.8290274130068, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_5_usages\": null, \"enum_type_energie_id\": \"1\"}]}}, \"cost\": 14033}}, {\"id\": \"2508E0243162W-1\", \"modifierId\": [{\"path\": \"dpe.logement.enveloppe.plancher_haut_collection.plancher_haut\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.plancher_bas_collection.plancher_bas\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.mur_collection.mur\", \"seq\": [-1, 202, 203, 203, 203]}], \"lastResult\": {\"inputs\": [{}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 10}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}], \"result\": {\"deperdition\": {\"hvent\": 86.43480000000001, \"hperm\": 43.1856679149934, \"deperdition_renouvellement_air\": 129.6204679149934, \"deperdition_mur\": 31.9414796186479, \"deperdition_plancher_bas\": 39.1868891790545, \"deperdition_plancher_haut\": 11.532507407407408, \"deperdition_baie_vitree\": 57.291000000000004, \"deperdition_porte\": 15.264, \"deperdition_pont_thermique\": 54.56699999999999, \"deperdition_enveloppe\": 339.4033441201032}, \"apport_et_besoin\": {\"nadeq\": 2.08, \"v40_ecs_journalier\": 116.48, \"v40_ecs_journalier_depensier\": 164.32, \"surface_sud_equivalente\": 79.49305220000001, \"besoin_ecs\": 1380.4280788480005, \"besoin_ecs_depensier\": 1947.3896112320003, \"apport_interne_ch\": 3003947.3828571434, \"apport_interne_fr\": 98157.46285714286, \"apport_solaire_ch\": 2821998.025798, \"apport_solaire_fr\": 540464.3709780001, \"besoin_fr\": 747.2095736691737, \"besoin_fr_depensier\": 1970.8409382379193, \"besoin_ch\": 14855.781846003645, \"besoin_ch_depensier\": 18387.517760264538, \"pertes_distribution_ecs_recup\": 41.43553433385943, \"pertes_distribution_ecs_recup_depensier\": 60.075635678006364, \"pertes_stockage_ecs_recup\": 127.66111298630136, \"pertes_generateur_ch_recup\": 0, \"pertes_generateur_ch_recup_depensier\": 0, \"fraction_apport_gratuit_ch\": 0.2632954193792217, \"fraction_apport_gratuit_depensier_ch\": 0.2313896906072794}, \"confort_ete\": {\"inertie_lourde\": 1, \"aspect_traversant\": 1, \"isolation_toiture\": 1, \"protection_solaire_exterieure\": 0, \"brasseur_air\": 0, \"enum_indicateur_confort_ete_id\": \"1\"}, \"qualite_isolation\": {\"ubat\": 0.6381810544083408, \"qualite_isol_enveloppe\": 2, \"qualite_isol_mur\": 1, \"qualite_isol_plancher_bas\": 4, \"qualite_isol_menuiserie\": 4, \"qualite_isol_plancher_haut_comble_perdu\": 2}, \"production_electricite\": {\"production_pv\": 0, \"conso_elec_ac\": 0, \"conso_elec_ac_ch\": 0, \"conso_elec_ac_ecs\": 0, \"conso_elec_ac_fr\": 0, \"conso_elec_ac_eclairage\": 0, \"conso_elec_ac_auxiliaire\": 0, \"conso_elec_ac_autre_usage\": 0}, \"ef_conso\": {\"conso_auxiliaire_ventilation\": 0, \"conso_eclairage\": 207.5598, \"conso_auxiliaire_generation_ch\": 0, \"conso_auxiliaire_generation_ch_depensier\": 0, \"conso_auxiliaire_distribution_ch\": 0, \"conso_ch\": 5328.038472198468, \"conso_ch_depensier\": 6594.698485107118, \"conso_auxiliaire_generation_ecs\": 0, \"conso_auxiliaire_generation_ecs_depensier\": 0, \"conso_auxiliaire_distribution_ecs\": 0, \"conso_ecs\": 1909.6352675784951, \"conso_ecs_depensier\": 2519.271323905377, \"conso_fr\": 105.65414238841419, \"conso_fr_depensier\": 278.67350265736485, \"conso_totale_auxiliaire\": 0, \"conso_5_usages\": 7550.887682165378, \"conso_5_usages_m2\": 66}, \"ep_conso\": {\"ep_conso_auxiliaire_ventilation\": 0, \"ep_conso_eclairage\": 477.38753999999994, \"ep_conso_auxiliaire_generation_ch\": 0, \"ep_conso_auxiliaire_generation_ch_depensier\": 0, \"ep_conso_auxiliaire_distribution_ch\": 0, \"ep_conso_ch\": 12254.488486056476, \"ep_conso_ch_depensier\": 15167.806515746372, \"ep_conso_auxiliaire_generation_ecs\": 0, \"ep_conso_auxiliaire_generation_ecs_depensier\": 0, \"ep_conso_auxiliaire_distribution_ecs\": 0, \"ep_conso_ecs\": 4392.161115430538, \"ep_conso_ecs_depensier\": 5794.324044982366, \"ep_conso_fr\": 243.0045274933526, \"ep_conso_fr_depensier\": 640.9490561119391, \"ep_conso_totale_auxiliaire\": 0, \"ep_conso_5_usages\": 17367.041668980364, \"ep_conso_5_usages_m2\": 152, \"classe_bilan_dpe\": \"C\"}, \"emission_ges\": {\"emission_ges_auxiliaire_ventilation\": 0, \"emission_ges_eclairage\": 14.3216262, \"emission_ges_auxiliaire_generation_ch\": 0, \"emission_ges_auxiliaire_generation_ch_depensier\": 0, \"emission_ges_auxiliaire_distribution_ch\": 0, \"emission_ges_ch\": 420.915039303679, \"emission_ges_ch_depensier\": 520.9811803234624, \"emission_ges_auxiliaire_generation_ecs\": 0, \"emission_ges_auxiliaire_generation_ecs_depensier\": 0, \"emission_ges_auxiliaire_distribution_ecs\": 0, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_ecs_depensier\": 163.7526360538495, \"emission_ges_fr\": 6.761865112858508, \"emission_ges_fr_depensier\": 17.83510417007135, \"emission_ges_totale_auxiliaire\": 0, \"emission_ges_5_usages\": 566.1248230091396, \"emission_ges_5_usages_m2\": 4, \"classe_emission_ges\": \"A\"}, \"cout\": {\"cout_auxiliaire_ventilation\": 0, \"cout_eclairage\": 60.206871186, \"cout_auxiliaire_generation_ch\": 0, \"cout_auxiliaire_generation_ch_depensier\": 0, \"cout_auxiliaire_distribution_ch\": 0, \"cout_ch\": 932.366853600429, \"cout_ch_depensier\": 1131.675806631605, \"cout_auxiliaire_generation_ecs\": 0, \"cout_auxiliaire_generation_ecs_depensier\": 0, \"cout_auxiliaire_distribution_ecs\": 0, \"cout_ecs\": 417.60929673759114, \"cout_ecs_depensier\": 504.32461611588, \"cout_fr\": 30.647097082607303, \"cout_fr_depensier\": 80.83482291582182, \"cout_total_auxiliaire\": 0, \"cout_5_usages\": 1440.8301186066274}, \"sortie_par_energie_collection\": {\"sortie_par_energie\": [{\"conso_ch\": 5328.038472198468, \"conso_ecs\": 1909.6352675784951, \"conso_5_usages\": 7550.887682165378, \"emission_ges_ch\": 420.915039303679, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_5_usages\": null, \"enum_type_energie_id\": \"1\"}]}}, \"cost\": 14837}}, {\"id\": \"2508E0243162W-2\", \"modifierId\": [{\"path\": \"dpe.logement.enveloppe.plancher_haut_collection.plancher_haut\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.plancher_bas_collection.plancher_bas\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.mur_collection.mur\", \"seq\": [-1, 203, -1, -1, -1]}], \"lastResult\": {\"inputs\": [{}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {}, {}, {}], \"result\": {\"deperdition\": {\"hvent\": 86.43480000000001, \"hperm\": 43.1856679149934, \"deperdition_renouvellement_air\": 129.6204679149934, \"deperdition_mur\": 35.084631010932796, \"deperdition_plancher_bas\": 39.1868891790545, \"deperdition_plancher_haut\": 11.532507407407408, \"deperdition_baie_vitree\": 57.291000000000004, \"deperdition_porte\": 15.264, \"deperdition_pont_thermique\": 54.56699999999999, \"deperdition_enveloppe\": 342.5464955123881}, \"apport_et_besoin\": {\"nadeq\": 2.08, \"v40_ecs_journalier\": 116.48, \"v40_ecs_journalier_depensier\": 164.32, \"surface_sud_equivalente\": 79.49305220000001, \"besoin_ecs\": 1380.4280788480005, \"besoin_ecs_depensier\": 1947.3896112320003, \"apport_interne_ch\": 3003947.3828571434, \"apport_interne_fr\": 98157.46285714286, \"apport_solaire_ch\": 2821998.025798, \"apport_solaire_fr\": 540464.3709780001, \"besoin_fr\": 748.166118692018, \"besoin_fr_depensier\": 1974.5035825596979, \"besoin_ch\": 15037.803578560914, \"besoin_ch_depensier\": 18606.07039486386, \"pertes_distribution_ecs_recup\": 41.43553433385943, \"pertes_distribution_ecs_recup_depensier\": 60.075635678006364, \"pertes_stockage_ecs_recup\": 127.66111298630136, \"pertes_generateur_ch_recup\": 0, \"pertes_generateur_ch_recup_depensier\": 0, \"fraction_apport_gratuit_ch\": 0.26121224866517395, \"fraction_apport_gratuit_depensier_ch\": 0.22948371193703537}, \"confort_ete\": {\"inertie_lourde\": 1, \"aspect_traversant\": 1, \"isolation_toiture\": 1, \"protection_solaire_exterieure\": 0, \"brasseur_air\": 0, \"enum_indicateur_confort_ete_id\": \"1\"}, \"qualite_isolation\": {\"ubat\": 0.6477428437496796, \"qualite_isol_enveloppe\": 2, \"qualite_isol_mur\": 1, \"qualite_isol_plancher_bas\": 4, \"qualite_isol_menuiserie\": 4, \"qualite_isol_plancher_haut_comble_perdu\": 2}, \"production_electricite\": {\"production_pv\": 0, \"conso_elec_ac\": 0, \"conso_elec_ac_ch\": 0, \"conso_elec_ac_ecs\": 0, \"conso_elec_ac_fr\": 0, \"conso_elec_ac_eclairage\": 0, \"conso_elec_ac_auxiliaire\": 0, \"conso_elec_ac_autre_usage\": 0}, \"ef_conso\": {\"conso_auxiliaire_ventilation\": 0, \"conso_eclairage\": 207.5598, \"conso_auxiliaire_generation_ch\": 0, \"conso_auxiliaire_generation_ch_depensier\": 0, \"conso_auxiliaire_distribution_ch\": 0, \"conso_ch\": 5387.490364073141, \"conso_ch_depensier\": 6665.868751504755, \"conso_auxiliaire_generation_ecs\": 0, \"conso_auxiliaire_generation_ecs_depensier\": 0, \"conso_auxiliaire_distribution_ecs\": 0, \"conso_ecs\": 1909.6352675784951, \"conso_ecs_depensier\": 2519.271323905377, \"conso_fr\": 105.78939620154222, \"conso_fr_depensier\": 279.1913942346784, \"conso_totale_auxiliaire\": 0, \"conso_5_usages\": 7610.474827853178, \"conso_5_usages_m2\": 66}, \"ep_conso\": {\"ep_conso_auxiliaire_ventilation\": 0, \"ep_conso_eclairage\": 477.38753999999994, \"ep_conso_auxiliaire_generation_ch\": 0, \"ep_conso_auxiliaire_generation_ch_depensier\": 0, \"ep_conso_auxiliaire_distribution_ch\": 0, \"ep_conso_ch\": 12391.227837368224, \"ep_conso_ch_depensier\": 15331.498128460935, \"ep_conso_auxiliaire_generation_ecs\": 0, \"ep_conso_auxiliaire_generation_ecs_depensier\": 0, \"ep_conso_auxiliaire_distribution_ecs\": 0, \"ep_conso_ecs\": 4392.161115430538, \"ep_conso_ecs_depensier\": 5794.324044982366, \"ep_conso_fr\": 243.31561126354708, \"ep_conso_fr_depensier\": 642.1402067397603, \"ep_conso_totale_auxiliaire\": 0, \"ep_conso_5_usages\": 17504.09210406231, \"ep_conso_5_usages_m2\": 153, \"classe_bilan_dpe\": \"C\"}, \"emission_ges\": {\"emission_ges_auxiliaire_ventilation\": 0, \"emission_ges_eclairage\": 14.3216262, \"emission_ges_auxiliaire_generation_ch\": 0, \"emission_ges_auxiliaire_generation_ch_depensier\": 0, \"emission_ges_auxiliaire_distribution_ch\": 0, \"emission_ges_ch\": 425.61173876177816, \"emission_ges_ch_depensier\": 526.6036313688757, \"emission_ges_auxiliaire_generation_ecs\": 0, \"emission_ges_auxiliaire_generation_ecs_depensier\": 0, \"emission_ges_auxiliaire_distribution_ecs\": 0, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_ecs_depensier\": 163.7526360538495, \"emission_ges_fr\": 6.770521356898702, \"emission_ges_fr_depensier\": 17.86824923101942, \"emission_ges_totale_auxiliaire\": 0, \"emission_ges_5_usages\": 570.830178711279, \"emission_ges_5_usages_m2\": 5, \"classe_emission_ges\": \"A\"}, \"cout\": {\"cout_auxiliaire_ventilation\": 0, \"cout_eclairage\": 60.206871186, \"cout_auxiliaire_generation_ch\": 0, \"cout_auxiliaire_generation_ch_depensier\": 0, \"cout_auxiliaire_distribution_ch\": 0, \"cout_ch\": 941.7216087869086, \"cout_ch_depensier\": 1142.874448049273, \"cout_auxiliaire_generation_ecs\": 0, \"cout_auxiliaire_generation_ecs_depensier\": 0, \"cout_auxiliaire_distribution_ecs\": 0, \"cout_ecs\": 417.60929673759114, \"cout_ecs_depensier\": 504.32461611588, \"cout_fr\": 30.686330156181352, \"cout_fr_depensier\": 80.98504772565316, \"cout_total_auxiliaire\": 0, \"cout_5_usages\": 1450.224106866681}, \"sortie_par_energie_collection\": {\"sortie_par_energie\": [{\"conso_ch\": 5387.490364073141, \"conso_ecs\": 1909.6352675784951, \"conso_5_usages\": 7610.474827853178, \"emission_ges_ch\": 425.61173876177816, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_5_usages\": null, \"enum_type_energie_id\": \"1\"}]}}, \"cost\": 4036}}, {\"id\": \"2508E0243162W-3\", \"modifierId\": [{\"path\": \"dpe.logement.enveloppe.plancher_haut_collection.plancher_haut\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.plancher_bas_collection.plancher_bas\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.mur_collection.mur\", \"seq\": [-1, 203, -1, -1, 201]}], \"lastResult\": {\"inputs\": [{}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 0}], \"result\": {\"deperdition\": {\"hvent\": 86.43480000000001, \"hperm\": 43.1856679149934, \"deperdition_renouvellement_air\": 129.6204679149934, \"deperdition_mur\": 60.852965459093326, \"deperdition_plancher_bas\": 39.1868891790545, \"deperdition_plancher_haut\": 11.532507407407408, \"deperdition_baie_vitree\": 57.291000000000004, \"deperdition_porte\": 15.264, \"deperdition_pont_thermique\": 54.56699999999999, \"deperdition_enveloppe\": 368.31482996054865}, \"apport_et_besoin\": {\"nadeq\": 2.08, \"v40_ecs_journalier\": 116.48, \"v40_ecs_journalier_depensier\": 164.32, \"surface_sud_equivalente\": 79.49305220000001, \"besoin_ecs\": 1380.4280788480005, \"besoin_ecs_depensier\": 1947.3896112320003, \"apport_interne_ch\": 3003947.3828571434, \"apport_interne_fr\": 98157.46285714286, \"apport_solaire_ch\": 2821998.025798, \"apport_solaire_fr\": 540464.3709780001, \"besoin_fr\": 755.9208113971424, \"besoin_fr_depensier\": 2002.8122919983878, \"besoin_ch\": 16534.929810341968, \"besoin_ch_depensier\": 20402.00159384438, \"pertes_distribution_ecs_recup\": 41.43553433385943, \"pertes_distribution_ecs_recup_depensier\": 60.075635678006364, \"pertes_stockage_ecs_recup\": 127.66111298630136, \"pertes_generateur_ch_recup\": 0, \"pertes_generateur_ch_recup_depensier\": 0, \"fraction_apport_gratuit_ch\": 0.24525458721063187, \"fraction_apport_gratuit_depensier_ch\": 0.21492514112805108}, \"confort_ete\": {\"inertie_lourde\": 1, \"aspect_traversant\": 1, \"isolation_toiture\": 1, \"protection_solaire_exterieure\": 0, \"brasseur_air\": 0, \"enum_indicateur_confort_ete_id\": \"1\"}, \"qualite_isolation\": {\"ubat\": 0.7261327635846776, \"qualite_isol_enveloppe\": 3, \"qualite_isol_mur\": 2, \"qualite_isol_plancher_bas\": 4, \"qualite_isol_menuiserie\": 4, \"qualite_isol_plancher_haut_comble_perdu\": 2}, \"production_electricite\": {\"production_pv\": 0, \"conso_elec_ac\": 0, \"conso_elec_ac_ch\": 0, \"conso_elec_ac_ecs\": 0, \"conso_elec_ac_fr\": 0, \"conso_elec_ac_eclairage\": 0, \"conso_elec_ac_auxiliaire\": 0, \"conso_elec_ac_autre_usage\": 0}, \"ef_conso\": {\"conso_auxiliaire_ventilation\": 0, \"conso_eclairage\": 207.5598, \"conso_auxiliaire_generation_ch\": 0, \"conso_auxiliaire_generation_ch_depensier\": 0, \"conso_auxiliaire_distribution_ch\": 0, \"conso_ch\": 5871.816091196002, \"conso_ch_depensier\": 7245.074676785963, \"conso_auxiliaire_generation_ecs\": 0, \"conso_auxiliaire_generation_ecs_depensier\": 0, \"conso_auxiliaire_distribution_ecs\": 0, \"conso_ecs\": 1909.6352675784951, \"conso_ecs_depensier\": 2519.271323905377, \"conso_fr\": 106.88589634837835, \"conso_fr_depensier\": 283.1941968261664, \"conso_totale_auxiliaire\": 0, \"conso_5_usages\": 8095.897055122875, \"conso_5_usages_m2\": 71}, \"ep_conso\": {\"ep_conso_auxiliaire_ventilation\": 0, \"ep_conso_eclairage\": 477.38753999999994, \"ep_conso_auxiliaire_generation_ch\": 0, \"ep_conso_auxiliaire_generation_ch_depensier\": 0, \"ep_conso_auxiliaire_distribution_ch\": 0, \"ep_conso_ch\": 13505.177009750803, \"ep_conso_ch_depensier\": 16663.671756607713, \"ep_conso_auxiliaire_generation_ecs\": 0, \"ep_conso_auxiliaire_generation_ecs_depensier\": 0, \"ep_conso_auxiliaire_distribution_ecs\": 0, \"ep_conso_ecs\": 4392.161115430538, \"ep_conso_ecs_depensier\": 5794.324044982366, \"ep_conso_fr\": 245.83756160127018, \"ep_conso_fr_depensier\": 651.3466527001826, \"ep_conso_totale_auxiliaire\": 0, \"ep_conso_5_usages\": 18620.56322678261, \"ep_conso_5_usages_m2\": 163, \"classe_bilan_dpe\": \"C\"}, \"emission_ges\": {\"emission_ges_auxiliaire_ventilation\": 0, \"emission_ges_eclairage\": 14.3216262, \"emission_ges_auxiliaire_generation_ch\": 0, \"emission_ges_auxiliaire_generation_ch_depensier\": 0, \"emission_ges_auxiliaire_distribution_ch\": 0, \"emission_ges_ch\": 463.8734712044842, \"emission_ges_ch_depensier\": 572.360899466091, \"emission_ges_auxiliaire_generation_ecs\": 0, \"emission_ges_auxiliaire_generation_ecs_depensier\": 0, \"emission_ges_auxiliaire_distribution_ecs\": 0, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_ecs_depensier\": 163.7526360538495, \"emission_ges_fr\": 6.840697366296214, \"emission_ges_fr_depensier\": 18.124428596874647, \"emission_ges_totale_auxiliaire\": 0, \"emission_ges_5_usages\": 609.1620871633826, \"emission_ges_5_usages_m2\": 5, \"classe_emission_ges\": \"A\"}, \"cout\": {\"cout_auxiliaire_ventilation\": 0, \"cout_eclairage\": 60.206871186, \"cout_auxiliaire_generation_ch\": 0, \"cout_auxiliaire_generation_ch_depensier\": 0, \"cout_auxiliaire_distribution_ch\": 0, \"cout_ch\": 1017.9302619496909, \"cout_ch_depensier\": 1234.0125003922712, \"cout_auxiliaire_generation_ecs\": 0, \"cout_auxiliaire_generation_ecs_depensier\": 0, \"cout_auxiliaire_distribution_ecs\": 0, \"cout_ecs\": 417.60929673759114, \"cout_ecs_depensier\": 504.32461611588, \"cout_fr\": 31.004391953774107, \"cout_fr_depensier\": 82.14614067336608, \"cout_total_auxiliaire\": 0, \"cout_5_usages\": 1526.7508218270561}, \"sortie_par_energie_collection\": {\"sortie_par_energie\": [{\"conso_ch\": 5871.816091196002, \"conso_ecs\": 1909.6352675784951, \"conso_5_usages\": 8095.897055122875, \"emission_ges_ch\": 463.8734712044842, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_5_usages\": null, \"enum_type_energie_id\": \"1\"}]}}, \"cost\": 4036}}, {\"id\": \"2508E0243162W-4\", \"modifierId\": [{\"path\": \"dpe.logement.enveloppe.plancher_haut_collection.plancher_haut\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.plancher_bas_collection.plancher_bas\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.mur_collection.mur\", \"seq\": [-1, 203, -1, -1, 202]}], \"lastResult\": {\"inputs\": [{}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 10}], \"result\": {\"deperdition\": {\"hvent\": 86.43480000000001, \"hperm\": 43.1856679149934, \"deperdition_renouvellement_air\": 129.6204679149934, \"deperdition_mur\": 36.39349879242667, \"deperdition_plancher_bas\": 39.1868891790545, \"deperdition_plancher_haut\": 11.532507407407408, \"deperdition_baie_vitree\": 57.291000000000004, \"deperdition_porte\": 15.264, \"deperdition_pont_thermique\": 54.56699999999999, \"deperdition_enveloppe\": 343.855363293882}, \"apport_et_besoin\": {\"nadeq\": 2.08, \"v40_ecs_journalier\": 116.48, \"v40_ecs_journalier_depensier\": 164.32, \"surface_sud_equivalente\": 79.49305220000001, \"besoin_ecs\": 1380.4280788480005, \"besoin_ecs_depensier\": 1947.3896112320003, \"apport_interne_ch\": 3003947.3828571434, \"apport_interne_fr\": 98157.46285714286, \"apport_solaire_ch\": 2821998.025798, \"apport_solaire_fr\": 540464.3709780001, \"besoin_fr\": 748.5637842434348, \"besoin_fr_depensier\": 1976.0148178830486, \"besoin_ch\": 15113.641451050296, \"besoin_ch_depensier\": 18697.11496081417, \"pertes_distribution_ecs_recup\": 41.43553433385943, \"pertes_distribution_ecs_recup_depensier\": 60.075635678006364, \"pertes_stockage_ecs_recup\": 127.66111298630136, \"pertes_generateur_ch_recup\": 0, \"pertes_generateur_ch_recup_depensier\": 0, \"fraction_apport_gratuit_ch\": 0.26035404466122203, \"fraction_apport_gratuit_depensier_ch\": 0.22869886879122514}, \"confort_ete\": {\"inertie_lourde\": 1, \"aspect_traversant\": 1, \"isolation_toiture\": 1, \"protection_solaire_exterieure\": 0, \"brasseur_air\": 0, \"enum_indicateur_confort_ete_id\": \"1\"}, \"qualite_isolation\": {\"ubat\": 0.6517245539635209, \"qualite_isol_enveloppe\": 3, \"qualite_isol_mur\": 1, \"qualite_isol_plancher_bas\": 4, \"qualite_isol_menuiserie\": 4, \"qualite_isol_plancher_haut_comble_perdu\": 2}, \"production_electricite\": {\"production_pv\": 0, \"conso_elec_ac\": 0, \"conso_elec_ac_ch\": 0, \"conso_elec_ac_ecs\": 0, \"conso_elec_ac_fr\": 0, \"conso_elec_ac_eclairage\": 0, \"conso_elec_ac_auxiliaire\": 0, \"conso_elec_ac_autre_usage\": 0}, \"ef_conso\": {\"conso_auxiliaire_ventilation\": 0, \"conso_eclairage\": 207.5598, \"conso_auxiliaire_generation_ch\": 0, \"conso_auxiliaire_generation_ch_depensier\": 0, \"conso_auxiliaire_distribution_ch\": 0, \"conso_ch\": 5412.223897472681, \"conso_ch_depensier\": 6695.472612107005, \"conso_auxiliaire_generation_ecs\": 0, \"conso_auxiliaire_generation_ecs_depensier\": 0, \"conso_auxiliaire_distribution_ecs\": 0, \"conso_ecs\": 1909.6352675784951, \"conso_ecs_depensier\": 2519.271323905377, \"conso_fr\": 105.84562542326651, \"conso_fr_depensier\": 279.40508029768165, \"conso_totale_auxiliaire\": 0, \"conso_5_usages\": 7635.264590474442, \"conso_5_usages_m2\": 66}, \"ep_conso\": {\"ep_conso_auxiliaire_ventilation\": 0, \"ep_conso_eclairage\": 477.38753999999994, \"ep_conso_auxiliaire_generation_ch\": 0, \"ep_conso_auxiliaire_generation_ch_depensier\": 0, \"ep_conso_auxiliaire_distribution_ch\": 0, \"ep_conso_ch\": 12448.114964187165, \"ep_conso_ch_depensier\": 15399.58700784611, \"ep_conso_auxiliaire_generation_ecs\": 0, \"ep_conso_auxiliaire_generation_ecs_depensier\": 0, \"ep_conso_auxiliaire_distribution_ecs\": 0, \"ep_conso_ecs\": 4392.161115430538, \"ep_conso_ecs_depensier\": 5794.324044982366, \"ep_conso_fr\": 243.44493847351296, \"ep_conso_fr_depensier\": 642.6316846846678, \"ep_conso_totale_auxiliaire\": 0, \"ep_conso_5_usages\": 17561.108558091215, \"ep_conso_5_usages_m2\": 154, \"classe_bilan_dpe\": \"C\"}, \"emission_ges\": {\"emission_ges_auxiliaire_ventilation\": 0, \"emission_ges_eclairage\": 14.3216262, \"emission_ges_auxiliaire_generation_ch\": 0, \"emission_ges_auxiliaire_generation_ch_depensier\": 0, \"emission_ges_auxiliaire_distribution_ch\": 0, \"emission_ges_ch\": 427.5656879003418, \"emission_ges_ch_depensier\": 528.9423363564534, \"emission_ges_auxiliaire_generation_ecs\": 0, \"emission_ges_auxiliaire_generation_ecs_depensier\": 0, \"emission_ges_auxiliaire_distribution_ecs\": 0, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_ecs_depensier\": 163.7526360538495, \"emission_ges_fr\": 6.774120027089057, \"emission_ges_fr_depensier\": 17.881925139051624, \"emission_ges_totale_auxiliaire\": 0, \"emission_ges_5_usages\": 572.7877265200331, \"emission_ges_5_usages_m2\": 5, \"classe_emission_ges\": \"A\"}, \"cout\": {\"cout_auxiliaire_ventilation\": 0, \"cout_eclairage\": 60.206871186, \"cout_auxiliaire_generation_ch\": 0, \"cout_auxiliaire_generation_ch_depensier\": 0, \"cout_auxiliaire_distribution_ch\": 0, \"cout_ch\": 945.6134302673263, \"cout_ch_depensier\": 1147.5326155150372, \"cout_auxiliaire_generation_ecs\": 0, \"cout_auxiliaire_generation_ecs_depensier\": 0, \"cout_auxiliaire_distribution_ecs\": 0, \"cout_ecs\": 417.60929673759114, \"cout_ecs_depensier\": 504.32461611588, \"cout_fr\": 30.702640566526917, \"cout_fr_depensier\": 81.04703164194852, \"cout_total_auxiliaire\": 0, \"cout_5_usages\": 1454.1322387574444}, \"sortie_par_energie_collection\": {\"sortie_par_energie\": [{\"conso_ch\": 5412.223897472681, \"conso_ecs\": 1909.6352675784951, \"conso_5_usages\": 7635.264590474442, \"emission_ges_ch\": 427.5656879003418, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_5_usages\": null, \"enum_type_energie_id\": \"1\"}]}}, \"cost\": 6448}}, {\"id\": \"2508E0243162W-5\", \"modifierId\": [{\"path\": \"dpe.logement.enveloppe.plancher_haut_collection.plancher_haut\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.plancher_bas_collection.plancher_bas\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.mur_collection.mur\", \"seq\": [-1, 203, -1, -1, 203]}], \"lastResult\": {\"inputs\": [{}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}], \"result\": {\"deperdition\": {\"hvent\": 86.43480000000001, \"hperm\": 43.1856679149934, \"deperdition_renouvellement_air\": 129.6204679149934, \"deperdition_mur\": 33.10483100531182, \"deperdition_plancher_bas\": 39.1868891790545, \"deperdition_plancher_haut\": 11.532507407407408, \"deperdition_baie_vitree\": 57.291000000000004, \"deperdition_porte\": 15.264, \"deperdition_pont_thermique\": 54.56699999999999, \"deperdition_enveloppe\": 340.56669550676713}, \"apport_et_besoin\": {\"nadeq\": 2.08, \"v40_ecs_journalier\": 116.48, \"v40_ecs_journalier_depensier\": 164.32, \"surface_sud_equivalente\": 79.49305220000001, \"besoin_ecs\": 1380.4280788480005, \"besoin_ecs_depensier\": 1947.3896112320003, \"apport_interne_ch\": 3003947.3828571434, \"apport_interne_fr\": 98157.46285714286, \"apport_solaire_ch\": 2821998.025798, \"apport_solaire_fr\": 540464.3709780001, \"besoin_fr\": 747.5638712446028, \"besoin_fr_depensier\": 1972.2021108000554, \"besoin_ch\": 14923.136024150866, \"besoin_ch_depensier\": 18468.395017282033, \"pertes_distribution_ecs_recup\": 41.43553433385943, \"pertes_distribution_ecs_recup_depensier\": 60.075635678006364, \"pertes_stockage_ecs_recup\": 127.66111298630136, \"pertes_generateur_ch_recup\": 0, \"pertes_generateur_ch_recup_depensier\": 0, \"fraction_apport_gratuit_ch\": 0.262520699253213, \"fraction_apport_gratuit_depensier_ch\": 0.23068072165433068}, \"confort_ete\": {\"inertie_lourde\": 1, \"aspect_traversant\": 1, \"isolation_toiture\": 1, \"protection_solaire_exterieure\": 0, \"brasseur_air\": 0, \"enum_indicateur_confort_ete_id\": \"1\"}, \"qualite_isolation\": {\"ubat\": 0.6417200888043736, \"qualite_isol_enveloppe\": 2, \"qualite_isol_mur\": 1, \"qualite_isol_plancher_bas\": 4, \"qualite_isol_menuiserie\": 4, \"qualite_isol_plancher_haut_comble_perdu\": 2}, \"production_electricite\": {\"production_pv\": 0, \"conso_elec_ac\": 0, \"conso_elec_ac_ch\": 0, \"conso_elec_ac_ecs\": 0, \"conso_elec_ac_fr\": 0, \"conso_elec_ac_eclairage\": 0, \"conso_elec_ac_auxiliaire\": 0, \"conso_elec_ac_autre_usage\": 0}, \"ef_conso\": {\"conso_auxiliaire_ventilation\": 0, \"conso_eclairage\": 207.5598, \"conso_auxiliaire_generation_ch\": 0, \"conso_auxiliaire_generation_ch_depensier\": 0, \"conso_auxiliaire_distribution_ch\": 0, \"conso_ch\": 5350.052154207824, \"conso_ch_depensier\": 6621.053134345663, \"conso_auxiliaire_generation_ecs\": 0, \"conso_auxiliaire_generation_ecs_depensier\": 0, \"conso_auxiliaire_distribution_ecs\": 0, \"conso_ecs\": 1909.6352675784951, \"conso_ecs_depensier\": 2519.271323905377, \"conso_fr\": 105.7042394532824, \"conso_fr_depensier\": 278.86597010527095, \"conso_totale_auxiliaire\": 0, \"conso_5_usages\": 7572.9514612396015, \"conso_5_usages_m2\": 66}, \"ep_conso\": {\"ep_conso_auxiliaire_ventilation\": 0, \"ep_conso_eclairage\": 477.38753999999994, \"ep_conso_auxiliaire_generation_ch\": 0, \"ep_conso_auxiliaire_generation_ch_depensier\": 0, \"ep_conso_auxiliaire_distribution_ch\": 0, \"ep_conso_ch\": 12305.119954677994, \"ep_conso_ch_depensier\": 15228.422208995024, \"ep_conso_auxiliaire_generation_ecs\": 0, \"ep_conso_auxiliaire_generation_ecs_depensier\": 0, \"ep_conso_auxiliaire_distribution_ecs\": 0, \"ep_conso_ecs\": 4392.161115430538, \"ep_conso_ecs_depensier\": 5794.324044982366, \"ep_conso_fr\": 243.11975074254948, \"ep_conso_fr_depensier\": 641.3917312421231, \"ep_conso_totale_auxiliaire\": 0, \"ep_conso_5_usages\": 17417.788360851082, \"ep_conso_5_usages_m2\": 152, \"classe_bilan_dpe\": \"C\"}, \"emission_ges\": {\"emission_ges_auxiliaire_ventilation\": 0, \"emission_ges_eclairage\": 14.3216262, \"emission_ges_auxiliaire_generation_ch\": 0, \"emission_ges_auxiliaire_generation_ch_depensier\": 0, \"emission_ges_auxiliaire_distribution_ch\": 0, \"emission_ges_ch\": 422.6541201824181, \"emission_ges_ch_depensier\": 523.0631976133074, \"emission_ges_auxiliaire_generation_ecs\": 0, \"emission_ges_auxiliaire_generation_ecs_depensier\": 0, \"emission_ges_auxiliaire_distribution_ecs\": 0, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_ecs_depensier\": 163.7526360538495, \"emission_ges_fr\": 6.765071325010074, \"emission_ges_fr_depensier\": 17.847422086737343, \"emission_ges_totale_auxiliaire\": 0, \"emission_ges_5_usages\": 567.8671101000305, \"emission_ges_5_usages_m2\": 4, \"classe_emission_ges\": \"A\"}, \"cout\": {\"cout_auxiliaire_ventilation\": 0, \"cout_eclairage\": 60.206871186, \"cout_auxiliaire_generation_ch\": 0, \"cout_auxiliaire_generation_ch_depensier\": 0, \"cout_auxiliaire_distribution_ch\": 0, \"cout_ch\": 935.830706464601, \"cout_ch_depensier\": 1135.82271068929, \"cout_auxiliaire_generation_ecs\": 0, \"cout_auxiliaire_generation_ecs_depensier\": 0, \"cout_auxiliaire_distribution_ecs\": 0, \"cout_ecs\": 417.60929673759114, \"cout_ecs_depensier\": 504.32461611588, \"cout_fr\": 30.661628738213626, \"cout_fr_depensier\": 80.89065194843594, \"cout_total_auxiliaire\": 0, \"cout_5_usages\": 1444.3085031264059}, \"sortie_par_energie_collection\": {\"sortie_par_energie\": [{\"conso_ch\": 5350.052154207824, \"conso_ecs\": 1909.6352675784951, \"conso_5_usages\": 7572.9514612396015, \"emission_ges_ch\": 422.6541201824181, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_5_usages\": null, \"enum_type_energie_id\": \"1\"}]}}, \"cost\": 7252}}, {\"id\": \"2508E0243162W-6\", \"modifierId\": [{\"path\": \"dpe.logement.enveloppe.plancher_haut_collection.plancher_haut\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.plancher_bas_collection.plancher_bas\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.mur_collection.mur\", \"seq\": [-1, 203, -1, 201, -1]}], \"lastResult\": {\"inputs\": [{}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 0}, {}], \"result\": {\"deperdition\": {\"hvent\": 86.43480000000001, \"hperm\": 43.1856679149934, \"deperdition_renouvellement_air\": 129.6204679149934, \"deperdition_mur\": 67.27902398752143, \"deperdition_plancher_bas\": 39.1868891790545, \"deperdition_plancher_haut\": 11.532507407407408, \"deperdition_baie_vitree\": 57.291000000000004, \"deperdition_porte\": 15.264, \"deperdition_pont_thermique\": 54.56699999999999, \"deperdition_enveloppe\": 374.74088848897674}, \"apport_et_besoin\": {\"nadeq\": 2.08, \"v40_ecs_journalier\": 116.48, \"v40_ecs_journalier_depensier\": 164.32, \"surface_sud_equivalente\": 79.49305220000001, \"besoin_ecs\": 1380.4280788480005, \"besoin_ecs_depensier\": 1947.3896112320003, \"apport_interne_ch\": 3003947.3828571434, \"apport_interne_fr\": 98157.46285714286, \"apport_solaire_ch\": 2821998.025798, \"apport_solaire_fr\": 540464.3709780001, \"besoin_fr\": 757.8292318238144, \"besoin_fr_depensier\": 2009.420852608459, \"besoin_ch\": 16909.512338697183, \"besoin_ch_depensier\": 20850.915582684793, \"pertes_distribution_ecs_recup\": 41.43553433385943, \"pertes_distribution_ecs_recup_depensier\": 60.075635678006364, \"pertes_stockage_ecs_recup\": 127.66111298630136, \"pertes_generateur_ch_recup\": 0, \"pertes_generateur_ch_recup_depensier\": 0, \"fraction_apport_gratuit_ch\": 0.24156226587167867, \"fraction_apport_gratuit_depensier_ch\": 0.21156719009398037}, \"confort_ete\": {\"inertie_lourde\": 1, \"aspect_traversant\": 1, \"isolation_toiture\": 1, \"protection_solaire_exterieure\": 0, \"brasseur_air\": 0, \"enum_indicateur_confort_ete_id\": \"1\"}, \"qualite_isolation\": {\"ubat\": 0.745681493593281, \"qualite_isol_enveloppe\": 3, \"qualite_isol_mur\": 2, \"qualite_isol_plancher_bas\": 4, \"qualite_isol_menuiserie\": 4, \"qualite_isol_plancher_haut_comble_perdu\": 2}, \"production_electricite\": {\"production_pv\": 0, \"conso_elec_ac\": 0, \"conso_elec_ac_ch\": 0, \"conso_elec_ac_ecs\": 0, \"conso_elec_ac_fr\": 0, \"conso_elec_ac_eclairage\": 0, \"conso_elec_ac_auxiliaire\": 0, \"conso_elec_ac_autre_usage\": 0}, \"ef_conso\": {\"conso_auxiliaire_ventilation\": 0, \"conso_eclairage\": 207.5598, \"conso_auxiliaire_generation_ch\": 0, \"conso_auxiliaire_generation_ch_depensier\": 0, \"conso_auxiliaire_distribution_ch\": 0, \"conso_ch\": 5991.710161184709, \"conso_ch_depensier\": 7388.305485361068, \"conso_auxiliaire_generation_ecs\": 0, \"conso_auxiliaire_generation_ecs_depensier\": 0, \"conso_auxiliaire_distribution_ecs\": 0, \"conso_ecs\": 1909.6352675784951, \"conso_ecs_depensier\": 2519.271323905377, \"conso_fr\": 107.15574369857549, \"conso_fr_depensier\": 284.12863587550873, \"conso_totale_auxiliaire\": 0, \"conso_5_usages\": 8216.06097246178, \"conso_5_usages_m2\": 72}, \"ep_conso\": {\"ep_conso_auxiliaire_ventilation\": 0, \"ep_conso_eclairage\": 477.38753999999994, \"ep_conso_auxiliaire_generation_ch\": 0, \"ep_conso_auxiliaire_generation_ch_depensier\": 0, \"ep_conso_auxiliaire_distribution_ch\": 0, \"ep_conso_ch\": 13780.93337072483, \"ep_conso_ch_depensier\": 16993.102616330456, \"ep_conso_auxiliaire_generation_ecs\": 0, \"ep_conso_auxiliaire_generation_ecs_depensier\": 0, \"ep_conso_auxiliaire_distribution_ecs\": 0, \"ep_conso_ecs\": 4392.161115430538, \"ep_conso_ecs_depensier\": 5794.324044982366, \"ep_conso_fr\": 246.45821050672362, \"ep_conso_fr_depensier\": 653.4958625136701, \"ep_conso_totale_auxiliaire\": 0, \"ep_conso_5_usages\": 18896.940236662093, \"ep_conso_5_usages_m2\": 165, \"classe_bilan_dpe\": \"C\"}, \"emission_ges\": {\"emission_ges_auxiliaire_ventilation\": 0, \"emission_ges_eclairage\": 14.3216262, \"emission_ges_auxiliaire_generation_ch\": 0, \"emission_ges_auxiliaire_generation_ch_depensier\": 0, \"emission_ges_auxiliaire_distribution_ch\": 0, \"emission_ges_ch\": 473.34510273359206, \"emission_ges_ch_depensier\": 583.6761333435244, \"emission_ges_auxiliaire_generation_ecs\": 0, \"emission_ges_auxiliaire_generation_ecs_depensier\": 0, \"emission_ges_auxiliaire_distribution_ecs\": 0, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_ecs_depensier\": 163.7526360538495, \"emission_ges_fr\": 6.857967596708832, \"emission_ges_fr_depensier\": 18.18423269603256, \"emission_ges_totale_auxiliaire\": 0, \"emission_ges_5_usages\": 618.650988922903, \"emission_ges_5_usages_m2\": 5, \"classe_emission_ges\": \"A\"}, \"cout\": {\"cout_auxiliaire_ventilation\": 0, \"cout_eclairage\": 60.206871186, \"cout_auxiliaire_generation_ch\": 0, \"cout_auxiliaire_generation_ch_depensier\": 0, \"cout_auxiliaire_distribution_ch\": 0, \"cout_ch\": 1036.795593862414, \"cout_ch_depensier\": 1256.549868121564, \"cout_auxiliaire_generation_ecs\": 0, \"cout_auxiliaire_generation_ecs_depensier\": 0, \"cout_auxiliaire_distribution_ecs\": 0, \"cout_ecs\": 417.60929673759114, \"cout_ecs_depensier\": 504.32461611588, \"cout_fr\": 31.082666574645792, \"cout_fr_depensier\": 82.41719340840882, \"cout_total_auxiliaire\": 0, \"cout_5_usages\": 1545.694428360651}, \"sortie_par_energie_collection\": {\"sortie_par_energie\": [{\"conso_ch\": 5991.710161184709, \"conso_ecs\": 1909.6352675784951, \"conso_5_usages\": 8216.06097246178, \"emission_ges_ch\": 473.34510273359206, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_5_usages\": null, \"enum_type_energie_id\": \"1\"}]}}, \"cost\": 4036}}, {\"id\": \"2508E0243162W-7\", \"modifierId\": [{\"path\": \"dpe.logement.enveloppe.plancher_haut_collection.plancher_haut\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.plancher_bas_collection.plancher_bas\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.mur_collection.mur\", \"seq\": [-1, 203, -1, 201, 201]}], \"lastResult\": {\"inputs\": [{}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 0}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 0}], \"result\": {\"deperdition\": {\"hvent\": 86.43480000000001, \"hperm\": 43.1856679149934, \"deperdition_renouvellement_air\": 129.6204679149934, \"deperdition_mur\": 93.04735843568196, \"deperdition_plancher_bas\": 39.1868891790545, \"deperdition_plancher_haut\": 11.532507407407408, \"deperdition_baie_vitree\": 57.291000000000004, \"deperdition_porte\": 15.264, \"deperdition_pont_thermique\": 54.56699999999999, \"deperdition_enveloppe\": 400.5092229371373}, \"apport_et_besoin\": {\"nadeq\": 2.08, \"v40_ecs_journalier\": 116.48, \"v40_ecs_journalier_depensier\": 164.32, \"surface_sud_equivalente\": 79.49305220000001, \"besoin_ecs\": 1380.4280788480005, \"besoin_ecs_depensier\": 1947.3896112320003, \"apport_interne_ch\": 3003947.3828571434, \"apport_interne_fr\": 98157.46285714286, \"apport_solaire_ch\": 2821998.025798, \"apport_solaire_fr\": 540464.3709780001, \"besoin_fr\": 765.3733422776021, \"besoin_fr_depensier\": 2034.2785945455141, \"besoin_ch\": 18415.837820808832, \"besoin_ch_depensier\": 22654.613707458335, \"pertes_distribution_ecs_recup\": 41.43553433385943, \"pertes_distribution_ecs_recup_depensier\": 60.075635678006364, \"pertes_stockage_ecs_recup\": 127.66111298630136, \"pertes_generateur_ch_recup\": 0, \"pertes_generateur_ch_recup_depensier\": 0, \"fraction_apport_gratuit_ch\": 0.22776935630277276, \"fraction_apport_gratuit_depensier_ch\": 0.19905932409399427}, \"confort_ete\": {\"inertie_lourde\": 1, \"aspect_traversant\": 1, \"isolation_toiture\": 1, \"protection_solaire_exterieure\": 0, \"brasseur_air\": 0, \"enum_indicateur_confort_ete_id\": \"1\"}, \"qualite_isolation\": {\"ubat\": 0.8240714134282789, \"qualite_isol_enveloppe\": 3, \"qualite_isol_mur\": 3, \"qualite_isol_plancher_bas\": 4, \"qualite_isol_menuiserie\": 4, \"qualite_isol_plancher_haut_comble_perdu\": 2}, \"production_electricite\": {\"production_pv\": 0, \"conso_elec_ac\": 0, \"conso_elec_ac_ch\": 0, \"conso_elec_ac_ecs\": 0, \"conso_elec_ac_fr\": 0, \"conso_elec_ac_eclairage\": 0, \"conso_elec_ac_auxiliaire\": 0, \"conso_elec_ac_autre_usage\": 0}, \"ef_conso\": {\"conso_auxiliaire_ventilation\": 0, \"conso_eclairage\": 207.5598, \"conso_auxiliaire_generation_ch\": 0, \"conso_auxiliaire_generation_ch_depensier\": 0, \"conso_auxiliaire_distribution_ch\": 0, \"conso_ch\": 6468.75897343399, \"conso_ch_depensier\": 7957.674102897012, \"conso_auxiliaire_generation_ecs\": 0, \"conso_auxiliaire_generation_ecs_depensier\": 0, \"conso_auxiliaire_distribution_ecs\": 0, \"conso_ecs\": 1909.6352675784951, \"conso_ecs_depensier\": 2519.271323905377, \"conso_fr\": 108.22246787900107, \"conso_fr_depensier\": 287.64347762623134, \"conso_totale_auxiliaire\": 0, \"conso_5_usages\": 8694.176508891487, \"conso_5_usages_m2\": 76}, \"ep_conso\": {\"ep_conso_auxiliaire_ventilation\": 0, \"ep_conso_eclairage\": 477.38753999999994, \"ep_conso_auxiliaire_generation_ch\": 0, \"ep_conso_auxiliaire_generation_ch_depensier\": 0, \"ep_conso_auxiliaire_distribution_ch\": 0, \"ep_conso_ch\": 14878.145638898175, \"ep_conso_ch_depensier\": 18302.650436663127, \"ep_conso_auxiliaire_generation_ecs\": 0, \"ep_conso_auxiliaire_generation_ecs_depensier\": 0, \"ep_conso_auxiliaire_distribution_ecs\": 0, \"ep_conso_ecs\": 4392.161115430538, \"ep_conso_ecs_depensier\": 5794.324044982366, \"ep_conso_fr\": 248.91167612170244, \"ep_conso_fr_depensier\": 661.5799985403321, \"ep_conso_totale_auxiliaire\": 0, \"ep_conso_5_usages\": 19996.605970450415, \"ep_conso_5_usages_m2\": 175, \"classe_bilan_dpe\": \"C\"}, \"emission_ges\": {\"emission_ges_auxiliaire_ventilation\": 0, \"emission_ges_eclairage\": 14.3216262, \"emission_ges_auxiliaire_generation_ch\": 0, \"emission_ges_auxiliaire_generation_ch_depensier\": 0, \"emission_ges_auxiliaire_distribution_ch\": 0, \"emission_ges_ch\": 511.03195890128524, \"emission_ges_ch_depensier\": 628.6562541288639, \"emission_ges_auxiliaire_generation_ecs\": 0, \"emission_ges_auxiliaire_generation_ecs_depensier\": 0, \"emission_ges_auxiliaire_distribution_ecs\": 0, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_ecs_depensier\": 163.7526360538495, \"emission_ges_fr\": 6.926237944256068, \"emission_ges_fr_depensier\": 18.409182568078805, \"emission_ges_totale_auxiliaire\": 0, \"emission_ges_5_usages\": 656.4061154381434, \"emission_ges_5_usages_m2\": 5, \"classe_emission_ges\": \"A\"}, \"cout\": {\"cout_auxiliaire_ventilation\": 0, \"cout_eclairage\": 60.206871186, \"cout_auxiliaire_generation_ch\": 0, \"cout_auxiliaire_generation_ch_depensier\": 0, \"cout_auxiliaire_distribution_ch\": 0, \"cout_ch\": 1111.8592244698384, \"cout_ch_depensier\": 1346.1400200908447, \"cout_auxiliaire_generation_ecs\": 0, \"cout_auxiliaire_generation_ecs_depensier\": 0, \"cout_auxiliaire_distribution_ecs\": 0, \"cout_ecs\": 417.60929673759114, \"cout_ecs_depensier\": 504.32461611588, \"cout_fr\": 31.39209125766184, \"cout_fr_depensier\": 83.43674355504092, \"cout_total_auxiliaire\": 0, \"cout_5_usages\": 1621.0674836510914}, \"sortie_par_energie_collection\": {\"sortie_par_energie\": [{\"conso_ch\": 6468.75897343399, \"conso_ecs\": 1909.6352675784951, \"conso_5_usages\": 8694.176508891487, \"emission_ges_ch\": 511.03195890128524, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_5_usages\": null, \"enum_type_energie_id\": \"1\"}]}}, \"cost\": 4036}}, {\"id\": \"2508E0243162W-8\", \"modifierId\": [{\"path\": \"dpe.logement.enveloppe.plancher_haut_collection.plancher_haut\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.plancher_bas_collection.plancher_bas\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.mur_collection.mur\", \"seq\": [-1, 203, -1, 201, 202]}], \"lastResult\": {\"inputs\": [{}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 0}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 10}], \"result\": {\"deperdition\": {\"hvent\": 86.43480000000001, \"hperm\": 43.1856679149934, \"deperdition_renouvellement_air\": 129.6204679149934, \"deperdition_mur\": 68.5878917690153, \"deperdition_plancher_bas\": 39.1868891790545, \"deperdition_plancher_haut\": 11.532507407407408, \"deperdition_baie_vitree\": 57.291000000000004, \"deperdition_porte\": 15.264, \"deperdition_pont_thermique\": 54.56699999999999, \"deperdition_enveloppe\": 376.04975627047065}, \"apport_et_besoin\": {\"nadeq\": 2.08, \"v40_ecs_journalier\": 116.48, \"v40_ecs_journalier_depensier\": 164.32, \"surface_sud_equivalente\": 79.49305220000001, \"besoin_ecs\": 1380.4280788480005, \"besoin_ecs_depensier\": 1947.3896112320003, \"apport_interne_ch\": 3003947.3828571434, \"apport_interne_fr\": 98157.46285714286, \"apport_solaire_ch\": 2821998.025798, \"apport_solaire_fr\": 540464.3709780001, \"besoin_fr\": 758.2166467956929, \"besoin_fr_depensier\": 2010.7460153323761, \"besoin_ch\": 16985.86299658035, \"besoin_ch_depensier\": 20942.39746231762, \"pertes_distribution_ecs_recup\": 41.43553433385943, \"pertes_distribution_ecs_recup_depensier\": 60.075635678006364, \"pertes_stockage_ecs_recup\": 127.66111298630136, \"pertes_generateur_ch_recup\": 0, \"pertes_generateur_ch_recup_depensier\": 0, \"fraction_apport_gratuit_ch\": 0.2408232347925816, \"fraction_apport_gratuit_depensier_ch\": 0.21089556997255823}, \"confort_ete\": {\"inertie_lourde\": 1, \"aspect_traversant\": 1, \"isolation_toiture\": 1, \"protection_solaire_exterieure\": 0, \"brasseur_air\": 0, \"enum_indicateur_confort_ete_id\": \"1\"}, \"qualite_isolation\": {\"ubat\": 0.7496632038071223, \"qualite_isol_enveloppe\": 3, \"qualite_isol_mur\": 3, \"qualite_isol_plancher_bas\": 4, \"qualite_isol_menuiserie\": 4, \"qualite_isol_plancher_haut_comble_perdu\": 2}, \"production_electricite\": {\"production_pv\": 0, \"conso_elec_ac\": 0, \"conso_elec_ac_ch\": 0, \"conso_elec_ac_ecs\": 0, \"conso_elec_ac_fr\": 0, \"conso_elec_ac_eclairage\": 0, \"conso_elec_ac_auxiliaire\": 0, \"conso_elec_ac_autre_usage\": 0}, \"ef_conso\": {\"conso_auxiliaire_ventilation\": 0, \"conso_eclairage\": 207.5598, \"conso_auxiliaire_generation_ch\": 0, \"conso_auxiliaire_generation_ch_depensier\": 0, \"conso_auxiliaire_distribution_ch\": 0, \"conso_ch\": 6016.085668180499, \"conso_ch_depensier\": 7417.418664907027, \"conso_auxiliaire_generation_ecs\": 0, \"conso_auxiliaire_generation_ecs_depensier\": 0, \"conso_auxiliaire_distribution_ecs\": 0, \"conso_ecs\": 1909.6352675784951, \"conso_ecs_depensier\": 2519.271323905377, \"conso_fr\": 107.21052350606813, \"conso_fr_depensier\": 284.31601159452293, \"conso_totale_auxiliaire\": 0, \"conso_5_usages\": 8240.491259265062, \"conso_5_usages_m2\": 72}, \"ep_conso\": {\"ep_conso_auxiliaire_ventilation\": 0, \"ep_conso_eclairage\": 477.38753999999994, \"ep_conso_auxiliaire_generation_ch\": 0, \"ep_conso_auxiliaire_generation_ch_depensier\": 0, \"ep_conso_auxiliaire_distribution_ch\": 0, \"ep_conso_ch\": 13836.997036815146, \"ep_conso_ch_depensier\": 17060.06292928616, \"ep_conso_auxiliaire_generation_ecs\": 0, \"ep_conso_auxiliaire_generation_ecs_depensier\": 0, \"ep_conso_auxiliaire_distribution_ecs\": 0, \"ep_conso_ecs\": 4392.161115430538, \"ep_conso_ecs_depensier\": 5794.324044982366, \"ep_conso_fr\": 246.58420406395666, \"ep_conso_fr_depensier\": 653.9268266674027, \"ep_conso_totale_auxiliaire\": 0, \"ep_conso_5_usages\": 18953.12989630964, \"ep_conso_5_usages_m2\": 166, \"classe_bilan_dpe\": \"C\"}, \"emission_ges\": {\"emission_ges_auxiliaire_ventilation\": 0, \"emission_ges_eclairage\": 14.3216262, \"emission_ges_auxiliaire_generation_ch\": 0, \"emission_ges_auxiliaire_generation_ch_depensier\": 0, \"emission_ges_auxiliaire_distribution_ch\": 0, \"emission_ges_ch\": 475.2707677862594, \"emission_ges_ch_depensier\": 585.9760745276551, \"emission_ges_auxiliaire_generation_ecs\": 0, \"emission_ges_auxiliaire_generation_ecs_depensier\": 0, \"emission_ges_auxiliaire_distribution_ecs\": 0, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_ecs_depensier\": 163.7526360538495, \"emission_ges_fr\": 6.861473504388361, \"emission_ges_fr_depensier\": 18.19622474204947, \"emission_ges_totale_auxiliaire\": 0, \"emission_ges_5_usages\": 620.58015988325, \"emission_ges_5_usages_m2\": 5, \"classe_emission_ges\": \"A\"}, \"cout\": {\"cout_auxiliaire_ventilation\": 0, \"cout_eclairage\": 60.206871186, \"cout_auxiliaire_generation_ch\": 0, \"cout_auxiliaire_generation_ch_depensier\": 0, \"cout_auxiliaire_distribution_ch\": 0, \"cout_ch\": 1040.6310798882014, \"cout_ch_depensier\": 1261.1308269231206, \"cout_auxiliaire_generation_ecs\": 0, \"cout_auxiliaire_generation_ecs_depensier\": 0, \"cout_auxiliaire_distribution_ecs\": 0, \"cout_ecs\": 417.60929673759114, \"cout_ecs_depensier\": 504.32461611588, \"cout_fr\": 31.09855655340518, \"cout_fr_depensier\": 82.47154548322327, \"cout_total_auxiliaire\": 0, \"cout_5_usages\": 1549.5458043651977}, \"sortie_par_energie_collection\": {\"sortie_par_energie\": [{\"conso_ch\": 6016.085668180499, \"conso_ecs\": 1909.6352675784951, \"conso_5_usages\": 8240.491259265062, \"emission_ges_ch\": 475.2707677862594, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_5_usages\": null, \"enum_type_energie_id\": \"1\"}]}}, \"cost\": 6448}}, {\"id\": \"2508E0243162W-9\", \"modifierId\": [{\"path\": \"dpe.logement.enveloppe.plancher_haut_collection.plancher_haut\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.plancher_bas_collection.plancher_bas\", \"seq\": [-1]}, {\"path\": \"dpe.logement.enveloppe.mur_collection.mur\", \"seq\": [-1, 203, -1, 201, 203]}], \"lastResult\": {\"inputs\": [{}, {}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}, {}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 0}, {\"dpe.logement.enveloppe.mur_collection.mur.donnee_entree.epaisseur_isolation[0]\": 30}], \"result\": {\"deperdition\": {\"hvent\": 86.43480000000001, \"hperm\": 43.1856679149934, \"deperdition_renouvellement_air\": 129.6204679149934, \"deperdition_mur\": 65.29922398190045, \"deperdition_plancher_bas\": 39.1868891790545, \"deperdition_plancher_haut\": 11.532507407407408, \"deperdition_baie_vitree\": 57.291000000000004, \"deperdition_porte\": 15.264, \"deperdition_pont_thermique\": 54.56699999999999, \"deperdition_enveloppe\": 372.76108848335576}, \"apport_et_besoin\": {\"nadeq\": 2.08, \"v40_ecs_journalier\": 116.48, \"v40_ecs_journalier_depensier\": 164.32, \"surface_sud_equivalente\": 79.49305220000001, \"besoin_ecs\": 1380.4280788480005, \"besoin_ecs_depensier\": 1947.3896112320003, \"apport_interne_ch\": 3003947.3828571434, \"apport_interne_fr\": 98157.46285714286, \"apport_solaire_ch\": 2821998.025798, \"apport_solaire_fr\": 540464.3709780001, \"besoin_fr\": 757.242389527013, \"besoin_fr_depensier\": 2007.4030780704238, \"besoin_ch\": 16794.05905307464, \"besoin_ch_depensier\": 20712.569162749183, \"pertes_distribution_ecs_recup\": 41.43553433385943, \"pertes_distribution_ecs_recup_depensier\": 60.075635678006364, \"pertes_stockage_ecs_recup\": 127.66111298630136, \"pertes_generateur_ch_recup\": 0, \"pertes_generateur_ch_recup_depensier\": 0, \"fraction_apport_gratuit_ch\": 0.24268842307541114, \"fraction_apport_gratuit_depensier_ch\": 0.21259093633971773}, \"confort_ete\": {\"inertie_lourde\": 1, \"aspect_traversant\": 1, \"isolation_toiture\": 1, \"protection_solaire_exterieure\": 0, \"brasseur_air\": 0, \"enum_indicateur_confort_ete_id\": \"1\"}, \"qualite_isolation\": {\"ubat\": 0.7396587386479749, \"qualite_isol_enveloppe\": 3, \"qualite_isol_mur\": 2, \"qualite_isol_plancher_bas\": 4, \"qualite_isol_menuiserie\": 4, \"qualite_isol_plancher_haut_comble_perdu\": 2}, \"production_electricite\": {\"production_pv\": 0, \"conso_elec_ac\": 0, \"conso_elec_ac_ch\": 0, \"conso_elec_ac_ecs\": 0, \"conso_elec_ac_fr\": 0, \"conso_elec_ac_eclairage\": 0, \"conso_elec_ac_auxiliaire\": 0, \"conso_elec_ac_autre_usage\": 0}, \"ef_conso\": {\"conso_auxiliaire_ventilation\": 0, \"conso_eclairage\": 207.5598, \"conso_auxiliaire_generation_ch\": 0, \"conso_auxiliaire_generation_ch_depensier\": 0, \"conso_auxiliaire_distribution_ch\": 0, \"conso_ch\": 5954.810819095826, \"conso_ch_depensier\": 7344.229917961885, \"conso_auxiliaire_generation_ecs\": 0, \"conso_auxiliaire_generation_ecs_depensier\": 0, \"conso_auxiliaire_distribution_ecs\": 0, \"conso_ecs\": 1909.6352675784951, \"conso_ecs_depensier\": 2519.271323905377, \"conso_fr\": 107.07276521198926, \"conso_fr_depensier\": 283.8433260429507, \"conso_totale_auxiliaire\": 0, \"conso_5_usages\": 8179.078651886311, \"conso_5_usages_m2\": 71}, \"ep_conso\": {\"ep_conso_auxiliaire_ventilation\": 0, \"ep_conso_eclairage\": 477.38753999999994, \"ep_conso_auxiliaire_generation_ch\": 0, \"ep_conso_auxiliaire_generation_ch_depensier\": 0, \"ep_conso_auxiliaire_distribution_ch\": 0, \"ep_conso_ch\": 13696.0648839204, \"ep_conso_ch_depensier\": 16891.728811312332, \"ep_conso_auxiliaire_generation_ecs\": 0, \"ep_conso_auxiliaire_generation_ecs_depensier\": 0, \"ep_conso_auxiliaire_distribution_ecs\": 0, \"ep_conso_ecs\": 4392.161115430538, \"ep_conso_ecs_depensier\": 5794.324044982366, \"ep_conso_fr\": 246.26735998757528, \"ep_conso_fr_depensier\": 652.8396498987865, \"ep_conso_totale_auxiliaire\": 0, \"ep_conso_5_usages\": 18811.880899338514, \"ep_conso_5_usages_m2\": 165, \"classe_bilan_dpe\": \"C\"}, \"emission_ges\": {\"emission_ges_auxiliaire_ventilation\": 0, \"emission_ges_eclairage\": 14.3216262, \"emission_ges_auxiliaire_generation_ch\": 0, \"emission_ges_auxiliaire_generation_ch_depensier\": 0, \"emission_ges_auxiliaire_distribution_ch\": 0, \"emission_ges_ch\": 470.4300547085703, \"emission_ges_ch_depensier\": 580.194163518989, \"emission_ges_auxiliaire_generation_ecs\": 0, \"emission_ges_auxiliaire_generation_ecs_depensier\": 0, \"emission_ges_auxiliaire_distribution_ecs\": 0, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_ecs_depensier\": 163.7526360538495, \"emission_ges_fr\": 6.852656973567313, \"emission_ges_fr_depensier\": 18.165972866748845, \"emission_ges_totale_auxiliaire\": 0, \"emission_ges_5_usages\": 615.7306302747397, \"emission_ges_5_usages_m2\": 5, \"classe_emission_ges\": \"A\"}, \"cout\": {\"cout_auxiliaire_ventilation\": 0, \"cout_eclairage\": 60.206871186, \"cout_auxiliaire_generation_ch\": 0, \"cout_auxiliaire_generation_ch_depensier\": 0, \"cout_auxiliaire_distribution_ch\": 0, \"cout_ch\": 1030.9894823847283, \"cout_ch_depensier\": 1249.6145775913026, \"cout_auxiliaire_generation_ecs\": 0, \"cout_auxiliaire_generation_ecs_depensier\": 0, \"cout_auxiliaire_distribution_ecs\": 0, \"cout_ecs\": 417.60929673759114, \"cout_ecs_depensier\": 504.32461611588, \"cout_fr\": 31.058597005041726, \"cout_fr_depensier\": 82.33443358527872, \"cout_total_auxiliaire\": 0, \"cout_5_usages\": 1539.8642473133611}, \"sortie_par_energie_collection\": {\"sortie_par_energie\": [{\"conso_ch\": 5954.810819095826, \"conso_ecs\": 1909.6352675784951, \"conso_5_usages\": 8179.078651886311, \"emission_ges_ch\": 470.4300547085703, \"emission_ges_ecs\": 124.12629239260218, \"emission_ges_5_usages\": null, \"enum_type_energie_id\": \"1\"}]}}, \"cost\": 7252}}], \"totalCostCombinations\": 72414}}"
}



---

**Cursor**

I'll look for where the graph detail API is called and where the details panel is rendered, so I can add a JSON viewer for the redis_obj field. Then I'll implement the UI change.

Let me locate where the detail view is rendered for simulation graph points and whether we already request the `simulation_graph_detail` endpoint; then I'll add a panel to pretty-print `redis_obj` JSON under the existing details.

I'll add a new state to `apps/simul/src/App.tsx` to store the point detail, wire `onPointDetail` from `SimulationResults`, and render a prettified JSON of `redis_obj` under the existing `SimulationDetailCard`. Then I'll run a linter check on the edited file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./amplify";
import { authorizedFetch, waitForAccessToken, getAccessToken, setBridgeAccessToken } from "./auth";
import { Hub } from "aws-amplify/utils";
import { Button, Card, Col, Flex, Input, InputNumber, Row, Select, Space, Typography, message, Spin, Collapse, Tooltip } from "antd";
import { ExportOutlined, LeftOutlined } from "@ant-design/icons";
import { SimulationScenariosModal } from "@acme/simulation-scenarios";
import { LoadScenarioModal } from "@acme/load-scenario";
import { DpeDrawerEditor, fetchSimulationTemplateJson } from "@acme/dpe-editor";
import { SimulationResults } from "@acme/simulation-results";
import { ChainlitChatDrawer } from "@acme/chainlit-client";
import { TopMenu } from "@acme/top-menu";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { flushSync } from "react-dom";
import { SimulationDetailCard } from "@acme/simulation-detail";

const { Title, Paragraph } = Typography;

export const App: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>("{\n  \"items\": []\n}");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [apiDebug, setApiDebug] = useState<number | undefined>(undefined);
  const [skip, setSkip] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [numChunks, setNumChunks] = useState<number>(1);
  useEffect(() => { setNumChunks(2); }, []);
  const [totalCombinations, setTotalCombinations] = useState<number | undefined>(undefined);
  const [numWorkers, setNumWorkers] = useState<number>(1);
  const [confirmedWorkers, setConfirmedWorkers] = useState<number | undefined>(undefined);
  const [workersError, setWorkersError] = useState<string | undefined>(undefined);
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
  const [isLoadSavedOpen, setIsLoadSavedOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isChainlitOpen, setIsChainlitOpen] = useState<boolean>(false);
  const [queueSegments, setQueueSegments] = useState<number>(0);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const queuePollIdRef = useRef<number | null>(null);
  const [queueNowTick, setQueueNowTick] = useState<number>(0);
  const [currentDoneCount, setCurrentDoneCount] = useState<number>(0);
  const [lastRefreshedDoneCount, setLastRefreshedDoneCount] = useState<number>(0);
  const [resultsRefreshKey, setResultsRefreshKey] = useState<number>(0);
  const [selectedPoint, setSelectedPoint] = useState<{ index: number; ep?: number; ges?: number; cost?: number; letter?: string } | null>(null);
  const [resultsXMetric, setResultsXMetric] = useState<"index" | "cost">("index");
  const [resultsYMetric, setResultsYMetric] = useState<"ep" | "ges">("ep");
  const [selectedPointDetail, setSelectedPointDetail] = useState<any | null>(null);
  const isChunksTooBig = useMemo(() => {
    if (typeof totalCombinations !== "number") return false;
    const chunks = Math.max(1, Number(numChunks || 1));
    return (totalCombinations / chunks) > 50;
  }, [totalCombinations, numChunks]);
  function openEditor() { setIsEditorOpen(true); }
  const hasLoadedTemplateRef = useRef<boolean>(false);
  const editorOriginalTextRef = useRef<string>("");
  const combinationsAbortRef = useRef<AbortController | null>(null);

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
    const hasSimulParam = url.searchParams.has("simul");
    if (!hasSimulParam) return; // do not auto-fetch when simul is not explicitly provided
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (simul === "default") return;
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

  // On init: if URL contains simul=default, call template endpoint and initialize editor JSON
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (cancelled) return;
        if (hasLoadedTemplateRef.current) return;
        const url = new URL(window.location.href);
        const simul = url.searchParams.get("simul");
        if (simul !== "default") return;
        if (!refAdeme) return;
        if (hasUserEditedRef.current) return;

        const accessToken = await waitForAccessToken(15000, 250);
        if (!accessToken) return;

        const baseUrl = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const template = await fetchSimulationTemplateJson<any>({ baseUrl, ref_ademe: refAdeme, accessToken });
        if (cancelled) return;

        const sourceRuns: any[] = Array.isArray(template)
          ? template
          : (template && Array.isArray(template.runs) ? template.runs : []);

        const transformedRuns = sourceRuns.map((run) => {
          const forced = run?.parameters?.input_forced || {};
          const scenarios = Array.isArray(run?.scenarios) ? run.scenarios : [];
          const nextScenarios = scenarios.map((sc: any) => {
            const baseInput = (sc && sc.input && typeof sc.input === "object") ? sc.input : {};
            const mergedInput = { ...forced, ...baseInput };
            return { ...sc, input: mergedInput };
          });
          const { parameters, ...rest } = run || {};
          return { ...rest, scenarios: nextScenarios };
        });

        if (transformedRuns.length > 0) {
          hasLoadedTemplateRef.current = true;
          setJsonText(JSON.stringify(transformedRuns, null, 2));
        }
      } catch {
        // ignore
      }
    };

    run();
    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh") { run(); }
      } catch {}
    });
    return () => { try { (removeHub as any)?.(); } catch {}; cancelled = true; };
  }, [refAdeme]);

  // On init: if URL contains ?ref_ademe=..., call backoffice endpoint (Bearer included when available)
  useEffect(() => {
    if (hasInitFetchedRef.current) return;
    const url = new URL(window.location.href);
    const refAdeme = url.searchParams.get("ref_ademe");
    const hasSimulParam = url.searchParams.has("simul");
    if (!hasSimulParam) return; // do not auto-fetch when simul is not explicitly provided
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (simul === "default") return;
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

  // When only ref_ademe is present and no simul param, initialize editor to [] and open load modal (after token available)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hasRef = Boolean(url.searchParams.get("ref_ademe"));
        const hasSimul = url.searchParams.has("simul");
        if (hasRef && !hasSimul) {
          if (!hasUserEditedRef.current) setJsonText("[]");
          const token = await waitForAccessToken(15000, 250);
          if (cancelled) return;
          if (token) setIsLoadSavedOpen(true);
        }
      } catch {}
    };
    run();
    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh") { run(); }
      } catch {}
    });
    return () => { try { (removeHub as any)?.(); } catch {}; cancelled = true; };
  }, [refAdeme]);

  // When opening with both ref_ademe and simul, expand the editor drawer by default
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const hasRef = Boolean(url.searchParams.get("ref_ademe"));
      const simul = url.searchParams.get("simul");
      if (hasRef && simul && simul !== "default") {
        setIsEditorOpen(true);
      }
    } catch {}
  }, [refAdeme, simulLog]);

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

  // If no Cognito token becomes available shortly after load, redirect to sign-in
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await waitForAccessToken(5000, 250);
        if (cancelled) return;
        if (token) return; // already authenticated
        // Compute auth URL similarly to TopMenu.authHref
        const configured = import.meta.env.VITE_AUTH_URL as string | undefined;
        const buildAuthBase = () => {
          if (configured) {
            try {
              const configuredUrl = new URL(configured);
              const isConfiguredLocal = ["localhost", "127.0.0.1"].includes(configuredUrl.hostname);
              const isPageLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
              if (isConfiguredLocal && !isPageLocal) {
                // ignore local auth URL on non-localhost pages
              } else {
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
        };
        const authBase = buildAuthBase();
        const sep = authBase.includes("?") ? "&" : "?";
        const target = `${authBase}${sep}returnTo=${encodeURIComponent(window.location.href)}`;
        window.location.href = target;
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Capture the JSON snapshot when opening the editor to detect unconfirmed changes
  useEffect(() => {
    try {
      if (isEditorOpen) {
        editorOriginalTextRef.current = jsonText || "";
      }
    } catch {}
  }, [isEditorOpen]);

  // Compute combinations count based on current JSON, ref_ademe and simul
  useEffect(() => {
    try { combinationsAbortRef.current?.abort(); } catch {}
    const simulName = (simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl");
    if (!refAdeme || !simulName) { setTotalCombinations(undefined); return; }
    // Validate and parse JSON before calling
    let parsedSimul: unknown = {};
    try { parsedSimul = jsonText.trim() ? JSON.parse(jsonText) : {}; } catch { setTotalCombinations(undefined); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const url = new URL("/backoffice/simulation_count", base);
        url.searchParams.set("ref_ademe", String(refAdeme));
        url.searchParams.set("simul", String(simulName));
        const controller = new AbortController();
        combinationsAbortRef.current = controller;
        const res = await authorizedFetch(url.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          body: JSON.stringify({ ref_ademe: refAdeme, simul: simulName, simul_content: parsedSimul }),
          signal: controller.signal,
        });
        if (!res.ok) { setTotalCombinations(undefined); return; }
        const data: any = await res.json().catch(() => null);
        const value = Number(((data && data.data && data.data.total_combinations) ?? (data && data.total_combinations)) as any);
        if (Number.isFinite(value)) setTotalCombinations(value); else setTotalCombinations(undefined);
      } catch {
        setTotalCombinations(undefined);
      }
    }, 600);
    return () => { cancelled = true; try { window.clearTimeout(timer); } catch {}; };
  }, [refAdeme, simulLog, jsonText]);

  // (removed nbCombinations UI; we rely on dynamically computed totalCombinations)

  // Submit is always enabled now

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

  async function fetchQueueOnce() {
    try {
      if (!refAdeme) return;
      const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
      const simulName = simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
      const urlQueue = new URL("/backoffice/get_redis_detail", base);
      urlQueue.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlQueue.searchParams.set("log", `${simulName}_o3cl_queue`);
      const urlDoing = new URL("/backoffice/get_redis_detail", base);
      urlDoing.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDoing.searchParams.set("log", `${simulName}_o3cl_doing_queue`);
      const urlDone = new URL("/backoffice/get_redis_detail", base);
      urlDone.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDone.searchParams.set("log", `${simulName}_o3cl_done_queue`);

      const [qres, doingRes, dres] = await Promise.all([
        authorizedFetch(urlQueue.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        authorizedFetch(urlDoing.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        authorizedFetch(urlDone.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
      ]);

      const parseItems = async (res: Response): Promise<any[]> => {
        if (!res.ok) return [];
        const data: any = await res.json().catch(() => null);
        if (Array.isArray(data?.items)) return data.items as any[];
        if (Array.isArray(data)) return data as any[];
        if (data && typeof data === "object" && Array.isArray((data as any).queue)) return (data as any).queue as any[];
        return [];
      };

      const [queueList, doingListRaw, doneListRaw] = await Promise.all([parseItems(qres), parseItems(doingRes), parseItems(dres)]);
      const doingList = (doingListRaw || []).map((it: any) => ({ ...it, status: 1, __kind: "doing" }));
      const doneList = (doneListRaw || []).map((it: any) => ({ ...it, status: 2, __kind: "done" }));
      const merged = [...doneList, ...doingList, ...queueList];
      setQueueItems(merged);
      setQueueSegments(merged.length || 0);
      setCurrentDoneCount(doneList.length || 0);

      // Stop polling when both running and doing queues become empty
      if ((queueList?.length || 0) === 0 && (doingList?.length || 0) === 0) {
        try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
      }
    } catch {}
  }

  function startQueuePolling(opts?: { skipImmediate?: boolean }) {
    try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    const raw = (import.meta as any)?.env?.VITE_POLL_QUEUE_DELAY;
    const n = Number(raw);
    const delayMs = Number.isFinite(n) && n > 0 ? n : 5000;
    if (!opts?.skipImmediate) { void fetchQueueOnce(); }
    const id = window.setInterval(fetchQueueOnce, delayMs);
    queuePollIdRef.current = id;
  }

  function handleRefreshProgress() {
    try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    const raw = (import.meta as any)?.env?.VITE_POLL_QUEUE_DELAY;
    const n = Number(raw);
    const delayMs = Number.isFinite(n) && n > 0 ? n : 5000;
    void fetchQueueOnce();
    window.setTimeout(() => { void fetchQueueOnce(); }, delayMs);
    window.setTimeout(() => { void fetchQueueOnce(); }, delayMs * 2);
  }

  useEffect(() => {
    return () => {
      try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    };
  }, []);

  useEffect(() => {
    if (!queueItems.length) return;
    const id = window.setInterval(() => setQueueNowTick((t) => t + 1), 1000);
    return () => { try { window.clearInterval(id); } catch {} };
  }, [queueItems.length]);

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
          nb_combinations: Number(totalCombinations || 0),
          query,
        },
      };
      setSubmitting(true);
      // Only call direct_scenarios when nb chunks <= 1
      const shouldDirect = Number(numChunks || 1) <= 1;
      if (shouldDirect) {
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
        // eslint-disable-next-line no-console
        console.log("simulation payload", body);
      }
      try { activePollAbortRef.current?.cancel(); } catch {}
      setIsPolling(false);
      // After submit, start polling only the queue/done endpoints. Delay first hit to avoid hitting on first tick.
      startQueuePolling({ skipImmediate: true });
      // If nb chunks > 1, also call append_scenarios
      if (Number(numChunks || 1) > 1) {
        const appendBody = {
          redis_db: 1,
          task: "tasks.ext_o3cl_managing.init_scenarios",
          args: {
            run_name: simulLog || "dev_report_o3cl",
            ref_ademe: refAdeme,
            nb_chunks: Number(numChunks || 1),
            nb_workers: Number(numWorkers || 1),
            nb_combinations: Number(totalCombinations || 0),
            query,
          },
        } as Record<string, unknown>;
        try {
          const res2 = await fetch(lambdaUrl, {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(appendBody),
          });
          if (!res2.ok) {
            const txt2 = await res2.text().catch(() => "");
            throw new Error(`HTTP ${res2.status} ${txt2}`);
          }
          message.success(`appending scenarios across ${Number(numChunks)} chunks`);
          // eslint-disable-next-line no-console
          console.debug("append_scenarios payload", appendBody);
        } catch (e) {
          message.error("Failed to append scenarios");
        }
      }
    } catch (err) {
      message.error("Invalid JSON");
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmWorkers() {
    const value = Number(numWorkers || 0);
    const allowed = [1, 2, 3, 4, 6, 8];
    if (!allowed.includes(value)) {
      setWorkersError(`Invalid workers: ${value}. Allowed: ${allowed.join(", ")}`);
      setConfirmedWorkers(undefined);
      return;
    }
    setWorkersError(undefined);
    setConfirmedWorkers(value);

    // Call scaling lambda
    const lambdaUrl = (import.meta.env.VITE_SIMULATION_LAMBDA_URL as string) || "https://6vyebgqw4plhmxrewmsgh6yere0bwpos.lambda-url.eu-west-3.on.aws/";
    const body = {
      redis_db: 1,
      task: "tasks.r_ecs_scaling.scale",
      args: {
        cluster: "checkdpe-dev-cluster",
        service: "checkdpe-cd-3cl-dev-service",
        desired: value,
      },
    };
    // eslint-disable-next-line no-console
    console.debug("[simulation] scaling workers", body);
    fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${txt}`);
        }
        message.success(`updated workers to ${value}`);
      })
      .catch(() => {
        message.error("failed to update workers");
      });
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        {isEditorOpen ? (
          <div style={{ position: "sticky", top: 24, alignSelf: "flex-start" }}>
            <DpeDrawerEditor
              inline
              open={isEditorOpen}
              onClose={() => setIsEditorOpen(false)}
              width={480}
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
                  const variantPath = `dpe.logement.enveloppe.${collection}.${itemKey}`;
                  let searchFrom = 0;
                  let scopeArrayStart = -1;
                  let scopeArrayEnd = -1;
                  while (true) {
                    const varIdx = text.indexOf('"elements_variant"', searchFrom);
                    if (varIdx === -1) break;
                    const quoteIdx = text.indexOf('"', varIdx + 18);
                    const quoteEnd = quoteIdx !== -1 ? text.indexOf('"', quoteIdx + 1) : -1;
                    const value = quoteIdx !== -1 && quoteEnd !== -1 ? text.slice(quoteIdx + 1, quoteEnd) : '';
                    if (value === variantPath) {
                      const scopeKeyIdx = text.indexOf('"elements_scope"', varIdx);
                      if (scopeKeyIdx !== -1) {
                        const openBracket = text.indexOf('[', scopeKeyIdx);
                        if (openBracket !== -1) {
                          scopeArrayStart = openBracket;
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
                  try { (ta as any).focus({ preventScroll: true }); } catch { try { ta.focus(); } catch {} }
                  try { ta.setSelectionRange(scopeArrayStart, scopeArrayEnd); } catch {}
                  try { ta.scrollTop = prevScrollTop; ta.scrollLeft = prevScrollLeft; } catch {}
                  window.setTimeout(() => {
                    try {
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
        ) : null}

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Simulation</Title>
              <Button type="primary" size="large" icon={<LeftOutlined />} onClick={openEditor} disabled={isEditorOpen}>Edit</Button>
            </div>
            <Button onClick={() => setIsChainlitOpen(true)}>build with AI</Button>
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
                    label: (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>Options</span>
                        {typeof totalCombinations === "number" ? (
                          <strong style={{ fontWeight: 600 }}>combinations: {totalCombinations}</strong>
                        ) : null}
                      </div>
                    ),
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
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <InputNumber value={1} disabled style={{ width: 140 }} min={1} />
                            <span style={{ color: "#6b7280", fontSize: 12 }}>(read-only)</span>
                          </div>
                        </div>
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
              <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                <Tooltip title={isChunksTooBig ? "chunks too big (max.50)" : undefined}>
                  <span style={{ display: "inline-block" }}>
                    <Button type="primary" onClick={handleSubmit} loading={submitting} disabled={isChunksTooBig}>submit</Button>
                  </span>
                </Tooltip>
                <div style={{ position: "relative" }}>
                  <Button onClick={() => setIsSaveMenuOpen((v) => !v)}>...</Button>
                  {isSaveMenuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, width: 260, boxShadow: "0 4px 14px rgba(0,0,0,0.08)", zIndex: 10 }}>
                    <div style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6 }} onClick={() => { setIsLoadSavedOpen(true); setIsSaveMenuOpen(false); }}>load scenario</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={() => { if (!isSaving) handleSaveToBackoffice(); }}>save {simulLog || "default"}</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={async () => {
                      if (isSaving) return;
                      const cdEnv = ((import.meta as any)?.env?.VITE_CD_ENV as string | undefined) || (import.meta.env.MODE === "development" ? "dev" : "prod");
                      const suggested = `${cdEnv}_simul_${simulLog || "test0001"}`;
                      const name = window.prompt(
                        "Save as name (format: <CD_ENV>_simul_<name>, e.g., dev_simul_test0001):",
                        suggested
                      );
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
                        if (refAdeme) {
                          const { origin, pathname } = window.location;
                          const basePath = (() => {
                            try {
                              const idx = pathname.lastIndexOf("/");
                              return idx !== -1 ? pathname.slice(0, idx + 1) : "/";
                            } catch {
                              return "/";
                            }
                          })();
                          const targetUrl = `${origin}${basePath}index.html?ref_ademe=${encodeURIComponent(refAdeme)}&simul=${encodeURIComponent(name)}`;
                          window.location.href = targetUrl;
                        }
                      } catch {
                        message.error("save failed");
                      } finally {
                        setIsSaving(false);
                        setIsSaveMenuOpen(false);
                      }
                    }}>save as…</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6 }} onClick={() => { handleRefreshProgress(); setIsSaveMenuOpen(false); }}>refresh progress</div>
                    </div>
                  )}
                </div>
              </div>
              {queueSegments > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 10, background: "#e5e7eb", borderRadius: 8, overflow: "hidden", display: "flex" }}>
                    {(queueItems.length ? queueItems : Array.from({ length: queueSegments })).map((item: any, idx: number) => {
                      const ts = item?.ts_started;
                      let startedAtMs = 0;
                      try {
                        if (typeof ts === "number") startedAtMs = ts > 1e12 ? ts : ts * 1000;
                        else if (typeof ts === "string") {
                          const n = Number(ts);
                          if (Number.isFinite(n)) startedAtMs = n > 1e12 ? n : n * 1000; else {
                            const t = Date.parse(ts);
                            if (!Number.isNaN(t)) startedAtMs = t;
                          }
                        }
                      } catch {}
                      const elapsedSec = Math.max(0, (Date.now() - startedAtMs) / 1000);
                      const statusNum = Number(item?.status ?? 0);
                      const pct = statusNum >= 2 ? 100 : Math.max(0, Math.min(100, (elapsedSec / 60) * 100));
                      const fillColor = statusNum >= 2 ? "#22c55e" : (statusNum >= 1 ? "#93c5fd" : "transparent");
                      return (
                        <div key={idx} style={{ flex: 1, display: "flex" }}>
                          <div style={{ width: `${pct}%`, background: fillColor, transition: "width 1s linear" }} />
                          {idx < queueSegments - 1 ? (
                            <div style={{ width: 2, background: "#ffffff" }} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-start", minHeight: 24 }}>
                {!resultsUrl && isPolling && (
                  <Spin size="small" />
                )}
                {resultsUrl && (
                  <a href={resultsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Open simulation results <ExportOutlined />
                  </a>
                )}
              </div>
              {refAdeme ? (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Results preview</Title>
                    <Button
                      size="small"
                      onClick={() => {
                        setLastRefreshedDoneCount(currentDoneCount);
                        setResultsRefreshKey((k) => k + 1);
                      }}
                    >
                      refresh
                    </Button>
                  </div>
                  <Card style={{ background: "#ffffff", borderColor: "#e5e7eb" }} styles={{ body: { padding: 16 } }}>
                    <SimulationResults
                      key={resultsRefreshKey}
                      dpeId={refAdeme}
                      simul={simulLog}
                      getAccessToken={async () => (await getAccessToken()) || undefined}
                      apiBaseUrl={(import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr"}
                      width={720}
                      height={300}
                      onSelectPoint={(p) => setSelectedPoint(p)}
                      onPointDetail={(d) => setSelectedPointDetail(d)}
                      selectedIndex={selectedPoint?.index}
                      primaryColor="#1677ff"
                      xMetric={resultsXMetric}
                      yMetric={resultsYMetric}
                      onXMetricChange={setResultsXMetric}
                      onYMetricChange={setResultsYMetric}
                      mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }}
                    />
                    <div style={{ marginTop: 12 }}>
                      <SimulationDetailCard point={selectedPoint || undefined} mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }} />
                      {(() => {
                        try {
                          const raw = (selectedPointDetail && (selectedPointDetail as any).redis_obj) as unknown;
                          if (raw == null) return null;
                          let pretty = "";
                          if (typeof raw === "string") {
                            try { pretty = JSON.stringify(JSON.parse(raw), null, 2); }
                            catch { pretty = String(raw); }
                          } else if (typeof raw === "object") {
                            pretty = JSON.stringify(raw, null, 2);
                          } else {
                            pretty = String(raw);
                          }
                          return (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ color: "#4b5563", marginBottom: 6 }}>redis_obj</div>
                              <pre style={{ margin: 0, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{pretty}
                              </pre>
                            </div>
                          );
                        } catch { return null; }
                      })()}
                    </div>
                  </Card>
                </div>
              ) : null}
              {/* editor inline panel is rendered on the right */}
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
            <LoadScenarioModal
              open={isLoadSavedOpen}
              onCancel={() => setIsLoadSavedOpen(false)}
              onSelect={(payload: unknown) => {
                try {
                  // Accept payload either as normalized object { ref_ademe, label } or string "ref:label"
                  let ref: string | undefined;
                  let simul: string | undefined;
                  if (typeof payload === "string") {
                    const colon = payload.indexOf(":");
                    ref = colon !== -1 ? payload.slice(0, colon) : undefined;
                    simul = colon !== -1 ? payload.slice(colon + 1) : undefined;
                  } else if (payload && typeof payload === "object") {
                    ref = (payload as any).ref_ademe as string | undefined;
                    simul = (payload as any).label as string | undefined;
                  }
                  const url = new URL(window.location.href);
                  if (ref) url.searchParams.set("ref_ademe", ref);
                  if (simul) url.searchParams.set("simul", simul);
                  window.location.href = url.toString();
                } catch {}
                setIsLoadSavedOpen(false);
              }}
              baseUrl={(import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr"}
              initialRefAdeme={refAdeme}
              getAccessToken={getAccessToken}
            />
          </Card>
        </div>

        {(() => {
          const chainlitUrl = (() => {
            const configured = import.meta.env.VITE_CHAINLIT_URL as string | undefined;
            if (configured && typeof configured === "string" && configured.trim()) return configured.trim();
            return "https://chainlit-stg.etiquettedpe.fr/chainlit";
          })();
          return (
            <ChainlitChatDrawer
              open={isChainlitOpen}
              onClose={() => setIsChainlitOpen(false)}
              title="Assistant"
              serverUrl={chainlitUrl}
              userEnv={{
                mail: "germain.blanchet@gmail.com",
                button_id: "contactez_nous",
                ref_ademe: refAdeme || "2508E0243162W",
              }}
            />
          );
        })()}

      </div>
      </div>
    </div>
  );
};



```

Added redis_obj details rendering.

- Upon clicking a point, we already fetch from simulation_graph_detail. I wired its response to state and render a JSON view of redis_obj under the existing `SimulationDetailCard`.
- Handles stringified JSON or object; shows nicely formatted JSON.

Key edits:
- `apps/simul/src/App.tsx`: store `selectedPointDetail`, pass `onPointDetail` to `SimulationResults`, render a prettified `redis_obj` in a `<pre>` block.

---

**User**

just manage modiferId return 
it look like that : for each element , 
select the item in left panel "-1" means the #current one , then you got the id
if there are multiple items like that ""dpe.logement.enveloppe.mur_collection.mur"," => do not try selecting anything
"modifierId": [
          {
            "path": "dpe.logement.enveloppe.plancher_haut_collection.plancher_haut",
            "seq": [
              -1
            ]
          },
          {
            "path": "dpe.logement.enveloppe.plancher_bas_collection.plancher_bas",
            "seq": [
              -1
            ]
          },
          {
            "path": "dpe.logement.enveloppe.mur_collection.mur",
            "seq": [
              -1,
              202,
              202,
              -1,
              -1
            ]
          }
        ],

---

**Cursor**

I'll update the left panel editor to accept a modifier selection and apply it by setting the elements_scope based on the modifierId data, and wire this from the detail response. Then I'll lint the edited files.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

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
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
  // Optional: selection hints from a simulation detail endpoint
  modifierSelection?: { path: string; seq: number[] }[] | null;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);
  // Keep a copy of the fetched envelope to derive options when variants appear
  const [envelopeData, setEnvelopeData] = useState<any | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Store envelope for later option derivation (after variant defs resolve)
            try {
              const env = (data as any)?.dpe?.logement?.enveloppe || null;
              setEnvelopeData(env);
            } catch {}
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Rebuild available options whenever variants resolve and we have envelope data, also sync selected from JSON
  useEffect(() => {
    try {
      if (!envelopeData) return;
      const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
        const collectionObj = envelopeData?.[v.collection];
        let items: any[] = [];
        if (Array.isArray(collectionObj?.[v.itemKey])) {
          items = collectionObj[v.itemKey] as any[];
        } else if (Array.isArray(collectionObj)) {
          items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
        }
        optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
          key: String(item?.donnee_entree?.reference || idx),
          description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
          selected: scopes.includes(idx),
          payload: item,
        }));
      }
      setAvailableOptions(optionsMap);
    } catch {}
  }, [envelopeData, variantDefs]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

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
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
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

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
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

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
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
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] } as any;
                              // Default scope to all available options for this variant when enabling
                              try {
                                const opts = availableOptions[v.id] || [];
                                entry.elements_scope = opts.map((_, i) => i);
                              } catch {}
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
                            } else {
                              const entry = runs[idxInRuns];
                              if (!Array.isArray(entry.elements_scope) || entry.elements_scope.length === 0) {
                                try {
                                  const opts = availableOptions[v.id] || [];
                                  entry.elements_scope = opts.map((_: any, i: number) => i);
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
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
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
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
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {/* Row 0: always-present current scenario derived from envelopeData */}
                  {(() => {
                    try {
                      // Determine configured input key to read from envelope items
                      const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
                      const inputPath = String(configuredInputKey || "").split(".").filter(Boolean);
                      // Determine current scopes for this variant
                      let parsed: any = [];
                      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                      const runsArr: any[] = Array.isArray(parsed) ? parsed : [];
                      const entry = runsArr.find((r) => r && r.elements_variant === v.id) || {};
                      let scopes: number[] = Array.isArray(entry.elements_scope) ? (entry.elements_scope as number[]) : [];
                      if (!scopes.length) {
                        // Fallback to UI options selection if JSON has no scopes
                        scopes = (availableOptions[v.id] || []).map((o, idx) => (o.selected ? idx : -1)).filter((n) => n !== -1);
                      }
                      // Collect values from envelope items for selected scopes
                      const collectionObj = envelopeData?.[v.collection];
                      let items: any[] = [];
                      if (Array.isArray(collectionObj?.[v.itemKey])) {
                        items = collectionObj[v.itemKey] as any[];
                      } else if (Array.isArray(collectionObj)) {
                        items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
                      }
                      const nums: number[] = scopes
                        .map((idx) => {
                          const item = items?.[idx];
                          const val = inputPath.length ? deepGet(item, inputPath as any) : undefined;
                          const num = typeof val === "number" ? val : Number(val);
                          return Number.isFinite(num) ? num : NaN;
                        })
                        .filter((n) => Number.isFinite(n)) as number[];
                      let displayVal: string = "—";
                      if (nums.length) {
                        const min = Math.min(...nums);
                        const max = Math.max(...nums);
                        displayVal = min === max ? String(min) : `${min}-${max}`;
                      }
                      return (
                        <>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 12 }}>
                            <Checkbox checked disabled />
                            <span>#current</span>
                          </label>
                          <div style={{ fontSize: 12, color: "#374151" }}>
                            {displayVal}
                          </div>
                          <div>
                            <InputNumber size="small" controls={false} min={0} value={0} disabled style={{ width: "100%" }} />
                          </div>
                        </>
                      );
                    } catch {
                      return null;
                    }
                  })()}

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
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
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
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
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

I'll add logic in `DpeDrawerEditor.tsx` to apply `modifierSelection` by updating `elements_scope` for matching variants (only when a single item is implied). I'll also compute and pass `modifierSelection` from `apps/simul/src/App.tsx` based on the detail response, handling both direct `modifierId` and nested `redis_obj`. Then I'll run linter checks on both files.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

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
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
  // Optional: selection hints from a simulation detail endpoint
  modifierSelection?: { path: string; seq: number[] }[] | null;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false, modifierSelection = null }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);
  // Keep a copy of the fetched envelope to derive options when variants appear
  const [envelopeData, setEnvelopeData] = useState<any | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Store envelope for later option derivation (after variant defs resolve)
            try {
              const env = (data as any)?.dpe?.logement?.enveloppe || null;
              setEnvelopeData(env);
            } catch {}
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Rebuild available options whenever variants resolve and we have envelope data, also sync selected from JSON
  useEffect(() => {
    try {
      if (!envelopeData) return;
      const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
        const collectionObj = envelopeData?.[v.collection];
        let items: any[] = [];
        if (Array.isArray(collectionObj?.[v.itemKey])) {
          items = collectionObj[v.itemKey] as any[];
        } else if (Array.isArray(collectionObj)) {
          items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
        }
        optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
          key: String(item?.donnee_entree?.reference || idx),
          description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
          selected: scopes.includes(idx),
          payload: item,
        }));
      }
      setAvailableOptions(optionsMap);
    } catch {}
  }, [envelopeData, variantDefs]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

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
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
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

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
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

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
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
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  // Apply external modifier selection: set elements_scope for matching variant when unambiguous
  useEffect(() => {
    try {
      if (!open) return;
      if (!modifierSelection || !Array.isArray(modifierSelection) || modifierSelection.length === 0) return;
      // Parse current runs
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      if (!Array.isArray(parsed)) return;
      const runs: any[] = parsed;
      let changed = false;
      for (const mod of modifierSelection) {
        try {
          const path = String((mod as any)?.path || "");
          const seq: number[] = Array.isArray((mod as any)?.seq) ? ((mod as any).seq as number[]).map((n) => Number(n)) : [];
          if (!path || !seq.length) continue;
          const parsedPath = parseVariantPath(path);
          if (!parsedPath) continue;
          const variantId = `dpe.logement.enveloppe.${parsedPath.collection}.${parsedPath.itemKey}`;
          // Only apply when there is a single target (seq length is 1)
          if (seq.length !== 1) continue;
          const desired = seq[0];
          const entryIndex = runs.findIndex((r) => r && r.elements_variant === variantId);
          if (entryIndex === -1) continue;
          const entry = runs[entryIndex];
          // Resolve envelope items for this variant to map id->index
          const collectionObj = envelopeData?.[parsedPath.collection];
          let items: any[] = [];
          if (Array.isArray(collectionObj?.[parsedPath.itemKey])) {
            items = collectionObj[parsedPath.itemKey] as any[];
          } else if (Array.isArray(collectionObj)) {
            items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[parsedPath.itemKey] : undefined)).filter(Boolean);
          }
          if (!Array.isArray(items) || items.length === 0) continue;
          let idxToSelect = -1;
          if (desired === -1) {
            // "current" -> select the only item when unambiguous (single item)
            if (items.length === 1) idxToSelect = 0;
          } else if (Number.isFinite(desired)) {
            // Try match by donnee_entree.reference
            const targetId = Number(desired);
            idxToSelect = items.findIndex((it: any) => Number((it?.donnee_entree?.reference as any)) === targetId);
          }
          if (idxToSelect !== -1) {
            const scopes: number[] = [idxToSelect];
            if (!Array.isArray(entry.elements_scope) || String(entry.elements_scope) !== String(scopes)) {
              entry.elements_scope = scopes;
              changed = true;
            }
          }
        } catch {}
      }
      if (changed) onApply(JSON.stringify(runs, null, 2));
    } catch {}
  }, [open, modifierSelection, rootJsonText, envelopeData, variantDefs, onApply]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] } as any;
                              // Default scope to all available options for this variant when enabling
                              try {
                                const opts = availableOptions[v.id] || [];
                                entry.elements_scope = opts.map((_, i) => i);
                              } catch {}
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
                            } else {
                              const entry = runs[idxInRuns];
                              if (!Array.isArray(entry.elements_scope) || entry.elements_scope.length === 0) {
                                try {
                                  const opts = availableOptions[v.id] || [];
                                  entry.elements_scope = opts.map((_: any, i: number) => i);
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
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
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
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
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {/* Row 0: always-present current scenario derived from envelopeData */}
                  {(() => {
                    try {
                      // Determine configured input key to read from envelope items
                      const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
                      const inputPath = String(configuredInputKey || "").split(".").filter(Boolean);
                      // Determine current scopes for this variant
                      let parsed: any = [];
                      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                      const runsArr: any[] = Array.isArray(parsed) ? parsed : [];
                      const entry = runsArr.find((r) => r && r.elements_variant === v.id) || {};
                      let scopes: number[] = Array.isArray(entry.elements_scope) ? (entry.elements_scope as number[]) : [];
                      if (!scopes.length) {
                        // Fallback to UI options selection if JSON has no scopes
                        scopes = (availableOptions[v.id] || []).map((o, idx) => (o.selected ? idx : -1)).filter((n) => n !== -1);
                      }
                      // Collect values from envelope items for selected scopes
                      const collectionObj = envelopeData?.[v.collection];
                      let items: any[] = [];
                      if (Array.isArray(collectionObj?.[v.itemKey])) {
                        items = collectionObj[v.itemKey] as any[];
                      } else if (Array.isArray(collectionObj)) {
                        items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
                      }
                      const nums: number[] = scopes
                        .map((idx) => {
                          const item = items?.[idx];
                          const val = inputPath.length ? deepGet(item, inputPath as any) : undefined;
                          const num = typeof val === "number" ? val : Number(val);
                          return Number.isFinite(num) ? num : NaN;
                        })
                        .filter((n) => Number.isFinite(n)) as number[];
                      let displayVal: string = "—";
                      if (nums.length) {
                        const min = Math.min(...nums);
                        const max = Math.max(...nums);
                        displayVal = min === max ? String(min) : `${min}-${max}`;
                      }
                      return (
                        <>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 12 }}>
                            <Checkbox checked disabled />
                            <span>#current</span>
                          </label>
                          <div style={{ fontSize: 12, color: "#374151" }}>
                            {displayVal}
                          </div>
                          <div>
                            <InputNumber size="small" controls={false} min={0} value={0} disabled style={{ width: "100%" }} />
                          </div>
                        </>
                      );
                    } catch {
                      return null;
                    }
                  })()}

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
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
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
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
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./amplify";
import { authorizedFetch, waitForAccessToken, getAccessToken, setBridgeAccessToken } from "./auth";
import { Hub } from "aws-amplify/utils";
import { Button, Card, Col, Flex, Input, InputNumber, Row, Select, Space, Typography, message, Spin, Collapse, Tooltip } from "antd";
import { ExportOutlined, LeftOutlined } from "@ant-design/icons";
import { SimulationScenariosModal } from "@acme/simulation-scenarios";
import { LoadScenarioModal } from "@acme/load-scenario";
import { DpeDrawerEditor, fetchSimulationTemplateJson } from "@acme/dpe-editor";
import { SimulationResults } from "@acme/simulation-results";
import { ChainlitChatDrawer } from "@acme/chainlit-client";
import { TopMenu } from "@acme/top-menu";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { flushSync } from "react-dom";
import { SimulationDetailCard } from "@acme/simulation-detail";

const { Title, Paragraph } = Typography;

export const App: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>("{\n  \"items\": []\n}");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [apiDebug, setApiDebug] = useState<number | undefined>(undefined);
  const [skip, setSkip] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [numChunks, setNumChunks] = useState<number>(1);
  useEffect(() => { setNumChunks(2); }, []);
  const [totalCombinations, setTotalCombinations] = useState<number | undefined>(undefined);
  const [numWorkers, setNumWorkers] = useState<number>(1);
  const [confirmedWorkers, setConfirmedWorkers] = useState<number | undefined>(undefined);
  const [workersError, setWorkersError] = useState<string | undefined>(undefined);
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
  const [isLoadSavedOpen, setIsLoadSavedOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isChainlitOpen, setIsChainlitOpen] = useState<boolean>(false);
  const [queueSegments, setQueueSegments] = useState<number>(0);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const queuePollIdRef = useRef<number | null>(null);
  const [queueNowTick, setQueueNowTick] = useState<number>(0);
  const [currentDoneCount, setCurrentDoneCount] = useState<number>(0);
  const [lastRefreshedDoneCount, setLastRefreshedDoneCount] = useState<number>(0);
  const [resultsRefreshKey, setResultsRefreshKey] = useState<number>(0);
  const [selectedPoint, setSelectedPoint] = useState<{ index: number; ep?: number; ges?: number; cost?: number; letter?: string } | null>(null);
  const [resultsXMetric, setResultsXMetric] = useState<"index" | "cost">("index");
  const [resultsYMetric, setResultsYMetric] = useState<"ep" | "ges">("ep");
  const [selectedPointDetail, setSelectedPointDetail] = useState<any | null>(null);
  const [modifierSelection, setModifierSelection] = useState<{ path: string; seq: number[] }[] | null>(null);
  const isChunksTooBig = useMemo(() => {
    if (typeof totalCombinations !== "number") return false;
    const chunks = Math.max(1, Number(numChunks || 1));
    return (totalCombinations / chunks) > 50;
  }, [totalCombinations, numChunks]);
  function openEditor() { setIsEditorOpen(true); }
  const hasLoadedTemplateRef = useRef<boolean>(false);
  const editorOriginalTextRef = useRef<string>("");
  const combinationsAbortRef = useRef<AbortController | null>(null);

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
    const hasSimulParam = url.searchParams.has("simul");
    if (!hasSimulParam) return; // do not auto-fetch when simul is not explicitly provided
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (simul === "default") return;
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

  // On init: if URL contains simul=default, call template endpoint and initialize editor JSON
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (cancelled) return;
        if (hasLoadedTemplateRef.current) return;
        const url = new URL(window.location.href);
        const simul = url.searchParams.get("simul");
        if (simul !== "default") return;
        if (!refAdeme) return;
        if (hasUserEditedRef.current) return;

        const accessToken = await waitForAccessToken(15000, 250);
        if (!accessToken) return;

        const baseUrl = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const template = await fetchSimulationTemplateJson<any>({ baseUrl, ref_ademe: refAdeme, accessToken });
        if (cancelled) return;

        const sourceRuns: any[] = Array.isArray(template)
          ? template
          : (template && Array.isArray(template.runs) ? template.runs : []);

        const transformedRuns = sourceRuns.map((run) => {
          const forced = run?.parameters?.input_forced || {};
          const scenarios = Array.isArray(run?.scenarios) ? run.scenarios : [];
          const nextScenarios = scenarios.map((sc: any) => {
            const baseInput = (sc && sc.input && typeof sc.input === "object") ? sc.input : {};
            const mergedInput = { ...forced, ...baseInput };
            return { ...sc, input: mergedInput };
          });
          const { parameters, ...rest } = run || {};
          return { ...rest, scenarios: nextScenarios };
        });

        if (transformedRuns.length > 0) {
          hasLoadedTemplateRef.current = true;
          setJsonText(JSON.stringify(transformedRuns, null, 2));
        }
      } catch {
        // ignore
      }
    };

    run();
    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh") { run(); }
      } catch {}
    });
    return () => { try { (removeHub as any)?.(); } catch {}; cancelled = true; };
  }, [refAdeme]);

  // On init: if URL contains ?ref_ademe=..., call backoffice endpoint (Bearer included when available)
  useEffect(() => {
    if (hasInitFetchedRef.current) return;
    const url = new URL(window.location.href);
    const refAdeme = url.searchParams.get("ref_ademe");
    const hasSimulParam = url.searchParams.has("simul");
    if (!hasSimulParam) return; // do not auto-fetch when simul is not explicitly provided
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (simul === "default") return;
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

  // When only ref_ademe is present and no simul param, initialize editor to [] and open load modal (after token available)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hasRef = Boolean(url.searchParams.get("ref_ademe"));
        const hasSimul = url.searchParams.has("simul");
        if (hasRef && !hasSimul) {
          if (!hasUserEditedRef.current) setJsonText("[]");
          const token = await waitForAccessToken(15000, 250);
          if (cancelled) return;
          if (token) setIsLoadSavedOpen(true);
        }
      } catch {}
    };
    run();
    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh") { run(); }
      } catch {}
    });
    return () => { try { (removeHub as any)?.(); } catch {}; cancelled = true; };
  }, [refAdeme]);

  // When opening with both ref_ademe and simul, expand the editor drawer by default
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const hasRef = Boolean(url.searchParams.get("ref_ademe"));
      const simul = url.searchParams.get("simul");
      if (hasRef && simul && simul !== "default") {
        setIsEditorOpen(true);
      }
    } catch {}
  }, [refAdeme, simulLog]);

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

  // If no Cognito token becomes available shortly after load, redirect to sign-in
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await waitForAccessToken(5000, 250);
        if (cancelled) return;
        if (token) return; // already authenticated
        // Compute auth URL similarly to TopMenu.authHref
        const configured = import.meta.env.VITE_AUTH_URL as string | undefined;
        const buildAuthBase = () => {
          if (configured) {
            try {
              const configuredUrl = new URL(configured);
              const isConfiguredLocal = ["localhost", "127.0.0.1"].includes(configuredUrl.hostname);
              const isPageLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
              if (isConfiguredLocal && !isPageLocal) {
                // ignore local auth URL on non-localhost pages
              } else {
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
        };
        const authBase = buildAuthBase();
        const sep = authBase.includes("?") ? "&" : "?";
        const target = `${authBase}${sep}returnTo=${encodeURIComponent(window.location.href)}`;
        window.location.href = target;
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Capture the JSON snapshot when opening the editor to detect unconfirmed changes
  useEffect(() => {
    try {
      if (isEditorOpen) {
        editorOriginalTextRef.current = jsonText || "";
      }
    } catch {}
  }, [isEditorOpen]);

  // Compute combinations count based on current JSON, ref_ademe and simul
  useEffect(() => {
    try { combinationsAbortRef.current?.abort(); } catch {}
    const simulName = (simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl");
    if (!refAdeme || !simulName) { setTotalCombinations(undefined); return; }
    // Validate and parse JSON before calling
    let parsedSimul: unknown = {};
    try { parsedSimul = jsonText.trim() ? JSON.parse(jsonText) : {}; } catch { setTotalCombinations(undefined); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const url = new URL("/backoffice/simulation_count", base);
        url.searchParams.set("ref_ademe", String(refAdeme));
        url.searchParams.set("simul", String(simulName));
        const controller = new AbortController();
        combinationsAbortRef.current = controller;
        const res = await authorizedFetch(url.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          body: JSON.stringify({ ref_ademe: refAdeme, simul: simulName, simul_content: parsedSimul }),
          signal: controller.signal,
        });
        if (!res.ok) { setTotalCombinations(undefined); return; }
        const data: any = await res.json().catch(() => null);
        const value = Number(((data && data.data && data.data.total_combinations) ?? (data && data.total_combinations)) as any);
        if (Number.isFinite(value)) setTotalCombinations(value); else setTotalCombinations(undefined);
      } catch {
        setTotalCombinations(undefined);
      }
    }, 600);
    return () => { cancelled = true; try { window.clearTimeout(timer); } catch {}; };
  }, [refAdeme, simulLog, jsonText]);

  // (removed nbCombinations UI; we rely on dynamically computed totalCombinations)

  // Submit is always enabled now

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

  async function fetchQueueOnce() {
    try {
      if (!refAdeme) return;
      const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
      const simulName = simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
      const urlQueue = new URL("/backoffice/get_redis_detail", base);
      urlQueue.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlQueue.searchParams.set("log", `${simulName}_o3cl_queue`);
      const urlDoing = new URL("/backoffice/get_redis_detail", base);
      urlDoing.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDoing.searchParams.set("log", `${simulName}_o3cl_doing_queue`);
      const urlDone = new URL("/backoffice/get_redis_detail", base);
      urlDone.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDone.searchParams.set("log", `${simulName}_o3cl_done_queue`);

      const [qres, doingRes, dres] = await Promise.all([
        authorizedFetch(urlQueue.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        authorizedFetch(urlDoing.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        authorizedFetch(urlDone.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
      ]);

      const parseItems = async (res: Response): Promise<any[]> => {
        if (!res.ok) return [];
        const data: any = await res.json().catch(() => null);
        if (Array.isArray(data?.items)) return data.items as any[];
        if (Array.isArray(data)) return data as any[];
        if (data && typeof data === "object" && Array.isArray((data as any).queue)) return (data as any).queue as any[];
        return [];
      };

      const [queueList, doingListRaw, doneListRaw] = await Promise.all([parseItems(qres), parseItems(doingRes), parseItems(dres)]);
      const doingList = (doingListRaw || []).map((it: any) => ({ ...it, status: 1, __kind: "doing" }));
      const doneList = (doneListRaw || []).map((it: any) => ({ ...it, status: 2, __kind: "done" }));
      const merged = [...doneList, ...doingList, ...queueList];
      setQueueItems(merged);
      setQueueSegments(merged.length || 0);
      setCurrentDoneCount(doneList.length || 0);

      // Stop polling when both running and doing queues become empty
      if ((queueList?.length || 0) === 0 && (doingList?.length || 0) === 0) {
        try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
      }
    } catch {}
  }

  function startQueuePolling(opts?: { skipImmediate?: boolean }) {
    try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    const raw = (import.meta as any)?.env?.VITE_POLL_QUEUE_DELAY;
    const n = Number(raw);
    const delayMs = Number.isFinite(n) && n > 0 ? n : 5000;
    if (!opts?.skipImmediate) { void fetchQueueOnce(); }
    const id = window.setInterval(fetchQueueOnce, delayMs);
    queuePollIdRef.current = id;
  }

  function handleRefreshProgress() {
    try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    const raw = (import.meta as any)?.env?.VITE_POLL_QUEUE_DELAY;
    const n = Number(raw);
    const delayMs = Number.isFinite(n) && n > 0 ? n : 5000;
    void fetchQueueOnce();
    window.setTimeout(() => { void fetchQueueOnce(); }, delayMs);
    window.setTimeout(() => { void fetchQueueOnce(); }, delayMs * 2);
  }

  useEffect(() => {
    return () => {
      try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    };
  }, []);

  useEffect(() => {
    if (!queueItems.length) return;
    const id = window.setInterval(() => setQueueNowTick((t) => t + 1), 1000);
    return () => { try { window.clearInterval(id); } catch {} };
  }, [queueItems.length]);

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
          nb_combinations: Number(totalCombinations || 0),
          query,
        },
      };
      setSubmitting(true);
      // Only call direct_scenarios when nb chunks <= 1
      const shouldDirect = Number(numChunks || 1) <= 1;
      if (shouldDirect) {
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
        // eslint-disable-next-line no-console
        console.log("simulation payload", body);
      }
      try { activePollAbortRef.current?.cancel(); } catch {}
      setIsPolling(false);
      // After submit, start polling only the queue/done endpoints. Delay first hit to avoid hitting on first tick.
      startQueuePolling({ skipImmediate: true });
      // If nb chunks > 1, also call append_scenarios
      if (Number(numChunks || 1) > 1) {
        const appendBody = {
          redis_db: 1,
          task: "tasks.ext_o3cl_managing.init_scenarios",
          args: {
            run_name: simulLog || "dev_report_o3cl",
            ref_ademe: refAdeme,
            nb_chunks: Number(numChunks || 1),
            nb_workers: Number(numWorkers || 1),
            nb_combinations: Number(totalCombinations || 0),
            query,
          },
        } as Record<string, unknown>;
        try {
          const res2 = await fetch(lambdaUrl, {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(appendBody),
          });
          if (!res2.ok) {
            const txt2 = await res2.text().catch(() => "");
            throw new Error(`HTTP ${res2.status} ${txt2}`);
          }
          message.success(`appending scenarios across ${Number(numChunks)} chunks`);
          // eslint-disable-next-line no-console
          console.debug("append_scenarios payload", appendBody);
        } catch (e) {
          message.error("Failed to append scenarios");
        }
      }
    } catch (err) {
      message.error("Invalid JSON");
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmWorkers() {
    const value = Number(numWorkers || 0);
    const allowed = [1, 2, 3, 4, 6, 8];
    if (!allowed.includes(value)) {
      setWorkersError(`Invalid workers: ${value}. Allowed: ${allowed.join(", ")}`);
      setConfirmedWorkers(undefined);
      return;
    }
    setWorkersError(undefined);
    setConfirmedWorkers(value);

    // Call scaling lambda
    const lambdaUrl = (import.meta.env.VITE_SIMULATION_LAMBDA_URL as string) || "https://6vyebgqw4plhmxrewmsgh6yere0bwpos.lambda-url.eu-west-3.on.aws/";
    const body = {
      redis_db: 1,
      task: "tasks.r_ecs_scaling.scale",
      args: {
        cluster: "checkdpe-dev-cluster",
        service: "checkdpe-cd-3cl-dev-service",
        desired: value,
      },
    };
    // eslint-disable-next-line no-console
    console.debug("[simulation] scaling workers", body);
    fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${txt}`);
        }
        message.success(`updated workers to ${value}`);
      })
      .catch(() => {
        message.error("failed to update workers");
      });
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        {isEditorOpen ? (
          <div style={{ position: "sticky", top: 24, alignSelf: "flex-start" }}>
            <DpeDrawerEditor
              inline
              open={isEditorOpen}
              onClose={() => setIsEditorOpen(false)}
              width={480}
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
                modifierSelection={modifierSelection}
              onHighlightJsonPath={({ collection, itemKey, indices }) => {
                try {
                  const ta = textAreaRef.current;
                  if (!ta) return;
                  const text = ta.value;
                  const variantPath = `dpe.logement.enveloppe.${collection}.${itemKey}`;
                  let searchFrom = 0;
                  let scopeArrayStart = -1;
                  let scopeArrayEnd = -1;
                  while (true) {
                    const varIdx = text.indexOf('"elements_variant"', searchFrom);
                    if (varIdx === -1) break;
                    const quoteIdx = text.indexOf('"', varIdx + 18);
                    const quoteEnd = quoteIdx !== -1 ? text.indexOf('"', quoteIdx + 1) : -1;
                    const value = quoteIdx !== -1 && quoteEnd !== -1 ? text.slice(quoteIdx + 1, quoteEnd) : '';
                    if (value === variantPath) {
                      const scopeKeyIdx = text.indexOf('"elements_scope"', varIdx);
                      if (scopeKeyIdx !== -1) {
                        const openBracket = text.indexOf('[', scopeKeyIdx);
                        if (openBracket !== -1) {
                          scopeArrayStart = openBracket;
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
                  try { (ta as any).focus({ preventScroll: true }); } catch { try { ta.focus(); } catch {} }
                  try { ta.setSelectionRange(scopeArrayStart, scopeArrayEnd); } catch {}
                  try { ta.scrollTop = prevScrollTop; ta.scrollLeft = prevScrollLeft; } catch {}
                  window.setTimeout(() => {
                    try {
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
        ) : null}

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Simulation</Title>
              <Button type="primary" size="large" icon={<LeftOutlined />} onClick={openEditor} disabled={isEditorOpen}>Edit</Button>
            </div>
            <Button onClick={() => setIsChainlitOpen(true)}>build with AI</Button>
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
                    label: (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>Options</span>
                        {typeof totalCombinations === "number" ? (
                          <strong style={{ fontWeight: 600 }}>combinations: {totalCombinations}</strong>
                        ) : null}
                      </div>
                    ),
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
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <InputNumber value={1} disabled style={{ width: 140 }} min={1} />
                            <span style={{ color: "#6b7280", fontSize: 12 }}>(read-only)</span>
                          </div>
                        </div>
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
              <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                <Tooltip title={isChunksTooBig ? "chunks too big (max.50)" : undefined}>
                  <span style={{ display: "inline-block" }}>
                    <Button type="primary" onClick={handleSubmit} loading={submitting} disabled={isChunksTooBig}>submit</Button>
                  </span>
                </Tooltip>
                <div style={{ position: "relative" }}>
                  <Button onClick={() => setIsSaveMenuOpen((v) => !v)}>...</Button>
                  {isSaveMenuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, width: 260, boxShadow: "0 4px 14px rgba(0,0,0,0.08)", zIndex: 10 }}>
                    <div style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6 }} onClick={() => { setIsLoadSavedOpen(true); setIsSaveMenuOpen(false); }}>load scenario</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={() => { if (!isSaving) handleSaveToBackoffice(); }}>save {simulLog || "default"}</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={async () => {
                      if (isSaving) return;
                      const cdEnv = ((import.meta as any)?.env?.VITE_CD_ENV as string | undefined) || (import.meta.env.MODE === "development" ? "dev" : "prod");
                      const suggested = `${cdEnv}_simul_${simulLog || "test0001"}`;
                      const name = window.prompt(
                        "Save as name (format: <CD_ENV>_simul_<name>, e.g., dev_simul_test0001):",
                        suggested
                      );
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
                        if (refAdeme) {
                          const { origin, pathname } = window.location;
                          const basePath = (() => {
                            try {
                              const idx = pathname.lastIndexOf("/");
                              return idx !== -1 ? pathname.slice(0, idx + 1) : "/";
                            } catch {
                              return "/";
                            }
                          })();
                          const targetUrl = `${origin}${basePath}index.html?ref_ademe=${encodeURIComponent(refAdeme)}&simul=${encodeURIComponent(name)}`;
                          window.location.href = targetUrl;
                        }
                      } catch {
                        message.error("save failed");
                      } finally {
                        setIsSaving(false);
                        setIsSaveMenuOpen(false);
                      }
                    }}>save as…</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6 }} onClick={() => { handleRefreshProgress(); setIsSaveMenuOpen(false); }}>refresh progress</div>
                    </div>
                  )}
                </div>
              </div>
              {queueSegments > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 10, background: "#e5e7eb", borderRadius: 8, overflow: "hidden", display: "flex" }}>
                    {(queueItems.length ? queueItems : Array.from({ length: queueSegments })).map((item: any, idx: number) => {
                      const ts = item?.ts_started;
                      let startedAtMs = 0;
                      try {
                        if (typeof ts === "number") startedAtMs = ts > 1e12 ? ts : ts * 1000;
                        else if (typeof ts === "string") {
                          const n = Number(ts);
                          if (Number.isFinite(n)) startedAtMs = n > 1e12 ? n : n * 1000; else {
                            const t = Date.parse(ts);
                            if (!Number.isNaN(t)) startedAtMs = t;
                          }
                        }
                      } catch {}
                      const elapsedSec = Math.max(0, (Date.now() - startedAtMs) / 1000);
                      const statusNum = Number(item?.status ?? 0);
                      const pct = statusNum >= 2 ? 100 : Math.max(0, Math.min(100, (elapsedSec / 60) * 100));
                      const fillColor = statusNum >= 2 ? "#22c55e" : (statusNum >= 1 ? "#93c5fd" : "transparent");
                      return (
                        <div key={idx} style={{ flex: 1, display: "flex" }}>
                          <div style={{ width: `${pct}%`, background: fillColor, transition: "width 1s linear" }} />
                          {idx < queueSegments - 1 ? (
                            <div style={{ width: 2, background: "#ffffff" }} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-start", minHeight: 24 }}>
                {!resultsUrl && isPolling && (
                  <Spin size="small" />
                )}
                {resultsUrl && (
                  <a href={resultsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Open simulation results <ExportOutlined />
                  </a>
                )}
              </div>
              {refAdeme ? (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Results preview</Title>
                    <Button
                      size="small"
                      onClick={() => {
                        setLastRefreshedDoneCount(currentDoneCount);
                        setResultsRefreshKey((k) => k + 1);
                      }}
                    >
                      refresh
                    </Button>
                  </div>
                  <Card style={{ background: "#ffffff", borderColor: "#e5e7eb" }} styles={{ body: { padding: 16 } }}>
                    <SimulationResults
                      key={resultsRefreshKey}
                      dpeId={refAdeme}
                      simul={simulLog}
                      getAccessToken={async () => (await getAccessToken()) || undefined}
                      apiBaseUrl={(import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr"}
                      width={720}
                      height={300}
                      onSelectPoint={(p) => setSelectedPoint(p)}
                      onPointDetail={(d) => setSelectedPointDetail(d)}
                      selectedIndex={selectedPoint?.index}
                      primaryColor="#1677ff"
                      xMetric={resultsXMetric}
                      yMetric={resultsYMetric}
                      onXMetricChange={setResultsXMetric}
                      onYMetricChange={setResultsYMetric}
                      mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }}
                    />
                    <div style={{ marginTop: 12 }}>
                      <SimulationDetailCard point={selectedPoint || undefined} mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }} />
                      {(() => {
                        try {
                          const raw = (selectedPointDetail && (selectedPointDetail as any).redis_obj) as unknown;
                          if (raw == null) return null;
                          let pretty = "";
                          if (typeof raw === "string") {
                            try { pretty = JSON.stringify(JSON.parse(raw), null, 2); }
                            catch { pretty = String(raw); }
                          } else if (typeof raw === "object") {
                            pretty = JSON.stringify(raw, null, 2);
                          } else {
                            pretty = String(raw);
                          }
                          return (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ color: "#4b5563", marginBottom: 6 }}>redis_obj</div>
                              <pre style={{ margin: 0, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{pretty}
                              </pre>
                            </div>
                          );
                        } catch { return null; }
                      })()}
                    </div>
                  </Card>
                </div>
              ) : null}
              {/* editor inline panel is rendered on the right */}
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
            <LoadScenarioModal
              open={isLoadSavedOpen}
              onCancel={() => setIsLoadSavedOpen(false)}
              onSelect={(payload: unknown) => {
                try {
                  // Accept payload either as normalized object { ref_ademe, label } or string "ref:label"
                  let ref: string | undefined;
                  let simul: string | undefined;
                  if (typeof payload === "string") {
                    const colon = payload.indexOf(":");
                    ref = colon !== -1 ? payload.slice(0, colon) : undefined;
                    simul = colon !== -1 ? payload.slice(colon + 1) : undefined;
                  } else if (payload && typeof payload === "object") {
                    ref = (payload as any).ref_ademe as string | undefined;
                    simul = (payload as any).label as string | undefined;
                  }
                  const url = new URL(window.location.href);
                  if (ref) url.searchParams.set("ref_ademe", ref);
                  if (simul) url.searchParams.set("simul", simul);
                  window.location.href = url.toString();
                } catch {}
                setIsLoadSavedOpen(false);
              }}
              baseUrl={(import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr"}
              initialRefAdeme={refAdeme}
              getAccessToken={getAccessToken}
            />
          </Card>
        </div>

        {(() => {
          const chainlitUrl = (() => {
            const configured = import.meta.env.VITE_CHAINLIT_URL as string | undefined;
            if (configured && typeof configured === "string" && configured.trim()) return configured.trim();
            return "https://chainlit-stg.etiquettedpe.fr/chainlit";
          })();
          return (
            <ChainlitChatDrawer
              open={isChainlitOpen}
              onClose={() => setIsChainlitOpen(false)}
              title="Assistant"
              serverUrl={chainlitUrl}
              userEnv={{
                mail: "germain.blanchet@gmail.com",
                button_id: "contactez_nous",
                ref_ademe: refAdeme || "2508E0243162W",
              }}
            />
          );
        })()}

      </div>
      </div>
    </div>
  );
};



```

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./amplify";
import { authorizedFetch, waitForAccessToken, getAccessToken, setBridgeAccessToken } from "./auth";
import { Hub } from "aws-amplify/utils";
import { Button, Card, Col, Flex, Input, InputNumber, Row, Select, Space, Typography, message, Spin, Collapse, Tooltip } from "antd";
import { ExportOutlined, LeftOutlined } from "@ant-design/icons";
import { SimulationScenariosModal } from "@acme/simulation-scenarios";
import { LoadScenarioModal } from "@acme/load-scenario";
import { DpeDrawerEditor, fetchSimulationTemplateJson } from "@acme/dpe-editor";
import { SimulationResults } from "@acme/simulation-results";
import { ChainlitChatDrawer } from "@acme/chainlit-client";
import { TopMenu } from "@acme/top-menu";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { flushSync } from "react-dom";
import { SimulationDetailCard } from "@acme/simulation-detail";

const { Title, Paragraph } = Typography;

export const App: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>("{\n  \"items\": []\n}");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [apiDebug, setApiDebug] = useState<number | undefined>(undefined);
  const [skip, setSkip] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [numChunks, setNumChunks] = useState<number>(1);
  useEffect(() => { setNumChunks(2); }, []);
  const [totalCombinations, setTotalCombinations] = useState<number | undefined>(undefined);
  const [numWorkers, setNumWorkers] = useState<number>(1);
  const [confirmedWorkers, setConfirmedWorkers] = useState<number | undefined>(undefined);
  const [workersError, setWorkersError] = useState<string | undefined>(undefined);
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
  const [isLoadSavedOpen, setIsLoadSavedOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isChainlitOpen, setIsChainlitOpen] = useState<boolean>(false);
  const [queueSegments, setQueueSegments] = useState<number>(0);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const queuePollIdRef = useRef<number | null>(null);
  const [queueNowTick, setQueueNowTick] = useState<number>(0);
  const [currentDoneCount, setCurrentDoneCount] = useState<number>(0);
  const [lastRefreshedDoneCount, setLastRefreshedDoneCount] = useState<number>(0);
  const [resultsRefreshKey, setResultsRefreshKey] = useState<number>(0);
  const [selectedPoint, setSelectedPoint] = useState<{ index: number; ep?: number; ges?: number; cost?: number; letter?: string } | null>(null);
  const [resultsXMetric, setResultsXMetric] = useState<"index" | "cost">("index");
  const [resultsYMetric, setResultsYMetric] = useState<"ep" | "ges">("ep");
  const [selectedPointDetail, setSelectedPointDetail] = useState<any | null>(null);
  const [modifierSelection, setModifierSelection] = useState<{ path: string; seq: number[] }[] | null>(null);
  const isChunksTooBig = useMemo(() => {
    if (typeof totalCombinations !== "number") return false;
    const chunks = Math.max(1, Number(numChunks || 1));
    return (totalCombinations / chunks) > 50;
  }, [totalCombinations, numChunks]);
  function openEditor() { setIsEditorOpen(true); }
  const hasLoadedTemplateRef = useRef<boolean>(false);
  const editorOriginalTextRef = useRef<string>("");
  const combinationsAbortRef = useRef<AbortController | null>(null);

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
    const hasSimulParam = url.searchParams.has("simul");
    if (!hasSimulParam) return; // do not auto-fetch when simul is not explicitly provided
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (simul === "default") return;
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

  // On init: if URL contains simul=default, call template endpoint and initialize editor JSON
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (cancelled) return;
        if (hasLoadedTemplateRef.current) return;
        const url = new URL(window.location.href);
        const simul = url.searchParams.get("simul");
        if (simul !== "default") return;
        if (!refAdeme) return;
        if (hasUserEditedRef.current) return;

        const accessToken = await waitForAccessToken(15000, 250);
        if (!accessToken) return;

        const baseUrl = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const template = await fetchSimulationTemplateJson<any>({ baseUrl, ref_ademe: refAdeme, accessToken });
        if (cancelled) return;

        const sourceRuns: any[] = Array.isArray(template)
          ? template
          : (template && Array.isArray(template.runs) ? template.runs : []);

        const transformedRuns = sourceRuns.map((run) => {
          const forced = run?.parameters?.input_forced || {};
          const scenarios = Array.isArray(run?.scenarios) ? run.scenarios : [];
          const nextScenarios = scenarios.map((sc: any) => {
            const baseInput = (sc && sc.input && typeof sc.input === "object") ? sc.input : {};
            const mergedInput = { ...forced, ...baseInput };
            return { ...sc, input: mergedInput };
          });
          const { parameters, ...rest } = run || {};
          return { ...rest, scenarios: nextScenarios };
        });

        if (transformedRuns.length > 0) {
          hasLoadedTemplateRef.current = true;
          setJsonText(JSON.stringify(transformedRuns, null, 2));
        }
      } catch {
        // ignore
      }
    };

    run();
    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh") { run(); }
      } catch {}
    });
    return () => { try { (removeHub as any)?.(); } catch {}; cancelled = true; };
  }, [refAdeme]);

  // On init: if URL contains ?ref_ademe=..., call backoffice endpoint (Bearer included when available)
  useEffect(() => {
    if (hasInitFetchedRef.current) return;
    const url = new URL(window.location.href);
    const refAdeme = url.searchParams.get("ref_ademe");
    const hasSimulParam = url.searchParams.has("simul");
    if (!hasSimulParam) return; // do not auto-fetch when simul is not explicitly provided
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (simul === "default") return;
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

  // When only ref_ademe is present and no simul param, initialize editor to [] and open load modal (after token available)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hasRef = Boolean(url.searchParams.get("ref_ademe"));
        const hasSimul = url.searchParams.has("simul");
        if (hasRef && !hasSimul) {
          if (!hasUserEditedRef.current) setJsonText("[]");
          const token = await waitForAccessToken(15000, 250);
          if (cancelled) return;
          if (token) setIsLoadSavedOpen(true);
        }
      } catch {}
    };
    run();
    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh") { run(); }
      } catch {}
    });
    return () => { try { (removeHub as any)?.(); } catch {}; cancelled = true; };
  }, [refAdeme]);

  // When opening with both ref_ademe and simul, expand the editor drawer by default
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const hasRef = Boolean(url.searchParams.get("ref_ademe"));
      const simul = url.searchParams.get("simul");
      if (hasRef && simul && simul !== "default") {
        setIsEditorOpen(true);
      }
    } catch {}
  }, [refAdeme, simulLog]);

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

  // If no Cognito token becomes available shortly after load, redirect to sign-in
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await waitForAccessToken(5000, 250);
        if (cancelled) return;
        if (token) return; // already authenticated
        // Compute auth URL similarly to TopMenu.authHref
        const configured = import.meta.env.VITE_AUTH_URL as string | undefined;
        const buildAuthBase = () => {
          if (configured) {
            try {
              const configuredUrl = new URL(configured);
              const isConfiguredLocal = ["localhost", "127.0.0.1"].includes(configuredUrl.hostname);
              const isPageLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
              if (isConfiguredLocal && !isPageLocal) {
                // ignore local auth URL on non-localhost pages
              } else {
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
        };
        const authBase = buildAuthBase();
        const sep = authBase.includes("?") ? "&" : "?";
        const target = `${authBase}${sep}returnTo=${encodeURIComponent(window.location.href)}`;
        window.location.href = target;
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Capture the JSON snapshot when opening the editor to detect unconfirmed changes
  useEffect(() => {
    try {
      if (isEditorOpen) {
        editorOriginalTextRef.current = jsonText || "";
      }
    } catch {}
  }, [isEditorOpen]);

  // Compute combinations count based on current JSON, ref_ademe and simul
  useEffect(() => {
    try { combinationsAbortRef.current?.abort(); } catch {}
    const simulName = (simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl");
    if (!refAdeme || !simulName) { setTotalCombinations(undefined); return; }
    // Validate and parse JSON before calling
    let parsedSimul: unknown = {};
    try { parsedSimul = jsonText.trim() ? JSON.parse(jsonText) : {}; } catch { setTotalCombinations(undefined); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const url = new URL("/backoffice/simulation_count", base);
        url.searchParams.set("ref_ademe", String(refAdeme));
        url.searchParams.set("simul", String(simulName));
        const controller = new AbortController();
        combinationsAbortRef.current = controller;
        const res = await authorizedFetch(url.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          body: JSON.stringify({ ref_ademe: refAdeme, simul: simulName, simul_content: parsedSimul }),
          signal: controller.signal,
        });
        if (!res.ok) { setTotalCombinations(undefined); return; }
        const data: any = await res.json().catch(() => null);
        const value = Number(((data && data.data && data.data.total_combinations) ?? (data && data.total_combinations)) as any);
        if (Number.isFinite(value)) setTotalCombinations(value); else setTotalCombinations(undefined);
      } catch {
        setTotalCombinations(undefined);
      }
    }, 600);
    return () => { cancelled = true; try { window.clearTimeout(timer); } catch {}; };
  }, [refAdeme, simulLog, jsonText]);

  // (removed nbCombinations UI; we rely on dynamically computed totalCombinations)

  // Submit is always enabled now

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

  async function fetchQueueOnce() {
    try {
      if (!refAdeme) return;
      const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
      const simulName = simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
      const urlQueue = new URL("/backoffice/get_redis_detail", base);
      urlQueue.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlQueue.searchParams.set("log", `${simulName}_o3cl_queue`);
      const urlDoing = new URL("/backoffice/get_redis_detail", base);
      urlDoing.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDoing.searchParams.set("log", `${simulName}_o3cl_doing_queue`);
      const urlDone = new URL("/backoffice/get_redis_detail", base);
      urlDone.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDone.searchParams.set("log", `${simulName}_o3cl_done_queue`);

      const [qres, doingRes, dres] = await Promise.all([
        authorizedFetch(urlQueue.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        authorizedFetch(urlDoing.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        authorizedFetch(urlDone.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
      ]);

      const parseItems = async (res: Response): Promise<any[]> => {
        if (!res.ok) return [];
        const data: any = await res.json().catch(() => null);
        if (Array.isArray(data?.items)) return data.items as any[];
        if (Array.isArray(data)) return data as any[];
        if (data && typeof data === "object" && Array.isArray((data as any).queue)) return (data as any).queue as any[];
        return [];
      };

      const [queueList, doingListRaw, doneListRaw] = await Promise.all([parseItems(qres), parseItems(doingRes), parseItems(dres)]);
      const doingList = (doingListRaw || []).map((it: any) => ({ ...it, status: 1, __kind: "doing" }));
      const doneList = (doneListRaw || []).map((it: any) => ({ ...it, status: 2, __kind: "done" }));
      const merged = [...doneList, ...doingList, ...queueList];
      setQueueItems(merged);
      setQueueSegments(merged.length || 0);
      setCurrentDoneCount(doneList.length || 0);

      // Stop polling when both running and doing queues become empty
      if ((queueList?.length || 0) === 0 && (doingList?.length || 0) === 0) {
        try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
      }
    } catch {}
  }

  function startQueuePolling(opts?: { skipImmediate?: boolean }) {
    try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    const raw = (import.meta as any)?.env?.VITE_POLL_QUEUE_DELAY;
    const n = Number(raw);
    const delayMs = Number.isFinite(n) && n > 0 ? n : 5000;
    if (!opts?.skipImmediate) { void fetchQueueOnce(); }
    const id = window.setInterval(fetchQueueOnce, delayMs);
    queuePollIdRef.current = id;
  }

  function handleRefreshProgress() {
    try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    const raw = (import.meta as any)?.env?.VITE_POLL_QUEUE_DELAY;
    const n = Number(raw);
    const delayMs = Number.isFinite(n) && n > 0 ? n : 5000;
    void fetchQueueOnce();
    window.setTimeout(() => { void fetchQueueOnce(); }, delayMs);
    window.setTimeout(() => { void fetchQueueOnce(); }, delayMs * 2);
  }

  useEffect(() => {
    return () => {
      try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    };
  }, []);

  useEffect(() => {
    if (!queueItems.length) return;
    const id = window.setInterval(() => setQueueNowTick((t) => t + 1), 1000);
    return () => { try { window.clearInterval(id); } catch {} };
  }, [queueItems.length]);

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
          nb_combinations: Number(totalCombinations || 0),
          query,
        },
      };
      setSubmitting(true);
      // Only call direct_scenarios when nb chunks <= 1
      const shouldDirect = Number(numChunks || 1) <= 1;
      if (shouldDirect) {
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
        // eslint-disable-next-line no-console
        console.log("simulation payload", body);
      }
      try { activePollAbortRef.current?.cancel(); } catch {}
      setIsPolling(false);
      // After submit, start polling only the queue/done endpoints. Delay first hit to avoid hitting on first tick.
      startQueuePolling({ skipImmediate: true });
      // If nb chunks > 1, also call append_scenarios
      if (Number(numChunks || 1) > 1) {
        const appendBody = {
          redis_db: 1,
          task: "tasks.ext_o3cl_managing.init_scenarios",
          args: {
            run_name: simulLog || "dev_report_o3cl",
            ref_ademe: refAdeme,
            nb_chunks: Number(numChunks || 1),
            nb_workers: Number(numWorkers || 1),
            nb_combinations: Number(totalCombinations || 0),
            query,
          },
        } as Record<string, unknown>;
        try {
          const res2 = await fetch(lambdaUrl, {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(appendBody),
          });
          if (!res2.ok) {
            const txt2 = await res2.text().catch(() => "");
            throw new Error(`HTTP ${res2.status} ${txt2}`);
          }
          message.success(`appending scenarios across ${Number(numChunks)} chunks`);
          // eslint-disable-next-line no-console
          console.debug("append_scenarios payload", appendBody);
        } catch (e) {
          message.error("Failed to append scenarios");
        }
      }
    } catch (err) {
      message.error("Invalid JSON");
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmWorkers() {
    const value = Number(numWorkers || 0);
    const allowed = [1, 2, 3, 4, 6, 8];
    if (!allowed.includes(value)) {
      setWorkersError(`Invalid workers: ${value}. Allowed: ${allowed.join(", ")}`);
      setConfirmedWorkers(undefined);
      return;
    }
    setWorkersError(undefined);
    setConfirmedWorkers(value);

    // Call scaling lambda
    const lambdaUrl = (import.meta.env.VITE_SIMULATION_LAMBDA_URL as string) || "https://6vyebgqw4plhmxrewmsgh6yere0bwpos.lambda-url.eu-west-3.on.aws/";
    const body = {
      redis_db: 1,
      task: "tasks.r_ecs_scaling.scale",
      args: {
        cluster: "checkdpe-dev-cluster",
        service: "checkdpe-cd-3cl-dev-service",
        desired: value,
      },
    };
    // eslint-disable-next-line no-console
    console.debug("[simulation] scaling workers", body);
    fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${txt}`);
        }
        message.success(`updated workers to ${value}`);
      })
      .catch(() => {
        message.error("failed to update workers");
      });
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        {isEditorOpen ? (
          <div style={{ position: "sticky", top: 24, alignSelf: "flex-start" }}>
            <DpeDrawerEditor
              inline
              open={isEditorOpen}
              onClose={() => setIsEditorOpen(false)}
              width={480}
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
                modifierSelection={modifierSelection}
              onHighlightJsonPath={({ collection, itemKey, indices }) => {
                try {
                  const ta = textAreaRef.current;
                  if (!ta) return;
                  const text = ta.value;
                  const variantPath = `dpe.logement.enveloppe.${collection}.${itemKey}`;
                  let searchFrom = 0;
                  let scopeArrayStart = -1;
                  let scopeArrayEnd = -1;
                  while (true) {
                    const varIdx = text.indexOf('"elements_variant"', searchFrom);
                    if (varIdx === -1) break;
                    const quoteIdx = text.indexOf('"', varIdx + 18);
                    const quoteEnd = quoteIdx !== -1 ? text.indexOf('"', quoteIdx + 1) : -1;
                    const value = quoteIdx !== -1 && quoteEnd !== -1 ? text.slice(quoteIdx + 1, quoteEnd) : '';
                    if (value === variantPath) {
                      const scopeKeyIdx = text.indexOf('"elements_scope"', varIdx);
                      if (scopeKeyIdx !== -1) {
                        const openBracket = text.indexOf('[', scopeKeyIdx);
                        if (openBracket !== -1) {
                          scopeArrayStart = openBracket;
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
                  try { (ta as any).focus({ preventScroll: true }); } catch { try { ta.focus(); } catch {} }
                  try { ta.setSelectionRange(scopeArrayStart, scopeArrayEnd); } catch {}
                  try { ta.scrollTop = prevScrollTop; ta.scrollLeft = prevScrollLeft; } catch {}
                  window.setTimeout(() => {
                    try {
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
        ) : null}

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Simulation</Title>
              <Button type="primary" size="large" icon={<LeftOutlined />} onClick={openEditor} disabled={isEditorOpen}>Edit</Button>
            </div>
            <Button onClick={() => setIsChainlitOpen(true)}>build with AI</Button>
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
                    label: (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>Options</span>
                        {typeof totalCombinations === "number" ? (
                          <strong style={{ fontWeight: 600 }}>combinations: {totalCombinations}</strong>
                        ) : null}
                      </div>
                    ),
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
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <InputNumber value={1} disabled style={{ width: 140 }} min={1} />
                            <span style={{ color: "#6b7280", fontSize: 12 }}>(read-only)</span>
                          </div>
                        </div>
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
              <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                <Tooltip title={isChunksTooBig ? "chunks too big (max.50)" : undefined}>
                  <span style={{ display: "inline-block" }}>
                    <Button type="primary" onClick={handleSubmit} loading={submitting} disabled={isChunksTooBig}>submit</Button>
                  </span>
                </Tooltip>
                <div style={{ position: "relative" }}>
                  <Button onClick={() => setIsSaveMenuOpen((v) => !v)}>...</Button>
                  {isSaveMenuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, width: 260, boxShadow: "0 4px 14px rgba(0,0,0,0.08)", zIndex: 10 }}>
                    <div style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6 }} onClick={() => { setIsLoadSavedOpen(true); setIsSaveMenuOpen(false); }}>load scenario</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={() => { if (!isSaving) handleSaveToBackoffice(); }}>save {simulLog || "default"}</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={async () => {
                      if (isSaving) return;
                      const cdEnv = ((import.meta as any)?.env?.VITE_CD_ENV as string | undefined) || (import.meta.env.MODE === "development" ? "dev" : "prod");
                      const suggested = `${cdEnv}_simul_${simulLog || "test0001"}`;
                      const name = window.prompt(
                        "Save as name (format: <CD_ENV>_simul_<name>, e.g., dev_simul_test0001):",
                        suggested
                      );
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
                        if (refAdeme) {
                          const { origin, pathname } = window.location;
                          const basePath = (() => {
                            try {
                              const idx = pathname.lastIndexOf("/");
                              return idx !== -1 ? pathname.slice(0, idx + 1) : "/";
                            } catch {
                              return "/";
                            }
                          })();
                          const targetUrl = `${origin}${basePath}index.html?ref_ademe=${encodeURIComponent(refAdeme)}&simul=${encodeURIComponent(name)}`;
                          window.location.href = targetUrl;
                        }
                      } catch {
                        message.error("save failed");
                      } finally {
                        setIsSaving(false);
                        setIsSaveMenuOpen(false);
                      }
                    }}>save as…</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6 }} onClick={() => { handleRefreshProgress(); setIsSaveMenuOpen(false); }}>refresh progress</div>
                    </div>
                  )}
                </div>
              </div>
              {queueSegments > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 10, background: "#e5e7eb", borderRadius: 8, overflow: "hidden", display: "flex" }}>
                    {(queueItems.length ? queueItems : Array.from({ length: queueSegments })).map((item: any, idx: number) => {
                      const ts = item?.ts_started;
                      let startedAtMs = 0;
                      try {
                        if (typeof ts === "number") startedAtMs = ts > 1e12 ? ts : ts * 1000;
                        else if (typeof ts === "string") {
                          const n = Number(ts);
                          if (Number.isFinite(n)) startedAtMs = n > 1e12 ? n : n * 1000; else {
                            const t = Date.parse(ts);
                            if (!Number.isNaN(t)) startedAtMs = t;
                          }
                        }
                      } catch {}
                      const elapsedSec = Math.max(0, (Date.now() - startedAtMs) / 1000);
                      const statusNum = Number(item?.status ?? 0);
                      const pct = statusNum >= 2 ? 100 : Math.max(0, Math.min(100, (elapsedSec / 60) * 100));
                      const fillColor = statusNum >= 2 ? "#22c55e" : (statusNum >= 1 ? "#93c5fd" : "transparent");
                      return (
                        <div key={idx} style={{ flex: 1, display: "flex" }}>
                          <div style={{ width: `${pct}%`, background: fillColor, transition: "width 1s linear" }} />
                          {idx < queueSegments - 1 ? (
                            <div style={{ width: 2, background: "#ffffff" }} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-start", minHeight: 24 }}>
                {!resultsUrl && isPolling && (
                  <Spin size="small" />
                )}
                {resultsUrl && (
                  <a href={resultsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Open simulation results <ExportOutlined />
                  </a>
                )}
              </div>
              {refAdeme ? (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Results preview</Title>
                    <Button
                      size="small"
                      onClick={() => {
                        setLastRefreshedDoneCount(currentDoneCount);
                        setResultsRefreshKey((k) => k + 1);
                      }}
                    >
                      refresh
                    </Button>
                  </div>
                  <Card style={{ background: "#ffffff", borderColor: "#e5e7eb" }} styles={{ body: { padding: 16 } }}>
                    <SimulationResults
                      key={resultsRefreshKey}
                      dpeId={refAdeme}
                      simul={simulLog}
                      getAccessToken={async () => (await getAccessToken()) || undefined}
                      apiBaseUrl={(import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr"}
                      width={720}
                      height={300}
                      onSelectPoint={(p) => setSelectedPoint(p)}
                      onPointDetail={(d) => {
                        try {
                          setSelectedPointDetail(d);
                          // Extract modifierId array from detail response (support both direct and within redis_obj)
                          let root: any = d;
                          const rawRedis = (d && (d as any).redis_obj) as unknown;
                          if (typeof rawRedis === "string") {
                            try { root = JSON.parse(rawRedis); } catch { root = d; }
                          }
                          const resultArr: any[] = Array.isArray(root?.data?.result) ? root.data.result : (Array.isArray(root?.result) ? root.result : []);
                          const first = (resultArr && resultArr.length) ? resultArr[0] : root;
                          const mod = (first && (first.modifierId || first.modifier_id || first.modifier)) as any;
                          const arr = Array.isArray(mod) ? mod : [];
                          const normalized = arr
                            .map((it: any) => ({ path: String(it?.path || ""), seq: Array.isArray(it?.seq) ? (it.seq as any[]).map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [] }))
                            .filter((it: any) => it.path && it.seq && it.seq.length);
                          setModifierSelection(normalized.length ? normalized : null);
                        } catch {
                          setModifierSelection(null);
                        }
                      }}
                      selectedIndex={selectedPoint?.index}
                      primaryColor="#1677ff"
                      xMetric={resultsXMetric}
                      yMetric={resultsYMetric}
                      onXMetricChange={setResultsXMetric}
                      onYMetricChange={setResultsYMetric}
                      mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }}
                    />
                    <div style={{ marginTop: 12 }}>
                      <SimulationDetailCard point={selectedPoint || undefined} mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }} />
                      {(() => {
                        try {
                          const raw = (selectedPointDetail && (selectedPointDetail as any).redis_obj) as unknown;
                          if (raw == null) return null;
                          let pretty = "";
                          if (typeof raw === "string") {
                            try { pretty = JSON.stringify(JSON.parse(raw), null, 2); }
                            catch { pretty = String(raw); }
                          } else if (typeof raw === "object") {
                            pretty = JSON.stringify(raw, null, 2);
                          } else {
                            pretty = String(raw);
                          }
                          return (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ color: "#4b5563", marginBottom: 6 }}>redis_obj</div>
                              <pre style={{ margin: 0, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{pretty}
                              </pre>
                            </div>
                          );
                        } catch { return null; }
                      })()}
                    </div>
                  </Card>
                </div>
              ) : null}
              {/* editor inline panel is rendered on the right */}
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
            <LoadScenarioModal
              open={isLoadSavedOpen}
              onCancel={() => setIsLoadSavedOpen(false)}
              onSelect={(payload: unknown) => {
                try {
                  // Accept payload either as normalized object { ref_ademe, label } or string "ref:label"
                  let ref: string | undefined;
                  let simul: string | undefined;
                  if (typeof payload === "string") {
                    const colon = payload.indexOf(":");
                    ref = colon !== -1 ? payload.slice(0, colon) : undefined;
                    simul = colon !== -1 ? payload.slice(colon + 1) : undefined;
                  } else if (payload && typeof payload === "object") {
                    ref = (payload as any).ref_ademe as string | undefined;
                    simul = (payload as any).label as string | undefined;
                  }
                  const url = new URL(window.location.href);
                  if (ref) url.searchParams.set("ref_ademe", ref);
                  if (simul) url.searchParams.set("simul", simul);
                  window.location.href = url.toString();
                } catch {}
                setIsLoadSavedOpen(false);
              }}
              baseUrl={(import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr"}
              initialRefAdeme={refAdeme}
              getAccessToken={getAccessToken}
            />
          </Card>
        </div>

        {(() => {
          const chainlitUrl = (() => {
            const configured = import.meta.env.VITE_CHAINLIT_URL as string | undefined;
            if (configured && typeof configured === "string" && configured.trim()) return configured.trim();
            return "https://chainlit-stg.etiquettedpe.fr/chainlit";
          })();
          return (
            <ChainlitChatDrawer
              open={isChainlitOpen}
              onClose={() => setIsChainlitOpen(false)}
              title="Assistant"
              serverUrl={chainlitUrl}
              userEnv={{
                mail: "germain.blanchet@gmail.com",
                button_id: "contactez_nous",
                ref_ademe: refAdeme || "2508E0243162W",
              }}
            />
          );
        })()}

      </div>
      </div>
    </div>
  );
};



```

Implemented modifierId handling.

- In `SimulationResults`, clicking a point fetches detail; `App.tsx` now parses `modifierId` (supports nested in `redis_obj`) and stores a normalized `{ path, seq[] }[]`.
- `DpeDrawerEditor` accepts `modifierSelection`. On open, it applies each selection:
  - If `seq` has a single entry:
    - If `-1`, select the sole item (only when exactly one exists) for that variant.
    - If positive, map to the envelope item whose `donnee_entree.reference` matches and set `elements_scope` to that index.
  - If multiple ids present (e.g., for `dpe.logement.enveloppe.mur_collection.mur`), it skips any selection, as requested.

Files changed:
- `apps/simul/src/App.tsx`: wire `onPointDetail`, extract `modifierId`, pass `modifierSelection` to `DpeDrawerEditor`, show `redis_obj` JSON.
- `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx`: add `modifierSelection` prop and effect to update `elements_scope` accordingly.

No linter errors.

---

**User**

in json display for graph detail 
just show object : data.result.modifierId subpart
not full return from endpoint

---

**Cursor**

I'll update the graph detail JSON rendering in `apps/simul/src/App.tsx` to parse `redis_obj` and display only the `data.result[].modifierId` of the item matching the selected point's id (or the first one if no match). Then I'll run a linter check on the edited file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./amplify";
import { authorizedFetch, waitForAccessToken, getAccessToken, setBridgeAccessToken } from "./auth";
import { Hub } from "aws-amplify/utils";
import { Button, Card, Col, Flex, Input, InputNumber, Row, Select, Space, Typography, message, Spin, Collapse, Tooltip } from "antd";
import { ExportOutlined, LeftOutlined } from "@ant-design/icons";
import { SimulationScenariosModal } from "@acme/simulation-scenarios";
import { LoadScenarioModal } from "@acme/load-scenario";
import { DpeDrawerEditor, fetchSimulationTemplateJson } from "@acme/dpe-editor";
import { SimulationResults } from "@acme/simulation-results";
import { ChainlitChatDrawer } from "@acme/chainlit-client";
import { TopMenu } from "@acme/top-menu";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { flushSync } from "react-dom";
import { SimulationDetailCard } from "@acme/simulation-detail";

const { Title, Paragraph } = Typography;

export const App: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>("{\n  \"items\": []\n}");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [apiDebug, setApiDebug] = useState<number | undefined>(undefined);
  const [skip, setSkip] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [numChunks, setNumChunks] = useState<number>(1);
  useEffect(() => { setNumChunks(2); }, []);
  const [totalCombinations, setTotalCombinations] = useState<number | undefined>(undefined);
  const [numWorkers, setNumWorkers] = useState<number>(1);
  const [confirmedWorkers, setConfirmedWorkers] = useState<number | undefined>(undefined);
  const [workersError, setWorkersError] = useState<string | undefined>(undefined);
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
  const [isLoadSavedOpen, setIsLoadSavedOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isChainlitOpen, setIsChainlitOpen] = useState<boolean>(false);
  const [queueSegments, setQueueSegments] = useState<number>(0);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const queuePollIdRef = useRef<number | null>(null);
  const [queueNowTick, setQueueNowTick] = useState<number>(0);
  const [currentDoneCount, setCurrentDoneCount] = useState<number>(0);
  const [lastRefreshedDoneCount, setLastRefreshedDoneCount] = useState<number>(0);
  const [resultsRefreshKey, setResultsRefreshKey] = useState<number>(0);
  const [selectedPoint, setSelectedPoint] = useState<{ index: number; ep?: number; ges?: number; cost?: number; letter?: string } | null>(null);
  const [resultsXMetric, setResultsXMetric] = useState<"index" | "cost">("index");
  const [resultsYMetric, setResultsYMetric] = useState<"ep" | "ges">("ep");
  const [selectedPointDetail, setSelectedPointDetail] = useState<any | null>(null);
  const [modifierSelection, setModifierSelection] = useState<{ path: string; seq: number[] }[] | null>(null);
  const isChunksTooBig = useMemo(() => {
    if (typeof totalCombinations !== "number") return false;
    const chunks = Math.max(1, Number(numChunks || 1));
    return (totalCombinations / chunks) > 50;
  }, [totalCombinations, numChunks]);
  function openEditor() { setIsEditorOpen(true); }
  const hasLoadedTemplateRef = useRef<boolean>(false);
  const editorOriginalTextRef = useRef<string>("");
  const combinationsAbortRef = useRef<AbortController | null>(null);

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
    const hasSimulParam = url.searchParams.has("simul");
    if (!hasSimulParam) return; // do not auto-fetch when simul is not explicitly provided
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (simul === "default") return;
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

  // On init: if URL contains simul=default, call template endpoint and initialize editor JSON
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (cancelled) return;
        if (hasLoadedTemplateRef.current) return;
        const url = new URL(window.location.href);
        const simul = url.searchParams.get("simul");
        if (simul !== "default") return;
        if (!refAdeme) return;
        if (hasUserEditedRef.current) return;

        const accessToken = await waitForAccessToken(15000, 250);
        if (!accessToken) return;

        const baseUrl = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const template = await fetchSimulationTemplateJson<any>({ baseUrl, ref_ademe: refAdeme, accessToken });
        if (cancelled) return;

        const sourceRuns: any[] = Array.isArray(template)
          ? template
          : (template && Array.isArray(template.runs) ? template.runs : []);

        const transformedRuns = sourceRuns.map((run) => {
          const forced = run?.parameters?.input_forced || {};
          const scenarios = Array.isArray(run?.scenarios) ? run.scenarios : [];
          const nextScenarios = scenarios.map((sc: any) => {
            const baseInput = (sc && sc.input && typeof sc.input === "object") ? sc.input : {};
            const mergedInput = { ...forced, ...baseInput };
            return { ...sc, input: mergedInput };
          });
          const { parameters, ...rest } = run || {};
          return { ...rest, scenarios: nextScenarios };
        });

        if (transformedRuns.length > 0) {
          hasLoadedTemplateRef.current = true;
          setJsonText(JSON.stringify(transformedRuns, null, 2));
        }
      } catch {
        // ignore
      }
    };

    run();
    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh") { run(); }
      } catch {}
    });
    return () => { try { (removeHub as any)?.(); } catch {}; cancelled = true; };
  }, [refAdeme]);

  // On init: if URL contains ?ref_ademe=..., call backoffice endpoint (Bearer included when available)
  useEffect(() => {
    if (hasInitFetchedRef.current) return;
    const url = new URL(window.location.href);
    const refAdeme = url.searchParams.get("ref_ademe");
    const hasSimulParam = url.searchParams.has("simul");
    if (!hasSimulParam) return; // do not auto-fetch when simul is not explicitly provided
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (simul === "default") return;
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

  // When only ref_ademe is present and no simul param, initialize editor to [] and open load modal (after token available)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hasRef = Boolean(url.searchParams.get("ref_ademe"));
        const hasSimul = url.searchParams.has("simul");
        if (hasRef && !hasSimul) {
          if (!hasUserEditedRef.current) setJsonText("[]");
          const token = await waitForAccessToken(15000, 250);
          if (cancelled) return;
          if (token) setIsLoadSavedOpen(true);
        }
      } catch {}
    };
    run();
    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh") { run(); }
      } catch {}
    });
    return () => { try { (removeHub as any)?.(); } catch {}; cancelled = true; };
  }, [refAdeme]);

  // When opening with both ref_ademe and simul, expand the editor drawer by default
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const hasRef = Boolean(url.searchParams.get("ref_ademe"));
      const simul = url.searchParams.get("simul");
      if (hasRef && simul && simul !== "default") {
        setIsEditorOpen(true);
      }
    } catch {}
  }, [refAdeme, simulLog]);

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

  // If no Cognito token becomes available shortly after load, redirect to sign-in
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await waitForAccessToken(5000, 250);
        if (cancelled) return;
        if (token) return; // already authenticated
        // Compute auth URL similarly to TopMenu.authHref
        const configured = import.meta.env.VITE_AUTH_URL as string | undefined;
        const buildAuthBase = () => {
          if (configured) {
            try {
              const configuredUrl = new URL(configured);
              const isConfiguredLocal = ["localhost", "127.0.0.1"].includes(configuredUrl.hostname);
              const isPageLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
              if (isConfiguredLocal && !isPageLocal) {
                // ignore local auth URL on non-localhost pages
              } else {
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
        };
        const authBase = buildAuthBase();
        const sep = authBase.includes("?") ? "&" : "?";
        const target = `${authBase}${sep}returnTo=${encodeURIComponent(window.location.href)}`;
        window.location.href = target;
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Capture the JSON snapshot when opening the editor to detect unconfirmed changes
  useEffect(() => {
    try {
      if (isEditorOpen) {
        editorOriginalTextRef.current = jsonText || "";
      }
    } catch {}
  }, [isEditorOpen]);

  // Compute combinations count based on current JSON, ref_ademe and simul
  useEffect(() => {
    try { combinationsAbortRef.current?.abort(); } catch {}
    const simulName = (simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl");
    if (!refAdeme || !simulName) { setTotalCombinations(undefined); return; }
    // Validate and parse JSON before calling
    let parsedSimul: unknown = {};
    try { parsedSimul = jsonText.trim() ? JSON.parse(jsonText) : {}; } catch { setTotalCombinations(undefined); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const url = new URL("/backoffice/simulation_count", base);
        url.searchParams.set("ref_ademe", String(refAdeme));
        url.searchParams.set("simul", String(simulName));
        const controller = new AbortController();
        combinationsAbortRef.current = controller;
        const res = await authorizedFetch(url.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          body: JSON.stringify({ ref_ademe: refAdeme, simul: simulName, simul_content: parsedSimul }),
          signal: controller.signal,
        });
        if (!res.ok) { setTotalCombinations(undefined); return; }
        const data: any = await res.json().catch(() => null);
        const value = Number(((data && data.data && data.data.total_combinations) ?? (data && data.total_combinations)) as any);
        if (Number.isFinite(value)) setTotalCombinations(value); else setTotalCombinations(undefined);
      } catch {
        setTotalCombinations(undefined);
      }
    }, 600);
    return () => { cancelled = true; try { window.clearTimeout(timer); } catch {}; };
  }, [refAdeme, simulLog, jsonText]);

  // (removed nbCombinations UI; we rely on dynamically computed totalCombinations)

  // Submit is always enabled now

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

  async function fetchQueueOnce() {
    try {
      if (!refAdeme) return;
      const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
      const simulName = simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
      const urlQueue = new URL("/backoffice/get_redis_detail", base);
      urlQueue.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlQueue.searchParams.set("log", `${simulName}_o3cl_queue`);
      const urlDoing = new URL("/backoffice/get_redis_detail", base);
      urlDoing.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDoing.searchParams.set("log", `${simulName}_o3cl_doing_queue`);
      const urlDone = new URL("/backoffice/get_redis_detail", base);
      urlDone.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDone.searchParams.set("log", `${simulName}_o3cl_done_queue`);

      const [qres, doingRes, dres] = await Promise.all([
        authorizedFetch(urlQueue.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        authorizedFetch(urlDoing.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        authorizedFetch(urlDone.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
      ]);

      const parseItems = async (res: Response): Promise<any[]> => {
        if (!res.ok) return [];
        const data: any = await res.json().catch(() => null);
        if (Array.isArray(data?.items)) return data.items as any[];
        if (Array.isArray(data)) return data as any[];
        if (data && typeof data === "object" && Array.isArray((data as any).queue)) return (data as any).queue as any[];
        return [];
      };

      const [queueList, doingListRaw, doneListRaw] = await Promise.all([parseItems(qres), parseItems(doingRes), parseItems(dres)]);
      const doingList = (doingListRaw || []).map((it: any) => ({ ...it, status: 1, __kind: "doing" }));
      const doneList = (doneListRaw || []).map((it: any) => ({ ...it, status: 2, __kind: "done" }));
      const merged = [...doneList, ...doingList, ...queueList];
      setQueueItems(merged);
      setQueueSegments(merged.length || 0);
      setCurrentDoneCount(doneList.length || 0);

      // Stop polling when both running and doing queues become empty
      if ((queueList?.length || 0) === 0 && (doingList?.length || 0) === 0) {
        try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
      }
    } catch {}
  }

  function startQueuePolling(opts?: { skipImmediate?: boolean }) {
    try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    const raw = (import.meta as any)?.env?.VITE_POLL_QUEUE_DELAY;
    const n = Number(raw);
    const delayMs = Number.isFinite(n) && n > 0 ? n : 5000;
    if (!opts?.skipImmediate) { void fetchQueueOnce(); }
    const id = window.setInterval(fetchQueueOnce, delayMs);
    queuePollIdRef.current = id;
  }

  function handleRefreshProgress() {
    try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    const raw = (import.meta as any)?.env?.VITE_POLL_QUEUE_DELAY;
    const n = Number(raw);
    const delayMs = Number.isFinite(n) && n > 0 ? n : 5000;
    void fetchQueueOnce();
    window.setTimeout(() => { void fetchQueueOnce(); }, delayMs);
    window.setTimeout(() => { void fetchQueueOnce(); }, delayMs * 2);
  }

  useEffect(() => {
    return () => {
      try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    };
  }, []);

  useEffect(() => {
    if (!queueItems.length) return;
    const id = window.setInterval(() => setQueueNowTick((t) => t + 1), 1000);
    return () => { try { window.clearInterval(id); } catch {} };
  }, [queueItems.length]);

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
          nb_combinations: Number(totalCombinations || 0),
          query,
        },
      };
      setSubmitting(true);
      // Only call direct_scenarios when nb chunks <= 1
      const shouldDirect = Number(numChunks || 1) <= 1;
      if (shouldDirect) {
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
        // eslint-disable-next-line no-console
        console.log("simulation payload", body);
      }
      try { activePollAbortRef.current?.cancel(); } catch {}
      setIsPolling(false);
      // After submit, start polling only the queue/done endpoints. Delay first hit to avoid hitting on first tick.
      startQueuePolling({ skipImmediate: true });
      // If nb chunks > 1, also call append_scenarios
      if (Number(numChunks || 1) > 1) {
        const appendBody = {
          redis_db: 1,
          task: "tasks.ext_o3cl_managing.init_scenarios",
          args: {
            run_name: simulLog || "dev_report_o3cl",
            ref_ademe: refAdeme,
            nb_chunks: Number(numChunks || 1),
            nb_workers: Number(numWorkers || 1),
            nb_combinations: Number(totalCombinations || 0),
            query,
          },
        } as Record<string, unknown>;
        try {
          const res2 = await fetch(lambdaUrl, {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(appendBody),
          });
          if (!res2.ok) {
            const txt2 = await res2.text().catch(() => "");
            throw new Error(`HTTP ${res2.status} ${txt2}`);
          }
          message.success(`appending scenarios across ${Number(numChunks)} chunks`);
          // eslint-disable-next-line no-console
          console.debug("append_scenarios payload", appendBody);
        } catch (e) {
          message.error("Failed to append scenarios");
        }
      }
    } catch (err) {
      message.error("Invalid JSON");
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmWorkers() {
    const value = Number(numWorkers || 0);
    const allowed = [1, 2, 3, 4, 6, 8];
    if (!allowed.includes(value)) {
      setWorkersError(`Invalid workers: ${value}. Allowed: ${allowed.join(", ")}`);
      setConfirmedWorkers(undefined);
      return;
    }
    setWorkersError(undefined);
    setConfirmedWorkers(value);

    // Call scaling lambda
    const lambdaUrl = (import.meta.env.VITE_SIMULATION_LAMBDA_URL as string) || "https://6vyebgqw4plhmxrewmsgh6yere0bwpos.lambda-url.eu-west-3.on.aws/";
    const body = {
      redis_db: 1,
      task: "tasks.r_ecs_scaling.scale",
      args: {
        cluster: "checkdpe-dev-cluster",
        service: "checkdpe-cd-3cl-dev-service",
        desired: value,
      },
    };
    // eslint-disable-next-line no-console
    console.debug("[simulation] scaling workers", body);
    fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${txt}`);
        }
        message.success(`updated workers to ${value}`);
      })
      .catch(() => {
        message.error("failed to update workers");
      });
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        {isEditorOpen ? (
          <div style={{ position: "sticky", top: 24, alignSelf: "flex-start" }}>
            <DpeDrawerEditor
              inline
              open={isEditorOpen}
              onClose={() => setIsEditorOpen(false)}
              width={480}
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
                modifierSelection={modifierSelection}
              onHighlightJsonPath={({ collection, itemKey, indices }) => {
                try {
                  const ta = textAreaRef.current;
                  if (!ta) return;
                  const text = ta.value;
                  const variantPath = `dpe.logement.enveloppe.${collection}.${itemKey}`;
                  let searchFrom = 0;
                  let scopeArrayStart = -1;
                  let scopeArrayEnd = -1;
                  while (true) {
                    const varIdx = text.indexOf('"elements_variant"', searchFrom);
                    if (varIdx === -1) break;
                    const quoteIdx = text.indexOf('"', varIdx + 18);
                    const quoteEnd = quoteIdx !== -1 ? text.indexOf('"', quoteIdx + 1) : -1;
                    const value = quoteIdx !== -1 && quoteEnd !== -1 ? text.slice(quoteIdx + 1, quoteEnd) : '';
                    if (value === variantPath) {
                      const scopeKeyIdx = text.indexOf('"elements_scope"', varIdx);
                      if (scopeKeyIdx !== -1) {
                        const openBracket = text.indexOf('[', scopeKeyIdx);
                        if (openBracket !== -1) {
                          scopeArrayStart = openBracket;
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
                  try { (ta as any).focus({ preventScroll: true }); } catch { try { ta.focus(); } catch {} }
                  try { ta.setSelectionRange(scopeArrayStart, scopeArrayEnd); } catch {}
                  try { ta.scrollTop = prevScrollTop; ta.scrollLeft = prevScrollLeft; } catch {}
                  window.setTimeout(() => {
                    try {
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
        ) : null}

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Simulation</Title>
              <Button type="primary" size="large" icon={<LeftOutlined />} onClick={openEditor} disabled={isEditorOpen}>Edit</Button>
            </div>
            <Button onClick={() => setIsChainlitOpen(true)}>build with AI</Button>
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
                    label: (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>Options</span>
                        {typeof totalCombinations === "number" ? (
                          <strong style={{ fontWeight: 600 }}>combinations: {totalCombinations}</strong>
                        ) : null}
                      </div>
                    ),
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
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <InputNumber value={1} disabled style={{ width: 140 }} min={1} />
                            <span style={{ color: "#6b7280", fontSize: 12 }}>(read-only)</span>
                          </div>
                        </div>
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
              <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                <Tooltip title={isChunksTooBig ? "chunks too big (max.50)" : undefined}>
                  <span style={{ display: "inline-block" }}>
                    <Button type="primary" onClick={handleSubmit} loading={submitting} disabled={isChunksTooBig}>submit</Button>
                  </span>
                </Tooltip>
                <div style={{ position: "relative" }}>
                  <Button onClick={() => setIsSaveMenuOpen((v) => !v)}>...</Button>
                  {isSaveMenuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, width: 260, boxShadow: "0 4px 14px rgba(0,0,0,0.08)", zIndex: 10 }}>
                    <div style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6 }} onClick={() => { setIsLoadSavedOpen(true); setIsSaveMenuOpen(false); }}>load scenario</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={() => { if (!isSaving) handleSaveToBackoffice(); }}>save {simulLog || "default"}</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={async () => {
                      if (isSaving) return;
                      const cdEnv = ((import.meta as any)?.env?.VITE_CD_ENV as string | undefined) || (import.meta.env.MODE === "development" ? "dev" : "prod");
                      const suggested = `${cdEnv}_simul_${simulLog || "test0001"}`;
                      const name = window.prompt(
                        "Save as name (format: <CD_ENV>_simul_<name>, e.g., dev_simul_test0001):",
                        suggested
                      );
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
                        if (refAdeme) {
                          const { origin, pathname } = window.location;
                          const basePath = (() => {
                            try {
                              const idx = pathname.lastIndexOf("/");
                              return idx !== -1 ? pathname.slice(0, idx + 1) : "/";
                            } catch {
                              return "/";
                            }
                          })();
                          const targetUrl = `${origin}${basePath}index.html?ref_ademe=${encodeURIComponent(refAdeme)}&simul=${encodeURIComponent(name)}`;
                          window.location.href = targetUrl;
                        }
                      } catch {
                        message.error("save failed");
                      } finally {
                        setIsSaving(false);
                        setIsSaveMenuOpen(false);
                      }
                    }}>save as…</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6 }} onClick={() => { handleRefreshProgress(); setIsSaveMenuOpen(false); }}>refresh progress</div>
                    </div>
                  )}
                </div>
              </div>
              {queueSegments > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 10, background: "#e5e7eb", borderRadius: 8, overflow: "hidden", display: "flex" }}>
                    {(queueItems.length ? queueItems : Array.from({ length: queueSegments })).map((item: any, idx: number) => {
                      const ts = item?.ts_started;
                      let startedAtMs = 0;
                      try {
                        if (typeof ts === "number") startedAtMs = ts > 1e12 ? ts : ts * 1000;
                        else if (typeof ts === "string") {
                          const n = Number(ts);
                          if (Number.isFinite(n)) startedAtMs = n > 1e12 ? n : n * 1000; else {
                            const t = Date.parse(ts);
                            if (!Number.isNaN(t)) startedAtMs = t;
                          }
                        }
                      } catch {}
                      const elapsedSec = Math.max(0, (Date.now() - startedAtMs) / 1000);
                      const statusNum = Number(item?.status ?? 0);
                      const pct = statusNum >= 2 ? 100 : Math.max(0, Math.min(100, (elapsedSec / 60) * 100));
                      const fillColor = statusNum >= 2 ? "#22c55e" : (statusNum >= 1 ? "#93c5fd" : "transparent");
                      return (
                        <div key={idx} style={{ flex: 1, display: "flex" }}>
                          <div style={{ width: `${pct}%`, background: fillColor, transition: "width 1s linear" }} />
                          {idx < queueSegments - 1 ? (
                            <div style={{ width: 2, background: "#ffffff" }} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-start", minHeight: 24 }}>
                {!resultsUrl && isPolling && (
                  <Spin size="small" />
                )}
                {resultsUrl && (
                  <a href={resultsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Open simulation results <ExportOutlined />
                  </a>
                )}
              </div>
              {refAdeme ? (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Results preview</Title>
                    <Button
                      size="small"
                      onClick={() => {
                        setLastRefreshedDoneCount(currentDoneCount);
                        setResultsRefreshKey((k) => k + 1);
                      }}
                    >
                      refresh
                    </Button>
                  </div>
                  <Card style={{ background: "#ffffff", borderColor: "#e5e7eb" }} styles={{ body: { padding: 16 } }}>
                    <SimulationResults
                      key={resultsRefreshKey}
                      dpeId={refAdeme}
                      simul={simulLog}
                      getAccessToken={async () => (await getAccessToken()) || undefined}
                      apiBaseUrl={(import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr"}
                      width={720}
                      height={300}
                      onSelectPoint={(p) => setSelectedPoint(p)}
                      onPointDetail={(d) => {
                        try {
                          setSelectedPointDetail(d);
                          // Extract modifierId array from detail response (support both direct and within redis_obj)
                          let root: any = d;
                          const rawRedis = (d && (d as any).redis_obj) as unknown;
                          if (typeof rawRedis === "string") {
                            try { root = JSON.parse(rawRedis); } catch { root = d; }
                          }
                          const resultArr: any[] = Array.isArray(root?.data?.result) ? root.data.result : (Array.isArray(root?.result) ? root.result : []);
                          const first = (resultArr && resultArr.length) ? resultArr[0] : root;
                          const mod = (first && (first.modifierId || first.modifier_id || first.modifier)) as any;
                          const arr = Array.isArray(mod) ? mod : [];
                          const normalized = arr
                            .map((it: any) => ({ path: String(it?.path || ""), seq: Array.isArray(it?.seq) ? (it.seq as any[]).map((n) => Number(n)).filter((n) => Number.isFinite(n)) : [] }))
                            .filter((it: any) => it.path && it.seq && it.seq.length);
                          setModifierSelection(normalized.length ? normalized : null);
                        } catch {
                          setModifierSelection(null);
                        }
                      }}
                      selectedIndex={selectedPoint?.index}
                      primaryColor="#1677ff"
                      xMetric={resultsXMetric}
                      yMetric={resultsYMetric}
                      onXMetricChange={setResultsXMetric}
                      onYMetricChange={setResultsYMetric}
                      mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }}
                    />
                    <div style={{ marginTop: 12 }}>
                      <SimulationDetailCard point={selectedPoint || undefined} mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }} />
                      {(() => {
                        try {
                          const raw = (selectedPointDetail && (selectedPointDetail as any).redis_obj) as unknown;
                          if (raw == null) return null;
                          let root: any = null;
                          if (typeof raw === "string") {
                            try { root = JSON.parse(raw); } catch { root = null; }
                          } else if (typeof raw === "object") {
                            root = raw;
                          }
                          if (!root || typeof root !== "object") return null;
                          const resultArr: any[] = Array.isArray((root as any)?.data?.result) ? (root as any).data.result : (Array.isArray((root as any)?.result) ? (root as any).result : []);
                          const targetId = (selectedPoint as any)?.id as (string | undefined);
                          const item = (Array.isArray(resultArr) && resultArr.length)
                            ? (resultArr.find((it: any) => String(it?.id || "") === String(targetId || "")) || resultArr[0])
                            : null;
                          const mod = item ? (item.modifierId || item.modifier_id || item.modifier) : undefined;
                          if (!mod) return null;
                          const pretty = JSON.stringify(mod, null, 2);
                          return (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ color: "#4b5563", marginBottom: 6 }}>modifierId</div>
                              <pre style={{ margin: 0, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{pretty}
                              </pre>
                            </div>
                          );
                        } catch { return null; }
                      })()}
                    </div>
                  </Card>
                </div>
              ) : null}
              {/* editor inline panel is rendered on the right */}
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
            <LoadScenarioModal
              open={isLoadSavedOpen}
              onCancel={() => setIsLoadSavedOpen(false)}
              onSelect={(payload: unknown) => {
                try {
                  // Accept payload either as normalized object { ref_ademe, label } or string "ref:label"
                  let ref: string | undefined;
                  let simul: string | undefined;
                  if (typeof payload === "string") {
                    const colon = payload.indexOf(":");
                    ref = colon !== -1 ? payload.slice(0, colon) : undefined;
                    simul = colon !== -1 ? payload.slice(colon + 1) : undefined;
                  } else if (payload && typeof payload === "object") {
                    ref = (payload as any).ref_ademe as string | undefined;
                    simul = (payload as any).label as string | undefined;
                  }
                  const url = new URL(window.location.href);
                  if (ref) url.searchParams.set("ref_ademe", ref);
                  if (simul) url.searchParams.set("simul", simul);
                  window.location.href = url.toString();
                } catch {}
                setIsLoadSavedOpen(false);
              }}
              baseUrl={(import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr"}
              initialRefAdeme={refAdeme}
              getAccessToken={getAccessToken}
            />
          </Card>
        </div>

        {(() => {
          const chainlitUrl = (() => {
            const configured = import.meta.env.VITE_CHAINLIT_URL as string | undefined;
            if (configured && typeof configured === "string" && configured.trim()) return configured.trim();
            return "https://chainlit-stg.etiquettedpe.fr/chainlit";
          })();
          return (
            <ChainlitChatDrawer
              open={isChainlitOpen}
              onClose={() => setIsChainlitOpen(false)}
              title="Assistant"
              serverUrl={chainlitUrl}
              userEnv={{
                mail: "germain.blanchet@gmail.com",
                button_id: "contactez_nous",
                ref_ademe: refAdeme || "2508E0243162W",
              }}
            />
          );
        })()}

      </div>
      </div>
    </div>
  );
};



```

Updated the detail JSON rendering to only show the modifierId array.

- Now parses `redis_obj`, finds the result item matching the selected point’s id (falls back to first), and renders only its `modifierId` (supports `modifier_id`/`modifier` aliases).
- Label changed to “modifierId”; endpoint full payload is no longer displayed.

File changed:
- `apps/simul/src/App.tsx`

---

**User**

[
  {
    "path": "dpe.logement.enveloppe.plancher_haut_collection.plancher_haut",
    "seq": [
      -1
    ]
  },
  {
    "path": "dpe.logement.enveloppe.plancher_bas_collection.plancher_bas",
    "seq": [
      -1
    ]
  },
  {
    "path": "dpe.logement.enveloppe.mur_collection.mur",
    "seq": [
      -1,
      201,
      203,
      202,
      -1
    ]
  }
]

good so when i receive this, i d like to outline a rectangle of selected scenario for 
    "path": "dpe.logement.enveloppe.plancher_haut_collection.plancher_haut",

fro
    "path": "dpe.logement.enveloppe.plancher_bas_collection.plancher_bas",

but not     "path": "dpe.logement.enveloppe.mur_collection.mur",
because there are multiple modifierId

---

**Cursor**

I'll add a persistent outline highlight for scope items in `DpeDrawerEditor.tsx` when `modifierSelection` indicates a single target selection for a variant. This will compute indices to highlight and apply a bordered style to the corresponding row; variants with multiple modifier IDs (like `mur_collection.mur`) won't be highlighted.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

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
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
  // Optional: selection hints from a simulation detail endpoint
  modifierSelection?: { path: string; seq: number[] }[] | null;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false, modifierSelection = null }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [externalScopeHighlight, setExternalScopeHighlight] = useState<Record<VariantId, number[]>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);
  // Keep a copy of the fetched envelope to derive options when variants appear
  const [envelopeData, setEnvelopeData] = useState<any | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Store envelope for later option derivation (after variant defs resolve)
            try {
              const env = (data as any)?.dpe?.logement?.enveloppe || null;
              setEnvelopeData(env);
            } catch {}
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Rebuild available options whenever variants resolve and we have envelope data, also sync selected from JSON
  useEffect(() => {
    try {
      if (!envelopeData) return;
      const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
        const collectionObj = envelopeData?.[v.collection];
        let items: any[] = [];
        if (Array.isArray(collectionObj?.[v.itemKey])) {
          items = collectionObj[v.itemKey] as any[];
        } else if (Array.isArray(collectionObj)) {
          items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
        }
        optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
          key: String(item?.donnee_entree?.reference || idx),
          description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
          selected: scopes.includes(idx),
          payload: item,
        }));
      }
      setAvailableOptions(optionsMap);
    } catch {}
  }, [envelopeData, variantDefs]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

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
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
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

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
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

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
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
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  // Apply external modifier selection: set elements_scope for matching variant when unambiguous
  useEffect(() => {
    try {
      if (!open) return;
      if (!modifierSelection || !Array.isArray(modifierSelection) || modifierSelection.length === 0) return;
      // Parse current runs
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      if (!Array.isArray(parsed)) return;
      const runs: any[] = parsed;
      let changed = false;
      for (const mod of modifierSelection) {
        try {
          const path = String((mod as any)?.path || "");
          const seq: number[] = Array.isArray((mod as any)?.seq) ? ((mod as any).seq as number[]).map((n) => Number(n)) : [];
          if (!path || !seq.length) continue;
          const parsedPath = parseVariantPath(path);
          if (!parsedPath) continue;
          const variantId = `dpe.logement.enveloppe.${parsedPath.collection}.${parsedPath.itemKey}`;
          // Only apply when there is a single target (seq length is 1)
          if (seq.length !== 1) continue;
          const desired = seq[0];
          const entryIndex = runs.findIndex((r) => r && r.elements_variant === variantId);
          if (entryIndex === -1) continue;
          const entry = runs[entryIndex];
          // Resolve envelope items for this variant to map id->index
          const collectionObj = envelopeData?.[parsedPath.collection];
          let items: any[] = [];
          if (Array.isArray(collectionObj?.[parsedPath.itemKey])) {
            items = collectionObj[parsedPath.itemKey] as any[];
          } else if (Array.isArray(collectionObj)) {
            items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[parsedPath.itemKey] : undefined)).filter(Boolean);
          }
          if (!Array.isArray(items) || items.length === 0) continue;
          let idxToSelect = -1;
          if (desired === -1) {
            // "current" -> select the only item when unambiguous (single item)
            if (items.length === 1) idxToSelect = 0;
          } else if (Number.isFinite(desired)) {
            // Try match by donnee_entree.reference
            const targetId = Number(desired);
            idxToSelect = items.findIndex((it: any) => Number((it?.donnee_entree?.reference as any)) === targetId);
          }
          if (idxToSelect !== -1) {
            const scopes: number[] = [idxToSelect];
            if (!Array.isArray(entry.elements_scope) || String(entry.elements_scope) !== String(scopes)) {
              entry.elements_scope = scopes;
              changed = true;
            }
          }
        } catch {}
      }
      if (changed) onApply(JSON.stringify(runs, null, 2));
    } catch {}
  }, [open, modifierSelection, rootJsonText, envelopeData, variantDefs, onApply]);

  // Compute indices to visually outline from modifierSelection (single-target only)
  useEffect(() => {
    try {
      if (!modifierSelection || !Array.isArray(modifierSelection) || modifierSelection.length === 0) { setExternalScopeHighlight({}); return; }
      const map: Record<VariantId, number[]> = {};
      for (const mod of modifierSelection) {
        try {
          const path = String((mod as any)?.path || "");
          const seq: number[] = Array.isArray((mod as any)?.seq) ? ((mod as any).seq as number[]).map((n) => Number(n)) : [];
          if (!path || seq.length !== 1) continue; // only single target
          const parsedPath = parseVariantPath(path);
          if (!parsedPath) continue;
          const variantId = `dpe.logement.enveloppe.${parsedPath.collection}.${parsedPath.itemKey}`;
          const desired = seq[0];
          const collectionObj = envelopeData?.[parsedPath.collection];
          let items: any[] = [];
          if (Array.isArray(collectionObj?.[parsedPath.itemKey])) {
            items = collectionObj[parsedPath.itemKey] as any[];
          } else if (Array.isArray(collectionObj)) {
            items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[parsedPath.itemKey] : undefined)).filter(Boolean);
          }
          let idxToSelect = -1;
          if (desired === -1) {
            if (items.length === 1) idxToSelect = 0; // #current implicit single item
          } else if (Number.isFinite(desired)) {
            const targetId = Number(desired);
            idxToSelect = items.findIndex((it: any) => Number((it?.donnee_entree?.reference as any)) === targetId);
          }
          if (idxToSelect !== -1) {
            map[variantId] = [idxToSelect];
          }
        } catch {}
      }
      setExternalScopeHighlight(map);
    } catch { setExternalScopeHighlight({}); }
  }, [modifierSelection, envelopeData]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] } as any;
                              // Default scope to all available options for this variant when enabling
                              try {
                                const opts = availableOptions[v.id] || [];
                                entry.elements_scope = opts.map((_, i) => i);
                              } catch {}
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
                            } else {
                              const entry = runs[idxInRuns];
                              if (!Array.isArray(entry.elements_scope) || entry.elements_scope.length === 0) {
                                try {
                                  const opts = availableOptions[v.id] || [];
                                  entry.elements_scope = opts.map((_: any, i: number) => i);
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
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
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
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
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {/* Row 0: always-present current scenario derived from envelopeData */}
                  {(() => {
                    try {
                      // Determine configured input key to read from envelope items
                      const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
                      const inputPath = String(configuredInputKey || "").split(".").filter(Boolean);
                      // Determine current scopes for this variant
                      let parsed: any = [];
                      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                      const runsArr: any[] = Array.isArray(parsed) ? parsed : [];
                      const entry = runsArr.find((r) => r && r.elements_variant === v.id) || {};
                      let scopes: number[] = Array.isArray(entry.elements_scope) ? (entry.elements_scope as number[]) : [];
                      if (!scopes.length) {
                        // Fallback to UI options selection if JSON has no scopes
                        scopes = (availableOptions[v.id] || []).map((o, idx) => (o.selected ? idx : -1)).filter((n) => n !== -1);
                      }
                      // Collect values from envelope items for selected scopes
                      const collectionObj = envelopeData?.[v.collection];
                      let items: any[] = [];
                      if (Array.isArray(collectionObj?.[v.itemKey])) {
                        items = collectionObj[v.itemKey] as any[];
                      } else if (Array.isArray(collectionObj)) {
                        items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
                      }
                      const nums: number[] = scopes
                        .map((idx) => {
                          const item = items?.[idx];
                          const val = inputPath.length ? deepGet(item, inputPath as any) : undefined;
                          const num = typeof val === "number" ? val : Number(val);
                          return Number.isFinite(num) ? num : NaN;
                        })
                        .filter((n) => Number.isFinite(n)) as number[];
                      let displayVal: string = "—";
                      if (nums.length) {
                        const min = Math.min(...nums);
                        const max = Math.max(...nums);
                        displayVal = min === max ? String(min) : `${min}-${max}`;
                      }
                      return (
                        <>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 12 }}>
                            <Checkbox checked disabled />
                            <span>#current</span>
                          </label>
                          <div style={{ fontSize: 12, color: "#374151" }}>
                            {displayVal}
                          </div>
                          <div>
                            <InputNumber size="small" controls={false} min={0} value={0} disabled style={{ width: "100%" }} />
                          </div>
                        </>
                      );
                    } catch {
                      return null;
                    }
                  })()}

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
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
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
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
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

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
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
  // Optional: selection hints from a simulation detail endpoint
  modifierSelection?: { path: string; seq: number[] }[] | null;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false, modifierSelection = null }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [externalScopeHighlight, setExternalScopeHighlight] = useState<Record<VariantId, number[]>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);
  // Keep a copy of the fetched envelope to derive options when variants appear
  const [envelopeData, setEnvelopeData] = useState<any | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Store envelope for later option derivation (after variant defs resolve)
            try {
              const env = (data as any)?.dpe?.logement?.enveloppe || null;
              setEnvelopeData(env);
            } catch {}
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Rebuild available options whenever variants resolve and we have envelope data, also sync selected from JSON
  useEffect(() => {
    try {
      if (!envelopeData) return;
      const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
        const collectionObj = envelopeData?.[v.collection];
        let items: any[] = [];
        if (Array.isArray(collectionObj?.[v.itemKey])) {
          items = collectionObj[v.itemKey] as any[];
        } else if (Array.isArray(collectionObj)) {
          items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
        }
        optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
          key: String(item?.donnee_entree?.reference || idx),
          description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
          selected: scopes.includes(idx),
          payload: item,
        }));
      }
      setAvailableOptions(optionsMap);
    } catch {}
  }, [envelopeData, variantDefs]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

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
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
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

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
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

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
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
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  // Apply external modifier selection: set elements_scope for matching variant when unambiguous
  useEffect(() => {
    try {
      if (!open) return;
      if (!modifierSelection || !Array.isArray(modifierSelection) || modifierSelection.length === 0) return;
      // Parse current runs
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      if (!Array.isArray(parsed)) return;
      const runs: any[] = parsed;
      let changed = false;
      for (const mod of modifierSelection) {
        try {
          const path = String((mod as any)?.path || "");
          const seq: number[] = Array.isArray((mod as any)?.seq) ? ((mod as any).seq as number[]).map((n) => Number(n)) : [];
          if (!path || !seq.length) continue;
          const parsedPath = parseVariantPath(path);
          if (!parsedPath) continue;
          const variantId = `dpe.logement.enveloppe.${parsedPath.collection}.${parsedPath.itemKey}`;
          // Only apply when there is a single target (seq length is 1)
          if (seq.length !== 1) continue;
          const desired = seq[0];
          const entryIndex = runs.findIndex((r) => r && r.elements_variant === variantId);
          if (entryIndex === -1) continue;
          const entry = runs[entryIndex];
          // Resolve envelope items for this variant to map id->index
          const collectionObj = envelopeData?.[parsedPath.collection];
          let items: any[] = [];
          if (Array.isArray(collectionObj?.[parsedPath.itemKey])) {
            items = collectionObj[parsedPath.itemKey] as any[];
          } else if (Array.isArray(collectionObj)) {
            items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[parsedPath.itemKey] : undefined)).filter(Boolean);
          }
          if (!Array.isArray(items) || items.length === 0) continue;
          let idxToSelect = -1;
          if (desired === -1) {
            // "current" -> select the only item when unambiguous (single item)
            if (items.length === 1) idxToSelect = 0;
          } else if (Number.isFinite(desired)) {
            // Try match by donnee_entree.reference
            const targetId = Number(desired);
            idxToSelect = items.findIndex((it: any) => Number((it?.donnee_entree?.reference as any)) === targetId);
          }
          if (idxToSelect !== -1) {
            const scopes: number[] = [idxToSelect];
            if (!Array.isArray(entry.elements_scope) || String(entry.elements_scope) !== String(scopes)) {
              entry.elements_scope = scopes;
              changed = true;
            }
          }
        } catch {}
      }
      if (changed) onApply(JSON.stringify(runs, null, 2));
    } catch {}
  }, [open, modifierSelection, rootJsonText, envelopeData, variantDefs, onApply]);

  // Compute indices to visually outline from modifierSelection (single-target only)
  useEffect(() => {
    try {
      if (!modifierSelection || !Array.isArray(modifierSelection) || modifierSelection.length === 0) { setExternalScopeHighlight({}); return; }
      const map: Record<VariantId, number[]> = {};
      for (const mod of modifierSelection) {
        try {
          const path = String((mod as any)?.path || "");
          const seq: number[] = Array.isArray((mod as any)?.seq) ? ((mod as any).seq as number[]).map((n) => Number(n)) : [];
          if (!path || seq.length !== 1) continue; // only single target
          const parsedPath = parseVariantPath(path);
          if (!parsedPath) continue;
          const variantId = `dpe.logement.enveloppe.${parsedPath.collection}.${parsedPath.itemKey}`;
          const desired = seq[0];
          const collectionObj = envelopeData?.[parsedPath.collection];
          let items: any[] = [];
          if (Array.isArray(collectionObj?.[parsedPath.itemKey])) {
            items = collectionObj[parsedPath.itemKey] as any[];
          } else if (Array.isArray(collectionObj)) {
            items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[parsedPath.itemKey] : undefined)).filter(Boolean);
          }
          let idxToSelect = -1;
          if (desired === -1) {
            if (items.length === 1) idxToSelect = 0; // #current implicit single item
          } else if (Number.isFinite(desired)) {
            const targetId = Number(desired);
            idxToSelect = items.findIndex((it: any) => Number((it?.donnee_entree?.reference as any)) === targetId);
          }
          if (idxToSelect !== -1) {
            map[variantId] = [idxToSelect];
          }
        } catch {}
      }
      setExternalScopeHighlight(map);
    } catch { setExternalScopeHighlight({}); }
  }, [modifierSelection, envelopeData]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] } as any;
                              // Default scope to all available options for this variant when enabling
                              try {
                                const opts = availableOptions[v.id] || [];
                                entry.elements_scope = opts.map((_, i) => i);
                              } catch {}
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
                            } else {
                              const entry = runs[idxInRuns];
                              if (!Array.isArray(entry.elements_scope) || entry.elements_scope.length === 0) {
                                try {
                                  const opts = availableOptions[v.id] || [];
                                  entry.elements_scope = opts.map((_: any, i: number) => i);
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
                                outline: (externalScopeHighlight[v.id] && (externalScopeHighlight[v.id] as number[]).includes(idx)) ? "2px solid #2563eb" : "none",
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
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
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
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {/* Row 0: always-present current scenario derived from envelopeData */}
                  {(() => {
                    try {
                      // Determine configured input key to read from envelope items
                      const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
                      const inputPath = String(configuredInputKey || "").split(".").filter(Boolean);
                      // Determine current scopes for this variant
                      let parsed: any = [];
                      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                      const runsArr: any[] = Array.isArray(parsed) ? parsed : [];
                      const entry = runsArr.find((r) => r && r.elements_variant === v.id) || {};
                      let scopes: number[] = Array.isArray(entry.elements_scope) ? (entry.elements_scope as number[]) : [];
                      if (!scopes.length) {
                        // Fallback to UI options selection if JSON has no scopes
                        scopes = (availableOptions[v.id] || []).map((o, idx) => (o.selected ? idx : -1)).filter((n) => n !== -1);
                      }
                      // Collect values from envelope items for selected scopes
                      const collectionObj = envelopeData?.[v.collection];
                      let items: any[] = [];
                      if (Array.isArray(collectionObj?.[v.itemKey])) {
                        items = collectionObj[v.itemKey] as any[];
                      } else if (Array.isArray(collectionObj)) {
                        items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
                      }
                      const nums: number[] = scopes
                        .map((idx) => {
                          const item = items?.[idx];
                          const val = inputPath.length ? deepGet(item, inputPath as any) : undefined;
                          const num = typeof val === "number" ? val : Number(val);
                          return Number.isFinite(num) ? num : NaN;
                        })
                        .filter((n) => Number.isFinite(n)) as number[];
                      let displayVal: string = "—";
                      if (nums.length) {
                        const min = Math.min(...nums);
                        const max = Math.max(...nums);
                        displayVal = min === max ? String(min) : `${min}-${max}`;
                      }
                      return (
                        <>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 12 }}>
                            <Checkbox checked disabled />
                            <span>#current</span>
                          </label>
                          <div style={{ fontSize: 12, color: "#374151" }}>
                            {displayVal}
                          </div>
                          <div>
                            <InputNumber size="small" controls={false} min={0} value={0} disabled style={{ width: "100%" }} />
                          </div>
                        </>
                      );
                    } catch {
                      return null;
                    }
                  })()}

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
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
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
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
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

Done. Now, when a detail returns modifierId:
- For `plancher_haut_collection.plancher_haut` and `plancher_bas_collection.plancher_bas` with a single seq value, the corresponding option row in the left panel gets a blue outline rectangle.
- For `mur_collection.mur` with multiple seq values, no outline is applied.

This uses the existing modifierSelection wiring and only highlights when seq length is 1.

---

**User**

but i cant see any highlight in the left panel, can you check outline/around selected scenario?

---

**Cursor**

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

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
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
  // Optional: selection hints from a simulation detail endpoint
  modifierSelection?: { path: string; seq: number[] }[] | null;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

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

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false, modifierSelection = null }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [externalScopeHighlight, setExternalScopeHighlight] = useState<Record<VariantId, number[]>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);
  // Keep a copy of the fetched envelope to derive options when variants appear
  const [envelopeData, setEnvelopeData] = useState<any | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Store envelope for later option derivation (after variant defs resolve)
            try {
              const env = (data as any)?.dpe?.logement?.enveloppe || null;
              setEnvelopeData(env);
            } catch {}
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Rebuild available options whenever variants resolve and we have envelope data, also sync selected from JSON
  useEffect(() => {
    try {
      if (!envelopeData) return;
      const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
        const collectionObj = envelopeData?.[v.collection];
        let items: any[] = [];
        if (Array.isArray(collectionObj?.[v.itemKey])) {
          items = collectionObj[v.itemKey] as any[];
        } else if (Array.isArray(collectionObj)) {
          items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
        }
        optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
          key: String(item?.donnee_entree?.reference || idx),
          description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
          selected: scopes.includes(idx),
          payload: item,
        }));
      }
      setAvailableOptions(optionsMap);
    } catch {}
  }, [envelopeData, variantDefs]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

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
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
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

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
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

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
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

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
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
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  // Apply external modifier selection: set elements_scope for matching variant when unambiguous
  useEffect(() => {
    try {
      if (!open) return;
      if (!modifierSelection || !Array.isArray(modifierSelection) || modifierSelection.length === 0) return;
      // Parse current runs
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      if (!Array.isArray(parsed)) return;
      const runs: any[] = parsed;
      let changed = false;
      for (const mod of modifierSelection) {
        try {
          const path = String((mod as any)?.path || "");
          const seq: number[] = Array.isArray((mod as any)?.seq) ? ((mod as any).seq as number[]).map((n) => Number(n)) : [];
          if (!path || !seq.length) continue;
          const parsedPath = parseVariantPath(path);
          if (!parsedPath) continue;
          const variantId = `dpe.logement.enveloppe.${parsedPath.collection}.${parsedPath.itemKey}`;
          // Only apply when there is a single target (seq length is 1)
          if (seq.length !== 1) continue;
          const desired = seq[0];
          const entryIndex = runs.findIndex((r) => r && r.elements_variant === variantId);
          if (entryIndex === -1) continue;
          const entry = runs[entryIndex];
          // Resolve envelope items for this variant to map id->index
          const collectionObj = envelopeData?.[parsedPath.collection];
          let items: any[] = [];
          if (Array.isArray(collectionObj?.[parsedPath.itemKey])) {
            items = collectionObj[parsedPath.itemKey] as any[];
          } else if (Array.isArray(collectionObj)) {
            items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[parsedPath.itemKey] : undefined)).filter(Boolean);
          }
          if (!Array.isArray(items) || items.length === 0) continue;
          let idxToSelect = -1;
          if (desired === -1) {
            // "current" -> select the only item when unambiguous (single item)
            if (items.length === 1) idxToSelect = 0;
          } else if (Number.isFinite(desired)) {
            // Try match by donnee_entree.reference
            const targetId = Number(desired);
            idxToSelect = items.findIndex((it: any) => Number((it?.donnee_entree?.reference as any)) === targetId);
          }
          if (idxToSelect !== -1) {
            const scopes: number[] = [idxToSelect];
            if (!Array.isArray(entry.elements_scope) || String(entry.elements_scope) !== String(scopes)) {
              entry.elements_scope = scopes;
              changed = true;
            }
          }
        } catch {}
      }
      if (changed) onApply(JSON.stringify(runs, null, 2));
    } catch {}
  }, [open, modifierSelection, rootJsonText, envelopeData, variantDefs, onApply]);

  // Compute indices to visually outline from modifierSelection (single-target only)
  useEffect(() => {
    try {
      if (!modifierSelection || !Array.isArray(modifierSelection) || modifierSelection.length === 0) { setExternalScopeHighlight({}); return; }
      const map: Record<VariantId, number[]> = {};
      for (const mod of modifierSelection) {
        try {
          const path = String((mod as any)?.path || "");
          const seq: number[] = Array.isArray((mod as any)?.seq) ? ((mod as any).seq as number[]).map((n) => Number(n)) : [];
          if (!path || seq.length !== 1) continue; // only single target
          const parsedPath = parseVariantPath(path);
          if (!parsedPath) continue;
          const variantId = `dpe.logement.enveloppe.${parsedPath.collection}.${parsedPath.itemKey}`;
          const desired = seq[0];
          const collectionObj = envelopeData?.[parsedPath.collection];
          let items: any[] = [];
          if (Array.isArray(collectionObj?.[parsedPath.itemKey])) {
            items = collectionObj[parsedPath.itemKey] as any[];
          } else if (Array.isArray(collectionObj)) {
            items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[parsedPath.itemKey] : undefined)).filter(Boolean);
          }
          let idxToSelect = -1;
          if (desired === -1) {
            if (items.length === 1) idxToSelect = 0; // #current implicit single item
          } else if (Number.isFinite(desired)) {
            const targetId = Number(desired);
            idxToSelect = items.findIndex((it: any) => Number((it?.donnee_entree?.reference as any)) === targetId);
          }
          if (idxToSelect !== -1) {
            map[variantId] = [idxToSelect];
          }
        } catch {}
      }
      setExternalScopeHighlight(map);
    } catch { setExternalScopeHighlight({}); }
  }, [modifierSelection, envelopeData]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] } as any;
                              // Default scope to all available options for this variant when enabling
                              try {
                                const opts = availableOptions[v.id] || [];
                                entry.elements_scope = opts.map((_, i) => i);
                              } catch {}
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
                            } else {
                              const entry = runs[idxInRuns];
                              if (!Array.isArray(entry.elements_scope) || entry.elements_scope.length === 0) {
                                try {
                                  const opts = availableOptions[v.id] || [];
                                  entry.elements_scope = opts.map((_: any, i: number) => i);
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : ((externalScopeHighlight[v.id] && (externalScopeHighlight[v.id] as number[]).includes(idx)) ? "#eff6ff" : "transparent"),
                                border: (externalScopeHighlight[v.id] && (externalScopeHighlight[v.id] as number[]).includes(idx)) ? "2px solid #2563eb" : "1px solid transparent",
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
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
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
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {/* Row 0: always-present current scenario derived from envelopeData */}
                  {(() => {
                    try {
                      // Determine configured input key to read from envelope items
                      const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
                      const inputPath = String(configuredInputKey || "").split(".").filter(Boolean);
                      // Determine current scopes for this variant
                      let parsed: any = [];
                      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                      const runsArr: any[] = Array.isArray(parsed) ? parsed : [];
                      const entry = runsArr.find((r) => r && r.elements_variant === v.id) || {};
                      let scopes: number[] = Array.isArray(entry.elements_scope) ? (entry.elements_scope as number[]) : [];
                      if (!scopes.length) {
                        // Fallback to UI options selection if JSON has no scopes
                        scopes = (availableOptions[v.id] || []).map((o, idx) => (o.selected ? idx : -1)).filter((n) => n !== -1);
                      }
                      // Collect values from envelope items for selected scopes
                      const collectionObj = envelopeData?.[v.collection];
                      let items: any[] = [];
                      if (Array.isArray(collectionObj?.[v.itemKey])) {
                        items = collectionObj[v.itemKey] as any[];
                      } else if (Array.isArray(collectionObj)) {
                        items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
                      }
                      const nums: number[] = scopes
                        .map((idx) => {
                          const item = items?.[idx];
                          const val = inputPath.length ? deepGet(item, inputPath as any) : undefined;
                          const num = typeof val === "number" ? val : Number(val);
                          return Number.isFinite(num) ? num : NaN;
                        })
                        .filter((n) => Number.isFinite(n)) as number[];
                      let displayVal: string = "—";
                      if (nums.length) {
                        const min = Math.min(...nums);
                        const max = Math.max(...nums);
                        displayVal = min === max ? String(min) : `${min}-${max}`;
                      }
                      return (
                        <>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 12 }}>
                            <Checkbox checked disabled />
                            <span>#current</span>
                          </label>
                          <div style={{ fontSize: 12, color: "#374151" }}>
                            {displayVal}
                          </div>
                          <div>
                            <InputNumber size="small" controls={false} min={0} value={0} disabled style={{ width: "100%" }} />
                          </div>
                        </>
                      );
                    } catch {
                      return null;
                    }
                  })()}

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
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

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
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
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
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
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

I increased the visual prominence of the highlight:
- Selected rows now have a 2px solid blue border and a light blue background, instead of relying on outline only.
- This applies to the exact option index derived from `modifierSelection` when there’s a single seq for that variant.

Try clicking a point again to re-trigger the detail fetch; the left panel row for `plancher_haut` or `plancher_bas` should now clearly show the highlighted box.

