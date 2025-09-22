import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
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

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantKey | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantKey, { inputKey?: string; costKey?: string }>>({ haut: {}, bas: {} });
  const [forcedInputs, setForcedInputs] = useState<Record<VariantKey, string>>({ haut: "{\n}\n", bas: "{\n}\n" });
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantKey, boolean[]>>({ haut: [], bas: [] });
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantKey, "all" | "explode">>({ haut: "all", bas: "all" });
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantKey, { increments: number[]; priceVar: number[] }>>({
    haut: { increments: [], priceVar: [] },
    bas: { increments: [], priceVar: [] },
  });
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantKey, number[]>>({ haut: [], bas: [] });
  // Fetch from API when the drawer opens if configured
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    let isCancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
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

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
                const vtpl = editorVariants[k];
                const variantPath = `dpe.logement.enveloppe.${vtpl.collection}.${vtpl.itemKey}`;
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === variantPath) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [k]: { ...prev[k], incrementUnit: unit } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [k]: pretty }));
                  } catch {}
                }
              });
            } catch {}
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

  function deriveVariantPricingFromRuns(runsArr: any[], variantKey: VariantKey): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runsArr.find((r) => r && r.elements_variant === variantPath);
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

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const derived = deriveVariantPricingFromRuns(templateRuns, k);
        setTemplateDerived((prev) => ({ ...prev, [k]: derived }));
        const v = editorVariants[k];
        const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantPath) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [k]: ids }));
      });
    } catch {}
  }, [templateRuns, mappingKeys]);

  function getPresentScenarioIds(variantKey: VariantKey): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const v = editorVariants[variantKey];
      const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
      const entry = runs.find((r) => r && r.elements_variant === variantPath);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

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
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
          const v = editorVariants[k];
          const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[k] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[k] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) return;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[k] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[k].increments.length,
            pricing[k].priceVar.length,
            pricing[k].priceFix.length,
            (scenarioEnabled[k] || []).length,
            (templateScenarioIds[k] || []).length
          );
          const configuredInputKey = mappingKeys[k]?.inputKey || getFirstScenarioInputKey(k) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[k]?.[idx]);
            if (enabled) {
              const idFromTemplate = (templateScenarioIds[k] && templateScenarioIds[k][idx] != null) ? Number(templateScenarioIds[k][idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[k]?.increments?.[idx] ?? NaN);
              const incFromState = Number(pricing[k].increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[k] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[k]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pricing[k].priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const idFromTemplate = (templateScenarioIds[k] && templateScenarioIds[k][idx] != null) ? Number(templateScenarioIds[k][idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        });
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        onClose();
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
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
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
          const v = editorVariants[k];
          const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
          const entry = runsAll.find((r) => r && r.elements_variant === variantPath) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [k]: { ...prev[k], incrementUnit: unit } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [k]: pretty }));
            } catch {}
          }
        });
      } catch {}

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

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      (Object.keys(editorVariants) as VariantKey[]).forEach((k) => {
        const presentIds = new Set<number>(getPresentScenarioIds(k));
        const ids = templateScenarioIds[k] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [k]: flags }));
        }
      });
    } catch {}
  }, [open, rootJsonText, templateScenarioIds]);

  function toggleScenarioPresence(variantKey: VariantKey, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = editorVariants[variantKey];
        const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[variantKey] || "all", scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantKey] && templateScenarioIds[variantKey][idx] != null)
          ? Number(templateScenarioIds[variantKey][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantKey]?.inputKey || getFirstScenarioInputKey(variantKey) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantKey]?.costKey || getFirstScenarioCostKey(variantKey) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantKey]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantKey]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantKey] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantKey]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantKey]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantKey];
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantKey]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = editorVariants[variantKey];
        const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantKey] && templateScenarioIds[variantKey][idx] != null)
            ? Number(templateScenarioIds[variantKey][idx])
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
      const current = prev[variantKey] ? prev[variantKey].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantKey]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

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
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
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
                <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
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
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "increments", tempUnit: pricing[k].incrementUnit, tempKey: mappingKeys[k]?.inputKey || getFirstScenarioInputKey(k) || "", tempForcedInputs: forcedInputs[k] || "{\n}\n" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price var</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].priceUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "priceVar", tempUnit: pricing[k].priceUnit, tempKey: mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "", tempForcedInputs: "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price fix</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[k].priceUnit})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: k, field: "priceFix", tempUnit: pricing[k].priceUnit, tempKey: mappingKeys[k]?.costKey || getFirstScenarioCostKey(k) || "", tempForcedInputs: "" })} />
                  </div>

                  {(() => {
                    const presentIds = getPresentScenarioIds(k);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[k] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[k]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[k]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[k]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[k].increments[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[k].priceVar[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[k].priceFix[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[k]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(k, idx, e.target.checked)}
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
                                  const current = prev[k];
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [k]: { ...current, increments: nextIncs } };
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
                                  const current = prev[k];
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [k]: { ...current, priceVar: nextPrices } };
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
                              value={priceFixVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[k];
                                  const nextPrices = current.priceFix.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [k]: { ...current, priceFix: nextPrices } };
                                });
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

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = editorVariants[variant];
                const variantPath = `dpe.logement.enveloppe.${v.collection}.${v.itemKey}`;
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
    </Drawer>
  );
};


