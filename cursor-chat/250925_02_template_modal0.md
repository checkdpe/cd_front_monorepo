# Link new module and initialize values
_Exported on 25/09/2025 at 13:35:51 CEST from Cursor (1.5.5)_

---

**User**

in the left panel module/package, we need to link to a new module/package ; which will come into a modal
packages/template-editor
when opening that module/modal
need to init values from endpoint call 

curl 'https://api-dev.etiquettedpe.fr/backoffice/simulation_template?ref_ademe=2508E0243162W' \
  -H 'accept: */*' \
  -H 'accept-language: en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,la;q=0.6' \
  -H 'authorization: Bearer eyJraWQiOiJ4Q01ha3d1TElLbEh5b1pDTVpKMlZNeG5UazNUa2hUcEtZdXNtbmJXV1l3PSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIyMWU5ZDA5ZS02MDYxLTcwOWMtOWFmNS0wOGFiNjk1YTI5NzMiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuZXUtd2VzdC0zLmFtYXpvbmF3cy5jb21cL2V1LXdlc3QtM18yTmhtUWZQZzkiLCJjbGllbnRfaWQiOiIxazlsdnZsbmhzMzIwb2tjdHJrbGNrZWg1MCIsIm9yaWdpbl9qdGkiOiI1YTQ4MDZkYS1mYzRiLTQ1NWYtOGRmNC1lNDEzYjI2MDAyODEiLCJldmVudF9pZCI6IjAzOTViYzgzLWNlMTAtNDAzYy1hNmZhLWRhN2Y4YWNmZGRkNyIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW4iLCJhdXRoX3RpbWUiOjE3NTg1NDU2OTksImV4cCI6MTc1ODgwNTc3MSwiaWF0IjoxNzU4NzE5MzcxLCJqdGkiOiJkNzQwOGU4Zi01NzI5LTRmNmEtYjE5ZC05MDE4Y2U0NjkzNmMiLCJ1c2VybmFtZSI6Imdlcm1haW4uYmxhbmNoZXRAZ21haWwuY29tIn0.hZR372FUSONQGZKY8xQEU3QldYoNyQucwh8eFAcgix-ZslkJ1_CJsjUqY1XPI2NvL0SI3XO5aJ0dgESchssv-RC3OQNp1VUYS5ftPqZYTXKL9FmY-5BjsvJ5bAjXuPvvWEkEVVGIyi5nDzcAiQvv000Pfxsfsz2dz32O_PwS2ONE86N2EDXLq6NF-5plptvmDWb7uL_C0kJ1V8uPbDzOFwU-e3rZGrylzFKG0s4m7p9woaTq-yiN59-JfBRa2uuuOQquYtZMJ_6tUX9yz_wH9RdS5_5urV-Ng-yMfaP54mB8ptvG0_H2boAAsVZMJo-Iisk--D6aa4Vjsr8Ue-RH2g' \
  -H 'cache-control: no-cache' \
  -H 'origin: http://localhost:3000' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: http://localhost:3000/' \
  -H 'sec-ch-ua: "Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: cross-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

---

**Cursor**

I'll scan the codebase to find where the left panel is implemented, how modals are handled, and any existing references to templates or the simulation template endpoint. Then I'll create a new `packages/template-editor` and integrate it by adding an entry in the left panel that opens a modal and fetches initial data using the user's auth token.

I'll open the existing package configs to mirror structure for the new `packages/template-editor`, and scan `DpeDrawerEditor` to wire a button that opens the modal and passes `ref_ademe` and token retrieval. Then I'll create the new package files and integrate imports.

I'll check the workspace config to ensure new package `packages/template-editor` will be recognized and then scaffold the new package with a modal component that fetches the template on open. Then I'll add a button in `DpeDrawerEditor` to open this modal, passing `ref_ademe`, `baseUrl`, and `getAccessToken`.

I'll scaffold the new package with standard config, then implement `TemplateEditorModal` that loads on open using the provided token and renders minimal UI for now. Then I'll add an export entry and wire into the simulator left panel.

```json
{
  "name": "@acme/template-editor",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": [
    "src",
    "README.md"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "check": "tsc -b && eslint .",
    "test": "echo 'no tests'"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "antd": "^5.27.4"
  }
}


```

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}


```

```typescript
export { TemplateEditorModal } from "./templateEditorModal";
export type { TemplateEditorModalProps } from "./templateEditorModal";


```

```markdown
# @acme/template-editor

Modal component that loads simulation template data and renders a simple editor.


```

```typescriptreact
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
          <Input value={effectiveRef} onChange={(e) => setEffectiveRef(e.target.value)} placeholder="e.g. 2508E0243162W" />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button onClick={onCancel}>Close</Button>
          <Button type="primary" onClick={fetchTemplate} loading={loading}>Reload</Button>
        </div>
        {error ? <div style={{ color: "#b91c1c" }}>{error}</div> : null}
        <Input.TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoSize={{ minRows: 10 }}
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
        />
      </Space>
    </Modal>
  );
}


```

I'll add a dependency from the left panel package to the new modal package, then add a button in `DpeDrawerEditor` to open `TemplateEditorModal` with `ref_ademe`, `baseUrl`, and `getAccessToken`. Then I’ll run a lint check on the updated files.

```json
{
  "name": "@acme/dpe-editor",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": [
    "src",
    "README.md"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "check": "tsc -b && eslint .",
    "test": "echo 'no tests'"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "antd": "^5.27.4"
  },
  "dependencies": {
    "@acme/template-editor": "workspace:*"
  }
}



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
    })();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken, onLoadedFromApi]);

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
        onClose();
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
      onClose();
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
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
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
                        gridTemplateColumns: `80px repeat(3, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Increment</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.incrementUnit || "cm"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price var</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.priceUnit || "EUR/m2"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price fix</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.priceUnit || "EUR/m2"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceFix", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                  </div>

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
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceFix.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceFix: nextPrices } };
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
            <Button type="primary" onClick={applyEditorChanges}>OK</Button>
          </Space>
        </div>
        {PanelContent}
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
          <Button type="primary" onClick={applyEditorChanges}>OK</Button>
        </Space>
      }
    >
      {PanelContent}
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
    })();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken, onLoadedFromApi]);

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
        onClose();
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
      onClose();
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
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
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
                        gridTemplateColumns: `80px repeat(3, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Increment</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.incrementUnit || "cm"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price var</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.priceUnit || "EUR/m2"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price fix</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.priceUnit || "EUR/m2"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceFix", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                  </div>

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
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceFix.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceFix: nextPrices } };
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
            <Button type="primary" onClick={applyEditorChanges}>OK</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
          onLoaded={(data) => {
            try {
              setDetailsModal({ open: true, title: "Template raw", data });
            } catch {}
          }}
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
          <Button type="primary" onClick={applyEditorChanges}>OK</Button>
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
        onLoaded={(data) => {
          try {
            setDetailsModal({ open: true, title: "Template raw", data });
          } catch {}
        }}
      />
    </Drawer>
  );
};



```

I'll add a local type declaration for the new package import and fix the implicit any types, then re-run lints.

```typescript
declare module "@acme/template-editor" {
  import * as React from "react";
  export type TemplateEditorModalProps = {
    open: boolean;
    onCancel: () => void;
    baseUrl?: string;
    refAdeme?: string;
    getAccessToken: () => Promise<string | null>;
    onLoaded?: (data: unknown) => void;
  };
  export const TemplateEditorModal: React.FC<TemplateEditorModalProps>;
}


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
    })();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken, onLoadedFromApi]);

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
        onClose();
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
      onClose();
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
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
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
                        gridTemplateColumns: `80px repeat(3, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Increment</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.incrementUnit || "cm"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price var</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.priceUnit || "EUR/m2"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price fix</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.priceUnit || "EUR/m2"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceFix", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                  </div>

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
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceFix.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceFix: nextPrices } };
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
            <Button type="primary" onClick={applyEditorChanges}>OK</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
          onLoaded={(data: unknown) => {
            try {
              setDetailsModal({ open: true, title: "Template raw", data });
            } catch {}
          }}
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
          <Button type="primary" onClick={applyEditorChanges}>OK</Button>
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
        onLoaded={(data: unknown) => {
          try {
            setDetailsModal({ open: true, title: "Template raw", data });
          } catch {}
        }}
      />
    </Drawer>
  );
};



```

I created the new `packages/template-editor` package and integrated it in the left panel flow.

- Opened a new modal module `@acme/template-editor` that fetches initial data from the simulation_template endpoint on open using the Cognito token and optional `ref_ademe`.
- Added a button in `DpeDrawerEditor` to open this modal and pass `baseUrl`, `ref_ademe`, and `getAccessToken`.
- Wired the new package dependency in `@acme/dpe-editor` and added a local type stub to satisfy type resolution.
- Ran lints on the touched files; all clear.

How to use
- In the simulator, open the editor; there’s a new “Open template editor” button in the panel header area. It opens a modal, auto-fetches template runs using your current `ref_ademe` and token, and shows the JSON.

Summary of changes
- Added `packages/template-editor` with `TemplateEditorModal` (loads via GET `/backoffice/simulation_template?ref_ademe=...`).
- Updated `packages/dpe-editor/package.json` to depend on `@acme/template-editor`.
- Edited `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx` to:
  - Import and render `TemplateEditorModal`.
  - Add an “Open template editor” button.
  - Pass `apiLoadParams` and `getAccessToken` through to initialize values from the endpoint.
- Added local declaration `packages/dpe-editor/src/types/template-editor.d.ts`.

All tasks are complete.

---

**User**

i got this, need to do anything?



---

**Cursor**

I'll link the new workspace package so Vite can resolve it. I'll install workspace deps and build packages, then you can restart the dev server if it doesn't auto-pick up changes. Now running the workspace install and build.

I'll build the new package and the dependent one so Vite can resolve the workspace import, then you can refresh/restart the dev server if needed.

I’m going to fix the TypeScript errors in the new modal and install workspace deps for the new package, then rebuild both `@acme/template-editor` and the dependent `@acme/dpe-editor` so Vite can resolve the import.

```typescriptreact
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



```

- Built `@acme/template-editor` and `@acme/dpe-editor`, so Vite should now resolve `@acme/template-editor`.
- If the dev server was running, refresh the page; if it still shows the pre-transform error, restart the Vite dev server to pick up the new workspace package.

I'll check whether the workspace symlink for `@acme/template-editor` exists and, if missing, add it as a dependency in `@acme/dpe-editor` explicitly using pnpm to update the lockfile and links, then rebuild.

Let me link the new workspace dependency properly and ensure Vite can resolve it. I'll run a workspace install and verify the symlink exists under the dependent package, then restart the app dev server if needed.

Let me force a reinstall to ensure the new workspace package is linked and resolvable by Vite, and then verify the symlink.

I'll verify the root and package dependencies and symlinks so Vite can resolve @acme/template-editor from within @acme/dpe-editor. Then I'll install in the dpe-editor scope if needed and list node_modules structure.

I'll check how Vite is configured to resolve workspace packages and add an alias for `@acme/template-editor` if missing. Then I'll update the config and restart the dev server.

I'll add Vite aliases in `apps/simul/vite.config.ts` for `@acme/dpe-editor` and `@acme/template-editor` so the dev server can resolve these workspace packages. Then you’ll need to restart the dev server.

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "serve" ? "/" : "/simul/",
  publicDir: resolve(__dirname, "../../assets/images"),
  resolve: {
    alias: {
      "@acme/chainlit-client": resolve(__dirname, "../../packages/chainlit-client/src/index.ts"),
      "@acme/chainlit": resolve(__dirname, "../../packages/chainlit/src/index.ts"),
      "@acme/dpe-editor": resolve(__dirname, "../../packages/dpe-editor/src/index.ts"),
      "@acme/template-editor": resolve(__dirname, "../../packages/template-editor/src/index.ts"),
    },
  },
}));



```

Restart the simul dev server; Vite can now resolve `@acme/template-editor` via added aliases in `apps/simul/vite.config.ts`.

---

**User**

good.
i see 2 modals : one is template-raw, which we do not need

---

**Cursor**

I'll remove the unnecessary "Template raw" modal by deleting the onLoaded handler passed to `TemplateEditorModal` in `DpeDrawerEditor.tsx`. Then I'll rebuild if needed.

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
    })();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken, onLoadedFromApi]);

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
        onClose();
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
      onClose();
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
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
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
                        gridTemplateColumns: `80px repeat(3, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Increment</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.incrementUnit || "cm"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price var</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.priceUnit || "EUR/m2"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Price fix</span>
                    <span style={{ color: "#9ca3af" }}>({pricing[v.id]?.priceUnit || "EUR/m2"})</span>
                    <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceFix", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                  </div>

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
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceFix.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceFix: nextPrices } };
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
            <Button type="primary" onClick={applyEditorChanges}>OK</Button>
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
          <Button type="primary" onClick={applyEditorChanges}>OK</Button>
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

Removed the extra “Template raw” modal trigger from `DpeDrawerEditor.tsx`, keeping only the new template editor modal. Refresh the app; no rebuild is required beyond what Vite handles.

