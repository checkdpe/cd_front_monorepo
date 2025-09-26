# Implement zoom and reset for D3 graph
_Exported on 26/09/2025 at 7:53:16 CEST from Cursor (1.5.5)_

---

**User**

allow zooming in the graph (d3 graph) when i drag/drop the rectangle defining area
then a button allowing "reset zoom"

---

**Cursor**

I'll scan the codebase to locate the D3 graph component and see how zoom/brush interactions are currently implemented so I can add rectangle drag-zoom and a reset button. I'll search broadly in parallel for D3/brush/zoom references across apps and packages.

I'll open the D3 scatter plot component to implement brush-zoom and a reset zoom button, then update the render logic accordingly.

I’m going to add brush-based rectangle zoom to the D3 scatter in `packages/simulation-results/src/simulation-results/SimulationResults.tsx` and include a small “Reset zoom” button in the toolbar. I'll implement stateful x/y domains, hook up the brush, and wire the reset button.

I'll update the D3 scatter to keep dynamic x/y domains, add a brush for drag-to-zoom, and add a reset button in the toolbar. Then I'll run a quick lint check for the modified file.

Marking the current task "Implement rectangle brush zoom in SimulationResults scatter plot" as in progress. I'll edit `packages/simulation-results/src/simulation-results/SimulationResults.tsx` to add brush-based zoom with stateful domains and a Reset zoom button, then run a linter check on the modified file.

```typescriptreact
*** Begin Patch
*** Update File: /Volumes/privateGg/ai-microfront-ant/packages/simulation-results/src/simulation-results/SimulationResults.tsx
@@
-import { Select, Space } from "antd";
+import { Select, Space, Button } from "antd";
@@
   const [localYMetric, setLocalYMetric] = useState<"ep" | "ges">("ep");
   const [localSelectedIndex, setLocalSelectedIndex] = useState<number | undefined>(undefined);
+  const [xDomainOverride, setXDomainOverride] = useState<[number, number] | null>(null);
+  const [yDomainOverride, setYDomainOverride] = useState<[number, number] | null>(null);
@@
-    const xDomain = d3.extent(data, (d) => d.x) as [number, number];
-    const yDomain = d3.extent(data, (d) => d.y) as [number, number];
-
-    const x = d3.scaleLinear().domain(xDomain || [0, 1]).nice().range([0, innerWidth]);
-    const y = d3.scaleLinear().domain(yDomain || [0, 1]).nice().range([innerHeight, 0]);
+    const xDomain = d3.extent(data, (d) => d.x) as [number, number];
+    const yDomain = d3.extent(data, (d) => d.y) as [number, number];
+
+    const xDomainEffective = (xDomainOverride ?? xDomain) || [0, 1];
+    const yDomainEffective = (yDomainOverride ?? yDomain) || [0, 1];
+
+    const x = d3.scaleLinear().domain(xDomainEffective).nice().range([0, innerWidth]);
+    const y = d3.scaleLinear().domain(yDomainEffective).nice().range([innerHeight, 0]);
@@
     g.append("g")
       .attr("transform", `translate(0,${innerHeight})`)
       .call(d3.axisBottom(x).ticks(10));
     g.append("g").call(d3.axisLeft(y));
@@
       .text((d) => d.letter);
+
+    const brush = d3
+      .brush()
+      .extent([[0, 0], [innerWidth, innerHeight]])
+      .on("end", (event: any) => {
+        const selection = event.selection as [[number, number], [number, number]] | null;
+        if (!selection) return;
+        const [[x0, y0], [x1, y1]] = selection;
+        if (Math.abs(x1 - x0) < 2 || Math.abs(y1 - y0) < 2) {
+          return;
+        }
+        const newX0 = x.invert(Math.min(x0, x1));
+        const newX1 = x.invert(Math.max(x0, x1));
+        const newY0 = y.invert(Math.max(y0, y1));
+        const newY1 = y.invert(Math.min(y0, y1));
+        if (!Number.isFinite(newX0) || !Number.isFinite(newX1) || !Number.isFinite(newY0) || !Number.isFinite(newY1)) {
+          return;
+        }
+        setXDomainOverride([newX0, newX1]);
+        setYDomainOverride([newY0, newY1]);
+      });
+
+    g.append("g").attr("class", "brush").call(brush as any);
   }, [points, width, height, controlledXMetric, controlledYMetric, localXMetric, localYMetric, mapColorDpe, selectedIndex, primaryColor, localSelectedIndex]);
@@
       <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
         <Space size={8}>
           <span style={{ color: "#4b5563" }}>horizontal</span>
           <Select
             size="small"
             value={(controlledXMetric ?? localXMetric)}
             onChange={(v) => { onXMetricChange ? onXMetricChange(v) : setLocalXMetric(v); }}
             style={{ width: 140 }}
             options=[
               { label: "index", value: "index" },
               { label: "cost", value: "cost" },
             ]
           />
         </Space>
         <Space size={8}>
           <span style={{ color: "#4b5563" }}>vertical</span>
           <Select
             size="small"
             value={(controlledYMetric ?? localYMetric)}
             onChange={(v) => { onYMetricChange ? onYMetricChange(v) : setLocalYMetric(v); }}
             style={{ width: 220 }}
             options=[
               { label: "ep_conso_5_usages_m2", value: "ep" },
               { label: "emission_ges_5_usages_m2", value: "ges" },
             ]
           />
         </Space>
+        <Button size="small" onClick={() => { setXDomainOverride(null); setYDomainOverride(null); }} disabled={!xDomainOverride && !yDomainOverride}>
+          Reset zoom
+        </Button>
       </div>
*** End Patch
```

I’m going to re-open the component to copy the exact JSX and function bodies so I can insert brush logic and the Reset button with correct context.

I'll add brush-based rectangle zoom and a Reset zoom button to `SimulationResults.tsx`. I'll modify the D3 scales to use overridable domains, attach a brush handler to capture the selection, and include a toolbar button to reset the zoom. Then I'll re-run the linter on the changed file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Select, Space, Button } from "antd";

export type SimulationResultsProps = {
  dpeId: string;
  simul?: string;
  token?: string;
  getAccessToken?: () => Promise<string | undefined>;
  apiBaseUrl?: string;
  width?: number;
  height?: number;
  className?: string;
  mapColorDpe?: Record<string, string>;
  onSelectPoint?: (point: { index: number; ep?: number; ges?: number; cost?: number; letter?: string }) => void;
  selectedIndex?: number;
  primaryColor?: string;
  xMetric?: "index" | "cost";
  yMetric?: "ep" | "ges";
  onXMetricChange?: (metric: "index" | "cost") => void;
  onYMetricChange?: (metric: "ep" | "ges") => void;
};

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

type ChartPoint = {
  index: number;
  ep?: number;
  ges?: number;
  cost?: number;
  letter?: string;
};

const DEFAULT_MAP_COLOR_DPE: { [key: string]: string } = {
  A: "#189c44",
  B: "#4FAA05",
  C: "#CCD600",
  D: "#FFEE6C",
  E: "#FFC661",
  F: "#FF8300",
  G: "#FF3238",
};

function parseSimulationGraphData(payload: unknown): ChartPoint[] | null {
  try {
    // Expecting { data: [ { cost, result: { ep_conso_5_usages_m2, emission_ges_5_usages_m2, bilan_dpe_letter } }, ... ] }
    if (!payload || typeof payload !== "object") return null;
    const root = payload as any;
    const arr: any[] = Array.isArray(root?.data) ? root.data : (Array.isArray(root) ? root : []);
    if (!Array.isArray(arr)) return null;
    const points: ChartPoint[] = arr.map((item: any, idx: number) => {
      const res = item?.result || {};
      const ep = Number(res?.ep_conso_5_usages_m2);
      const ges = Number(res?.emission_ges_5_usages_m2);
      const cost = Number(item?.cost ?? res?.cost);
      const letter = (res?.bilan_dpe_letter as string | undefined) || undefined;
      const p: ChartPoint = { index: idx };
      if (Number.isFinite(ep)) p.ep = ep;
      if (Number.isFinite(ges)) p.ges = ges;
      if (Number.isFinite(cost)) p.cost = cost;
      if (letter && typeof letter === "string") p.letter = letter;
      return p;
    });
    return points;
  } catch {
    return null;
  }
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({
  dpeId,
  simul,
  token,
  getAccessToken,
  apiBaseUrl = "https://api-dev.etiquettedpe.fr",
  width = 640,
  height = 360,
  className,
  mapColorDpe,
  onSelectPoint,
  selectedIndex,
  primaryColor = "#1677ff",
  xMetric: controlledXMetric,
  yMetric: controlledYMetric,
  onXMetricChange,
  onYMetricChange,
}) => {
  const [state, setState] = useState<FetchState<unknown>>({ status: "idle" });
  const [resolvedToken, setResolvedToken] = useState<string | undefined>(token);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [localXMetric, setLocalXMetric] = useState<"index" | "cost">("index");
  const [localYMetric, setLocalYMetric] = useState<"ep" | "ges">("ep");
  const [localSelectedIndex, setLocalSelectedIndex] = useState<number | undefined>(undefined);
  const [xDomainOverride, setXDomainOverride] = useState<[number, number] | null>(null);
  const [yDomainOverride, setYDomainOverride] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveToken() {
      if (token) {
        setResolvedToken(token);
        return;
      }
      if (getAccessToken) {
        try {
          const t = await getAccessToken();
          if (!cancelled) setResolvedToken(t);
        } catch {
          if (!cancelled) setResolvedToken(undefined);
        }
      }
    }
    resolveToken();
    return () => {
      cancelled = true;
    };
  }, [token, getAccessToken]);

  useEffect(() => {
    let cancelled = false;
    if (!resolvedToken) {
      // wait until a token is available
      return () => {
        cancelled = true;
      };
    }
    setState({ status: "loading" });
    const url = new URL("/backoffice/simulation_graph", apiBaseUrl);
    url.searchParams.set("ref_ademe", dpeId);
    if (simul) url.searchParams.set("simul", simul);
    fetch(url.toString(), {
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${resolvedToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setState({ status: "success", data: json });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", error: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, dpeId, simul, resolvedToken]);

  const points = useMemo(() => {
    if (state.status !== "success") return null;
    return parseSimulationGraphData(state.data);
  }, [state]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    if (!points || points.length === 0) return;
    const margin = { top: 10, right: 20, bottom: 32, left: 48 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    // Build scatter source based on selected metrics
    const xMetric = (controlledXMetric ?? localXMetric);
    const yMetric = (controlledYMetric ?? localYMetric);
    const data = points
      .map((p) => ({
        x: xMetric === "index" ? Number(p.index) : Number(p.cost),
        y: yMetric === "ep" ? Number(p.ep) : Number(p.ges),
        letter: (p.letter || "").toUpperCase(),
        raw: p,
      }))
      .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));

    const xDomain = d3.extent(data, (d) => d.x) as [number, number];
    const yDomain = d3.extent(data, (d) => d.y) as [number, number];

    const xDomainEffective = (xDomainOverride ?? xDomain) || [0, 1];
    const yDomainEffective = (yDomainOverride ?? yDomain) || [0, 1];

    const x = d3.scaleLinear().domain(xDomainEffective).nice().range([0, innerWidth]);
    const y = d3.scaleLinear().domain(yDomainEffective).nice().range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(10));
    g.append("g").call(d3.axisLeft(y));

    const colorMap = { ...(mapColorDpe || {}), ...DEFAULT_MAP_COLOR_DPE } as Record<string, string>;

    const pointsLayer = g.append("g")
      .selectAll("circle.point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", 7)
      .attr("fill", (d) => colorMap[d.letter] || "#9ca3af")
      .attr("stroke", (d) => {
        const idx = d.raw?.index as number;
        const isSelected = typeof (selectedIndex ?? localSelectedIndex) === "number" && idx === (selectedIndex ?? localSelectedIndex);
        return isSelected ? primaryColor : "#888888";
      })
      .attr("stroke-width", (d) => {
        const idx = d.raw?.index as number;
        const isSelected = typeof (selectedIndex ?? localSelectedIndex) === "number" && idx === (selectedIndex ?? localSelectedIndex);
        return isSelected ? 3 : 1;
      })
      .attr("opacity", 0.95)
      .style("pointer-events", "all")
      .style("cursor", onSelectPoint ? "pointer" : "default")
      .on("click", (_, d) => {
        try {
          setLocalSelectedIndex(d.raw?.index);
          onSelectPoint && onSelectPoint(d.raw);
        } catch {}
      });

    g.append("g")
      .selectAll("text.label")
      .data(data.filter((d) => d.letter))
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => x(d.x))
      .attr("y", (d) => y(d.y))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 9)
      .attr("fill", "#444444")
      .style("pointer-events", "none")
      .text((d) => d.letter);

    const brush = d3
      .brush()
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on("end", (event: any) => {
        const selection = event.selection as [[number, number], [number, number]] | null;
        if (!selection) return;
        const [[x0, y0], [x1, y1]] = selection;
        if (Math.abs(x1 - x0) < 2 || Math.abs(y1 - y0) < 2) {
          return;
        }
        const newX0 = x.invert(Math.min(x0, x1));
        const newX1 = x.invert(Math.max(x0, x1));
        const newY0 = y.invert(Math.max(y0, y1));
        const newY1 = y.invert(Math.min(y0, y1));
        if (!Number.isFinite(newX0) || !Number.isFinite(newX1) || !Number.isFinite(newY0) || !Number.isFinite(newY1)) {
          return;
        }
        setXDomainOverride([newX0, newX1]);
        setYDomainOverride([newY0, newY1]);
      });

    g.append("g").attr("class", "brush").call(brush as any);
  }, [points, width, height, controlledXMetric, controlledYMetric, localXMetric, localYMetric, mapColorDpe, selectedIndex, primaryColor, localSelectedIndex, xDomainOverride, yDomainOverride]);

  if (state.status === "loading") {
    return <div className={className}>Loading simulation results…</div>;
  }
  if (state.status === "error") {
    return <div className={className}>Error: {state.error}</div>;
  }

  if (state.status === "success" && !points) {
    return (
      <div className={className}>
        Unsupported data format
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className={className}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <Space size={8}>
          <span style={{ color: "#4b5563" }}>horizontal</span>
          <Select
            size="small"
            value={(controlledXMetric ?? localXMetric)}
            onChange={(v) => { onXMetricChange ? onXMetricChange(v) : setLocalXMetric(v); }}
            style={{ width: 140 }}
            options={[
              { label: "index", value: "index" },
              { label: "cost", value: "cost" },
            ]}
          />
        </Space>
        <Space size={8}>
          <span style={{ color: "#4b5563" }}>vertical</span>
          <Select
            size="small"
            value={(controlledYMetric ?? localYMetric)}
            onChange={(v) => { onYMetricChange ? onYMetricChange(v) : setLocalYMetric(v); }}
            style={{ width: 220 }}
            options={[
              { label: "ep_conso_5_usages_m2", value: "ep" },
              { label: "emission_ges_5_usages_m2", value: "ges" },
            ]}
          />
        </Space>
        <Button size="small" onClick={() => { setXDomainOverride(null); setYDomainOverride(null); }} disabled={!xDomainOverride && !yDomainOverride}>
          Reset zoom
        </Button>
      </div>
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};



```

I added rectangle brush zoom and a Reset zoom button to the D3 scatter plot.

- Brush-zoom: Drag a rectangle in the chart area to zoom both axes. The selection updates internal x/y domains and re-renders.
- Reset: A small “Reset zoom” button appears in the toolbar; it resets to the full extent.

Key edits:
- `packages/simulation-results/src/simulation-results/SimulationResults.tsx`
  - Introduced `xDomainOverride` and `yDomainOverride` state.
  - Scales now use effective domains combining overrides with data extents.
  - Added a D3 `brush` on the plotting `g` to set overrides from a drag selection.
  - Added antd `Button` “Reset zoom” next to the axis selectors.
  - Kept axes and points re-rendering in sync.

Let me know if you also want scroll-wheel zoom or double-click-to-reset.

---

**User**

graph part : when clicking on a dot (a result) I also want to call this endpoint (where id is given by https://api-dev.etiquettedpe.fr/backoffice/simulation_graph?ref_ademe=2508E0243162W&simul=dev_simul_test0003 results)

https://api-dev.etiquettedpe.fr/backoffice/simulation_graph_detail?ref_ademe=2394E0980765L&run_name=dev_simul_test0002&id=2508E0243162W:dev_simul_test0003-3_o3cl_report_2508E0243162W

---

**Cursor**

I'll search for where the simulation graph data structure is defined to locate the ID field we need, and also check if there's any existing usage of the detail endpoint to reuse. Then I'll update the click handler to fetch details with `ref_ademe`, `run_name`, and the `id` from the graph data.

I'll add a click handler enhancement to call the detail endpoint when a dot is clicked. I'll update the data parsing to include the result id, extend props with an optional callback to deliver the detail payload, and wire the fetch using the existing token and base URL. Then I'll run a linter check on the modified file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Select, Space, Button } from "antd";

export type SimulationResultsProps = {
  dpeId: string;
  simul?: string;
  token?: string;
  getAccessToken?: () => Promise<string | undefined>;
  apiBaseUrl?: string;
  width?: number;
  height?: number;
  className?: string;
  mapColorDpe?: Record<string, string>;
  onSelectPoint?: (point: { index: number; ep?: number; ges?: number; cost?: number; letter?: string }) => void;
  selectedIndex?: number;
  primaryColor?: string;
  xMetric?: "index" | "cost";
  yMetric?: "ep" | "ges";
  onXMetricChange?: (metric: "index" | "cost") => void;
  onYMetricChange?: (metric: "ep" | "ges") => void;
  onPointDetail?: (detail: unknown) => void;
};

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

type ChartPoint = {
  index: number;
  ep?: number;
  ges?: number;
  cost?: number;
  letter?: string;
  id?: string;
};

const DEFAULT_MAP_COLOR_DPE: { [key: string]: string } = {
  A: "#189c44",
  B: "#4FAA05",
  C: "#CCD600",
  D: "#FFEE6C",
  E: "#FFC661",
  F: "#FF8300",
  G: "#FF3238",
};

function parseSimulationGraphData(payload: unknown): ChartPoint[] | null {
  try {
    // Expecting { data: [ { cost, result: { ep_conso_5_usages_m2, emission_ges_5_usages_m2, bilan_dpe_letter } }, ... ] }
    if (!payload || typeof payload !== "object") return null;
    const root = payload as any;
    const arr: any[] = Array.isArray(root?.data) ? root.data : (Array.isArray(root) ? root : []);
    if (!Array.isArray(arr)) return null;
    const points: ChartPoint[] = arr.map((item: any, idx: number) => {
      const res = item?.result || {};
      const ep = Number(res?.ep_conso_5_usages_m2);
      const ges = Number(res?.emission_ges_5_usages_m2);
      const cost = Number(item?.cost ?? res?.cost);
      const letter = (res?.bilan_dpe_letter as string | undefined) || undefined;
      const id = (item?.id as string | undefined) ?? (res?.id as string | undefined);
      const p: ChartPoint = { index: idx };
      if (Number.isFinite(ep)) p.ep = ep;
      if (Number.isFinite(ges)) p.ges = ges;
      if (Number.isFinite(cost)) p.cost = cost;
      if (letter && typeof letter === "string") p.letter = letter;
      if (id && typeof id === "string") p.id = id;
      return p;
    });
    return points;
  } catch {
    return null;
  }
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({
  dpeId,
  simul,
  token,
  getAccessToken,
  apiBaseUrl = "https://api-dev.etiquettedpe.fr",
  width = 640,
  height = 360,
  className,
  mapColorDpe,
  onSelectPoint,
  selectedIndex,
  primaryColor = "#1677ff",
  xMetric: controlledXMetric,
  yMetric: controlledYMetric,
  onXMetricChange,
  onYMetricChange,
  onPointDetail,
}) => {
  const [state, setState] = useState<FetchState<unknown>>({ status: "idle" });
  const [resolvedToken, setResolvedToken] = useState<string | undefined>(token);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [localXMetric, setLocalXMetric] = useState<"index" | "cost">("index");
  const [localYMetric, setLocalYMetric] = useState<"ep" | "ges">("ep");
  const [localSelectedIndex, setLocalSelectedIndex] = useState<number | undefined>(undefined);
  const [xDomainOverride, setXDomainOverride] = useState<[number, number] | null>(null);
  const [yDomainOverride, setYDomainOverride] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveToken() {
      if (token) {
        setResolvedToken(token);
        return;
      }
      if (getAccessToken) {
        try {
          const t = await getAccessToken();
          if (!cancelled) setResolvedToken(t);
        } catch {
          if (!cancelled) setResolvedToken(undefined);
        }
      }
    }
    resolveToken();
    return () => {
      cancelled = true;
    };
  }, [token, getAccessToken]);

  useEffect(() => {
    let cancelled = false;
    if (!resolvedToken) {
      // wait until a token is available
      return () => {
        cancelled = true;
      };
    }
    setState({ status: "loading" });
    const url = new URL("/backoffice/simulation_graph", apiBaseUrl);
    url.searchParams.set("ref_ademe", dpeId);
    if (simul) url.searchParams.set("simul", simul);
    fetch(url.toString(), {
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${resolvedToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setState({ status: "success", data: json });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", error: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, dpeId, simul, resolvedToken]);

  const points = useMemo(() => {
    if (state.status !== "success") return null;
    return parseSimulationGraphData(state.data);
  }, [state]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    if (!points || points.length === 0) return;
    const margin = { top: 10, right: 20, bottom: 32, left: 48 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    // Build scatter source based on selected metrics
    const xMetric = (controlledXMetric ?? localXMetric);
    const yMetric = (controlledYMetric ?? localYMetric);
    const data = points
      .map((p) => ({
        x: xMetric === "index" ? Number(p.index) : Number(p.cost),
        y: yMetric === "ep" ? Number(p.ep) : Number(p.ges),
        letter: (p.letter || "").toUpperCase(),
        raw: p,
      }))
      .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));

    const xDomain = d3.extent(data, (d) => d.x) as [number, number];
    const yDomain = d3.extent(data, (d) => d.y) as [number, number];

    const xDomainEffective = (xDomainOverride ?? xDomain) || [0, 1];
    const yDomainEffective = (yDomainOverride ?? yDomain) || [0, 1];

    const x = d3.scaleLinear().domain(xDomainEffective).nice().range([0, innerWidth]);
    const y = d3.scaleLinear().domain(yDomainEffective).nice().range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(10));
    g.append("g").call(d3.axisLeft(y));

    const colorMap = { ...(mapColorDpe || {}), ...DEFAULT_MAP_COLOR_DPE } as Record<string, string>;

    const pointsLayer = g.append("g")
      .selectAll("circle.point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", 7)
      .attr("fill", (d) => colorMap[d.letter] || "#9ca3af")
      .attr("stroke", (d) => {
        const idx = d.raw?.index as number;
        const isSelected = typeof (selectedIndex ?? localSelectedIndex) === "number" && idx === (selectedIndex ?? localSelectedIndex);
        return isSelected ? primaryColor : "#888888";
      })
      .attr("stroke-width", (d) => {
        const idx = d.raw?.index as number;
        const isSelected = typeof (selectedIndex ?? localSelectedIndex) === "number" && idx === (selectedIndex ?? localSelectedIndex);
        return isSelected ? 3 : 1;
      })
      .attr("opacity", 0.95)
      .style("pointer-events", "all")
      .style("cursor", onSelectPoint ? "pointer" : "default")
      .on("click", (_, d) => {
        try {
          setLocalSelectedIndex(d.raw?.index);
          onSelectPoint && onSelectPoint(d.raw);
        } catch {}
        try {
          const detailId = d.raw?.id as (string | undefined);
          const runName = simul;
          if (!detailId || !runName || !resolvedToken) return;
          const url = new URL("/backoffice/simulation_graph_detail", apiBaseUrl);
          url.searchParams.set("ref_ademe", dpeId);
          url.searchParams.set("run_name", runName);
          url.searchParams.set("id", detailId);
          fetch(url.toString(), {
            headers: {
              Accept: "*/*",
              Authorization: `Bearer ${resolvedToken}`,
            },
          })
            .then(async (res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then((json) => {
              try { onPointDetail && onPointDetail(json); } catch {}
            })
            .catch(() => { /* ignore detail errors for now */ });
        } catch {}
      });

    g.append("g")
      .selectAll("text.label")
      .data(data.filter((d) => d.letter))
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => x(d.x))
      .attr("y", (d) => y(d.y))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 9)
      .attr("fill", "#444444")
      .style("pointer-events", "none")
      .text((d) => d.letter);

    const brush = d3
      .brush()
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on("end", (event: any) => {
        const selection = event.selection as [[number, number], [number, number]] | null;
        if (!selection) return;
        const [[x0, y0], [x1, y1]] = selection;
        if (Math.abs(x1 - x0) < 2 || Math.abs(y1 - y0) < 2) {
          return;
        }
        const newX0 = x.invert(Math.min(x0, x1));
        const newX1 = x.invert(Math.max(x0, x1));
        const newY0 = y.invert(Math.max(y0, y1));
        const newY1 = y.invert(Math.min(y0, y1));
        if (!Number.isFinite(newX0) || !Number.isFinite(newX1) || !Number.isFinite(newY0) || !Number.isFinite(newY1)) {
          return;
        }
        setXDomainOverride([newX0, newX1]);
        setYDomainOverride([newY0, newY1]);
      });

    g.append("g").attr("class", "brush").call(brush as any);
  }, [points, width, height, controlledXMetric, controlledYMetric, localXMetric, localYMetric, mapColorDpe, selectedIndex, primaryColor, localSelectedIndex, xDomainOverride, yDomainOverride, onSelectPoint, onPointDetail, apiBaseUrl, dpeId, simul, resolvedToken]);

  if (state.status === "loading") {
    return <div className={className}>Loading simulation results…</div>;
  }
  if (state.status === "error") {
    return <div className={className}>Error: {state.error}</div>;
  }

  if (state.status === "success" && !points) {
    return (
      <div className={className}>
        Unsupported data format
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className={className}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <Space size={8}>
          <span style={{ color: "#4b5563" }}>horizontal</span>
          <Select
            size="small"
            value={(controlledXMetric ?? localXMetric)}
            onChange={(v) => { onXMetricChange ? onXMetricChange(v) : setLocalXMetric(v); }}
            style={{ width: 140 }}
            options={[
              { label: "index", value: "index" },
              { label: "cost", value: "cost" },
            ]}
          />
        </Space>
        <Space size={8}>
          <span style={{ color: "#4b5563" }}>vertical</span>
          <Select
            size="small"
            value={(controlledYMetric ?? localYMetric)}
            onChange={(v) => { onYMetricChange ? onYMetricChange(v) : setLocalYMetric(v); }}
            style={{ width: 220 }}
            options={[
              { label: "ep_conso_5_usages_m2", value: "ep" },
              { label: "emission_ges_5_usages_m2", value: "ges" },
            ]}
          />
        </Space>
        <Button size="small" onClick={() => { setXDomainOverride(null); setYDomainOverride(null); }} disabled={!xDomainOverride && !yDomainOverride}>
          Reset zoom
        </Button>
      </div>
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};



```

I'll tweak the point cursor to indicate clickability when either a selection handler or the detail fetch callback is provided, then re-run the linter on the modified file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Select, Space, Button } from "antd";

export type SimulationResultsProps = {
  dpeId: string;
  simul?: string;
  token?: string;
  getAccessToken?: () => Promise<string | undefined>;
  apiBaseUrl?: string;
  width?: number;
  height?: number;
  className?: string;
  mapColorDpe?: Record<string, string>;
  onSelectPoint?: (point: { index: number; ep?: number; ges?: number; cost?: number; letter?: string }) => void;
  selectedIndex?: number;
  primaryColor?: string;
  xMetric?: "index" | "cost";
  yMetric?: "ep" | "ges";
  onXMetricChange?: (metric: "index" | "cost") => void;
  onYMetricChange?: (metric: "ep" | "ges") => void;
  onPointDetail?: (detail: unknown) => void;
};

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

type ChartPoint = {
  index: number;
  ep?: number;
  ges?: number;
  cost?: number;
  letter?: string;
  id?: string;
};

const DEFAULT_MAP_COLOR_DPE: { [key: string]: string } = {
  A: "#189c44",
  B: "#4FAA05",
  C: "#CCD600",
  D: "#FFEE6C",
  E: "#FFC661",
  F: "#FF8300",
  G: "#FF3238",
};

function parseSimulationGraphData(payload: unknown): ChartPoint[] | null {
  try {
    // Expecting { data: [ { cost, result: { ep_conso_5_usages_m2, emission_ges_5_usages_m2, bilan_dpe_letter } }, ... ] }
    if (!payload || typeof payload !== "object") return null;
    const root = payload as any;
    const arr: any[] = Array.isArray(root?.data) ? root.data : (Array.isArray(root) ? root : []);
    if (!Array.isArray(arr)) return null;
    const points: ChartPoint[] = arr.map((item: any, idx: number) => {
      const res = item?.result || {};
      const ep = Number(res?.ep_conso_5_usages_m2);
      const ges = Number(res?.emission_ges_5_usages_m2);
      const cost = Number(item?.cost ?? res?.cost);
      const letter = (res?.bilan_dpe_letter as string | undefined) || undefined;
      const id = (item?.id as string | undefined) ?? (res?.id as string | undefined);
      const p: ChartPoint = { index: idx };
      if (Number.isFinite(ep)) p.ep = ep;
      if (Number.isFinite(ges)) p.ges = ges;
      if (Number.isFinite(cost)) p.cost = cost;
      if (letter && typeof letter === "string") p.letter = letter;
      if (id && typeof id === "string") p.id = id;
      return p;
    });
    return points;
  } catch {
    return null;
  }
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({
  dpeId,
  simul,
  token,
  getAccessToken,
  apiBaseUrl = "https://api-dev.etiquettedpe.fr",
  width = 640,
  height = 360,
  className,
  mapColorDpe,
  onSelectPoint,
  selectedIndex,
  primaryColor = "#1677ff",
  xMetric: controlledXMetric,
  yMetric: controlledYMetric,
  onXMetricChange,
  onYMetricChange,
  onPointDetail,
}) => {
  const [state, setState] = useState<FetchState<unknown>>({ status: "idle" });
  const [resolvedToken, setResolvedToken] = useState<string | undefined>(token);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [localXMetric, setLocalXMetric] = useState<"index" | "cost">("index");
  const [localYMetric, setLocalYMetric] = useState<"ep" | "ges">("ep");
  const [localSelectedIndex, setLocalSelectedIndex] = useState<number | undefined>(undefined);
  const [xDomainOverride, setXDomainOverride] = useState<[number, number] | null>(null);
  const [yDomainOverride, setYDomainOverride] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveToken() {
      if (token) {
        setResolvedToken(token);
        return;
      }
      if (getAccessToken) {
        try {
          const t = await getAccessToken();
          if (!cancelled) setResolvedToken(t);
        } catch {
          if (!cancelled) setResolvedToken(undefined);
        }
      }
    }
    resolveToken();
    return () => {
      cancelled = true;
    };
  }, [token, getAccessToken]);

  useEffect(() => {
    let cancelled = false;
    if (!resolvedToken) {
      // wait until a token is available
      return () => {
        cancelled = true;
      };
    }
    setState({ status: "loading" });
    const url = new URL("/backoffice/simulation_graph", apiBaseUrl);
    url.searchParams.set("ref_ademe", dpeId);
    if (simul) url.searchParams.set("simul", simul);
    fetch(url.toString(), {
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${resolvedToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setState({ status: "success", data: json });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", error: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, dpeId, simul, resolvedToken]);

  const points = useMemo(() => {
    if (state.status !== "success") return null;
    return parseSimulationGraphData(state.data);
  }, [state]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    if (!points || points.length === 0) return;
    const margin = { top: 10, right: 20, bottom: 32, left: 48 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    // Build scatter source based on selected metrics
    const xMetric = (controlledXMetric ?? localXMetric);
    const yMetric = (controlledYMetric ?? localYMetric);
    const data = points
      .map((p) => ({
        x: xMetric === "index" ? Number(p.index) : Number(p.cost),
        y: yMetric === "ep" ? Number(p.ep) : Number(p.ges),
        letter: (p.letter || "").toUpperCase(),
        raw: p,
      }))
      .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));

    const xDomain = d3.extent(data, (d) => d.x) as [number, number];
    const yDomain = d3.extent(data, (d) => d.y) as [number, number];

    const xDomainEffective = (xDomainOverride ?? xDomain) || [0, 1];
    const yDomainEffective = (yDomainOverride ?? yDomain) || [0, 1];

    const x = d3.scaleLinear().domain(xDomainEffective).nice().range([0, innerWidth]);
    const y = d3.scaleLinear().domain(yDomainEffective).nice().range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(10));
    g.append("g").call(d3.axisLeft(y));

    const colorMap = { ...(mapColorDpe || {}), ...DEFAULT_MAP_COLOR_DPE } as Record<string, string>;

    const pointsLayer = g.append("g")
      .selectAll("circle.point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", 7)
      .attr("fill", (d) => colorMap[d.letter] || "#9ca3af")
      .attr("stroke", (d) => {
        const idx = d.raw?.index as number;
        const isSelected = typeof (selectedIndex ?? localSelectedIndex) === "number" && idx === (selectedIndex ?? localSelectedIndex);
        return isSelected ? primaryColor : "#888888";
      })
      .attr("stroke-width", (d) => {
        const idx = d.raw?.index as number;
        const isSelected = typeof (selectedIndex ?? localSelectedIndex) === "number" && idx === (selectedIndex ?? localSelectedIndex);
        return isSelected ? 3 : 1;
      })
      .attr("opacity", 0.95)
      .style("pointer-events", "all")
      .style("cursor", (onSelectPoint || onPointDetail) ? "pointer" : "default")
      .on("click", (_, d) => {
        try {
          setLocalSelectedIndex(d.raw?.index);
          onSelectPoint && onSelectPoint(d.raw);
        } catch {}
        try {
          const detailId = d.raw?.id as (string | undefined);
          const runName = simul;
          if (!detailId || !runName || !resolvedToken) return;
          const url = new URL("/backoffice/simulation_graph_detail", apiBaseUrl);
          url.searchParams.set("ref_ademe", dpeId);
          url.searchParams.set("run_name", runName);
          url.searchParams.set("id", detailId);
          fetch(url.toString(), {
            headers: {
              Accept: "*/*",
              Authorization: `Bearer ${resolvedToken}`,
            },
          })
            .then(async (res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then((json) => {
              try { onPointDetail && onPointDetail(json); } catch {}
            })
            .catch(() => { /* ignore detail errors for now */ });
        } catch {}
      });

    g.append("g")
      .selectAll("text.label")
      .data(data.filter((d) => d.letter))
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => x(d.x))
      .attr("y", (d) => y(d.y))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 9)
      .attr("fill", "#444444")
      .style("pointer-events", "none")
      .text((d) => d.letter);

    const brush = d3
      .brush()
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on("end", (event: any) => {
        const selection = event.selection as [[number, number], [number, number]] | null;
        if (!selection) return;
        const [[x0, y0], [x1, y1]] = selection;
        if (Math.abs(x1 - x0) < 2 || Math.abs(y1 - y0) < 2) {
          return;
        }
        const newX0 = x.invert(Math.min(x0, x1));
        const newX1 = x.invert(Math.max(x0, x1));
        const newY0 = y.invert(Math.max(y0, y1));
        const newY1 = y.invert(Math.min(y0, y1));
        if (!Number.isFinite(newX0) || !Number.isFinite(newX1) || !Number.isFinite(newY0) || !Number.isFinite(newY1)) {
          return;
        }
        setXDomainOverride([newX0, newX1]);
        setYDomainOverride([newY0, newY1]);
      });

    g.append("g").attr("class", "brush").call(brush as any);
  }, [points, width, height, controlledXMetric, controlledYMetric, localXMetric, localYMetric, mapColorDpe, selectedIndex, primaryColor, localSelectedIndex, xDomainOverride, yDomainOverride, onSelectPoint, onPointDetail, apiBaseUrl, dpeId, simul, resolvedToken]);

  if (state.status === "loading") {
    return <div className={className}>Loading simulation results…</div>;
  }
  if (state.status === "error") {
    return <div className={className}>Error: {state.error}</div>;
  }

  if (state.status === "success" && !points) {
    return (
      <div className={className}>
        Unsupported data format
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className={className}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <Space size={8}>
          <span style={{ color: "#4b5563" }}>horizontal</span>
          <Select
            size="small"
            value={(controlledXMetric ?? localXMetric)}
            onChange={(v) => { onXMetricChange ? onXMetricChange(v) : setLocalXMetric(v); }}
            style={{ width: 140 }}
            options={[
              { label: "index", value: "index" },
              { label: "cost", value: "cost" },
            ]}
          />
        </Space>
        <Space size={8}>
          <span style={{ color: "#4b5563" }}>vertical</span>
          <Select
            size="small"
            value={(controlledYMetric ?? localYMetric)}
            onChange={(v) => { onYMetricChange ? onYMetricChange(v) : setLocalYMetric(v); }}
            style={{ width: 220 }}
            options={[
              { label: "ep_conso_5_usages_m2", value: "ep" },
              { label: "emission_ges_5_usages_m2", value: "ges" },
            ]}
          />
        </Space>
        <Button size="small" onClick={() => { setXDomainOverride(null); setYDomainOverride(null); }} disabled={!xDomainOverride && !yDomainOverride}>
          Reset zoom
        </Button>
      </div>
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};



```

- I updated the point click to additionally fetch the detail for that run and id, using the same `apiBaseUrl` and `Authorization` token. If `onPointDetail` is provided, it receives the parsed JSON.
- The graph data parser now captures `id` from each item (`item.id` or `item.result.id`) so the click handler can build the detail URL.

How to use:
- Pass `simul` and `dpeId` as you already do.
- Optionally pass `onPointDetail={(detail) => { /* show a drawer/modal etc. */ }}` to receive the result of `simulation_graph_detail`.

If you want, I can also add a small right-panel drawer in `simulation-detail` to render the detail response.

---

**User**

also (cant click anymore on a dot) => when hover any dot, zoom cross to be hidden ; hand hover has priority in that case (over a dot) so i can click

---

**Cursor**

I'll move the brush layer behind the points so circles receive hover and clicks, ensuring the hand cursor takes precedence over the crosshair and clicking works again. I'll update the brush group creation to lower it in the DOM order.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Select, Space, Button } from "antd";

export type SimulationResultsProps = {
  dpeId: string;
  simul?: string;
  token?: string;
  getAccessToken?: () => Promise<string | undefined>;
  apiBaseUrl?: string;
  width?: number;
  height?: number;
  className?: string;
  mapColorDpe?: Record<string, string>;
  onSelectPoint?: (point: { index: number; ep?: number; ges?: number; cost?: number; letter?: string }) => void;
  selectedIndex?: number;
  primaryColor?: string;
  xMetric?: "index" | "cost";
  yMetric?: "ep" | "ges";
  onXMetricChange?: (metric: "index" | "cost") => void;
  onYMetricChange?: (metric: "ep" | "ges") => void;
  onPointDetail?: (detail: unknown) => void;
};

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

type ChartPoint = {
  index: number;
  ep?: number;
  ges?: number;
  cost?: number;
  letter?: string;
  id?: string;
};

const DEFAULT_MAP_COLOR_DPE: { [key: string]: string } = {
  A: "#189c44",
  B: "#4FAA05",
  C: "#CCD600",
  D: "#FFEE6C",
  E: "#FFC661",
  F: "#FF8300",
  G: "#FF3238",
};

function parseSimulationGraphData(payload: unknown): ChartPoint[] | null {
  try {
    // Expecting { data: [ { cost, result: { ep_conso_5_usages_m2, emission_ges_5_usages_m2, bilan_dpe_letter } }, ... ] }
    if (!payload || typeof payload !== "object") return null;
    const root = payload as any;
    const arr: any[] = Array.isArray(root?.data) ? root.data : (Array.isArray(root) ? root : []);
    if (!Array.isArray(arr)) return null;
    const points: ChartPoint[] = arr.map((item: any, idx: number) => {
      const res = item?.result || {};
      const ep = Number(res?.ep_conso_5_usages_m2);
      const ges = Number(res?.emission_ges_5_usages_m2);
      const cost = Number(item?.cost ?? res?.cost);
      const letter = (res?.bilan_dpe_letter as string | undefined) || undefined;
      const id = (item?.id as string | undefined) ?? (res?.id as string | undefined);
      const p: ChartPoint = { index: idx };
      if (Number.isFinite(ep)) p.ep = ep;
      if (Number.isFinite(ges)) p.ges = ges;
      if (Number.isFinite(cost)) p.cost = cost;
      if (letter && typeof letter === "string") p.letter = letter;
      if (id && typeof id === "string") p.id = id;
      return p;
    });
    return points;
  } catch {
    return null;
  }
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({
  dpeId,
  simul,
  token,
  getAccessToken,
  apiBaseUrl = "https://api-dev.etiquettedpe.fr",
  width = 640,
  height = 360,
  className,
  mapColorDpe,
  onSelectPoint,
  selectedIndex,
  primaryColor = "#1677ff",
  xMetric: controlledXMetric,
  yMetric: controlledYMetric,
  onXMetricChange,
  onYMetricChange,
  onPointDetail,
}) => {
  const [state, setState] = useState<FetchState<unknown>>({ status: "idle" });
  const [resolvedToken, setResolvedToken] = useState<string | undefined>(token);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [localXMetric, setLocalXMetric] = useState<"index" | "cost">("index");
  const [localYMetric, setLocalYMetric] = useState<"ep" | "ges">("ep");
  const [localSelectedIndex, setLocalSelectedIndex] = useState<number | undefined>(undefined);
  const [xDomainOverride, setXDomainOverride] = useState<[number, number] | null>(null);
  const [yDomainOverride, setYDomainOverride] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveToken() {
      if (token) {
        setResolvedToken(token);
        return;
      }
      if (getAccessToken) {
        try {
          const t = await getAccessToken();
          if (!cancelled) setResolvedToken(t);
        } catch {
          if (!cancelled) setResolvedToken(undefined);
        }
      }
    }
    resolveToken();
    return () => {
      cancelled = true;
    };
  }, [token, getAccessToken]);

  useEffect(() => {
    let cancelled = false;
    if (!resolvedToken) {
      // wait until a token is available
      return () => {
        cancelled = true;
      };
    }
    setState({ status: "loading" });
    const url = new URL("/backoffice/simulation_graph", apiBaseUrl);
    url.searchParams.set("ref_ademe", dpeId);
    if (simul) url.searchParams.set("simul", simul);
    fetch(url.toString(), {
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${resolvedToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setState({ status: "success", data: json });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", error: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, dpeId, simul, resolvedToken]);

  const points = useMemo(() => {
    if (state.status !== "success") return null;
    return parseSimulationGraphData(state.data);
  }, [state]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    if (!points || points.length === 0) return;
    const margin = { top: 10, right: 20, bottom: 32, left: 48 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    // Build scatter source based on selected metrics
    const xMetric = (controlledXMetric ?? localXMetric);
    const yMetric = (controlledYMetric ?? localYMetric);
    const data = points
      .map((p) => ({
        x: xMetric === "index" ? Number(p.index) : Number(p.cost),
        y: yMetric === "ep" ? Number(p.ep) : Number(p.ges),
        letter: (p.letter || "").toUpperCase(),
        raw: p,
      }))
      .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));

    const xDomain = d3.extent(data, (d) => d.x) as [number, number];
    const yDomain = d3.extent(data, (d) => d.y) as [number, number];

    const xDomainEffective = (xDomainOverride ?? xDomain) || [0, 1];
    const yDomainEffective = (yDomainOverride ?? yDomain) || [0, 1];

    const x = d3.scaleLinear().domain(xDomainEffective).nice().range([0, innerWidth]);
    const y = d3.scaleLinear().domain(yDomainEffective).nice().range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(10));
    g.append("g").call(d3.axisLeft(y));

    const colorMap = { ...(mapColorDpe || {}), ...DEFAULT_MAP_COLOR_DPE } as Record<string, string>;

    const pointsLayer = g.append("g")
      .selectAll("circle.point")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", 7)
      .attr("fill", (d) => colorMap[d.letter] || "#9ca3af")
      .attr("stroke", (d) => {
        const idx = d.raw?.index as number;
        const isSelected = typeof (selectedIndex ?? localSelectedIndex) === "number" && idx === (selectedIndex ?? localSelectedIndex);
        return isSelected ? primaryColor : "#888888";
      })
      .attr("stroke-width", (d) => {
        const idx = d.raw?.index as number;
        const isSelected = typeof (selectedIndex ?? localSelectedIndex) === "number" && idx === (selectedIndex ?? localSelectedIndex);
        return isSelected ? 3 : 1;
      })
      .attr("opacity", 0.95)
      .style("pointer-events", "all")
      .style("cursor", (onSelectPoint || onPointDetail) ? "pointer" : "default")
      .on("click", (_, d) => {
        try {
          setLocalSelectedIndex(d.raw?.index);
          onSelectPoint && onSelectPoint(d.raw);
        } catch {}
        try {
          const detailId = d.raw?.id as (string | undefined);
          const runName = simul;
          if (!detailId || !runName || !resolvedToken) return;
          const url = new URL("/backoffice/simulation_graph_detail", apiBaseUrl);
          url.searchParams.set("ref_ademe", dpeId);
          url.searchParams.set("run_name", runName);
          url.searchParams.set("id", detailId);
          fetch(url.toString(), {
            headers: {
              Accept: "*/*",
              Authorization: `Bearer ${resolvedToken}`,
            },
          })
            .then(async (res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.json();
            })
            .then((json) => {
              try { onPointDetail && onPointDetail(json); } catch {}
            })
            .catch(() => { /* ignore detail errors for now */ });
        } catch {}
      });

    g.append("g")
      .selectAll("text.label")
      .data(data.filter((d) => d.letter))
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", (d) => x(d.x))
      .attr("y", (d) => y(d.y))
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 9)
      .attr("fill", "#444444")
      .style("pointer-events", "none")
      .text((d) => d.letter);

    const brush = d3
      .brush()
      .extent([[0, 0], [innerWidth, innerHeight]])
      .on("end", (event: any) => {
        const selection = event.selection as [[number, number], [number, number]] | null;
        if (!selection) return;
        const [[x0, y0], [x1, y1]] = selection;
        if (Math.abs(x1 - x0) < 2 || Math.abs(y1 - y0) < 2) {
          return;
        }
        const newX0 = x.invert(Math.min(x0, x1));
        const newX1 = x.invert(Math.max(x0, x1));
        const newY0 = y.invert(Math.max(y0, y1));
        const newY1 = y.invert(Math.min(y0, y1));
        if (!Number.isFinite(newX0) || !Number.isFinite(newX1) || !Number.isFinite(newY0) || !Number.isFinite(newY1)) {
          return;
        }
        setXDomainOverride([newX0, newX1]);
        setYDomainOverride([newY0, newY1]);
      });

    const brushG = g.append("g").attr("class", "brush").call(brush as any);
    try { (brushG as any).lower(); } catch {}
  }, [points, width, height, controlledXMetric, controlledYMetric, localXMetric, localYMetric, mapColorDpe, selectedIndex, primaryColor, localSelectedIndex, xDomainOverride, yDomainOverride, onSelectPoint, onPointDetail, apiBaseUrl, dpeId, simul, resolvedToken]);

  if (state.status === "loading") {
    return <div className={className}>Loading simulation results…</div>;
  }
  if (state.status === "error") {
    return <div className={className}>Error: {state.error}</div>;
  }

  if (state.status === "success" && !points) {
    return (
      <div className={className}>
        Unsupported data format
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className={className}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <Space size={8}>
          <span style={{ color: "#4b5563" }}>horizontal</span>
          <Select
            size="small"
            value={(controlledXMetric ?? localXMetric)}
            onChange={(v) => { onXMetricChange ? onXMetricChange(v) : setLocalXMetric(v); }}
            style={{ width: 140 }}
            options={[
              { label: "index", value: "index" },
              { label: "cost", value: "cost" },
            ]}
          />
        </Space>
        <Space size={8}>
          <span style={{ color: "#4b5563" }}>vertical</span>
          <Select
            size="small"
            value={(controlledYMetric ?? localYMetric)}
            onChange={(v) => { onYMetricChange ? onYMetricChange(v) : setLocalYMetric(v); }}
            style={{ width: 220 }}
            options={[
              { label: "ep_conso_5_usages_m2", value: "ep" },
              { label: "emission_ges_5_usages_m2", value: "ges" },
            ]}
          />
        </Space>
        <Button size="small" onClick={() => { setXDomainOverride(null); setYDomainOverride(null); }} disabled={!xDomainOverride && !yDomainOverride}>
          Reset zoom
        </Button>
      </div>
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};



```

- I moved the brush group behind the points so circles receive hover and click, restoring clickability.
- The hand cursor now shows over points (priority over crosshair). You can still drag on empty space to brush-zoom.

