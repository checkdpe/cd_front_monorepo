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

  // Keep a stable reference to onPointDetail to avoid re-triggering effects
  const onPointDetailRef = useRef<SimulationResultsProps["onPointDetail"]>();
  useEffect(() => { onPointDetailRef.current = onPointDetail; }, [onPointDetail]);

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

  // When a selectedIndex is provided (e.g., via URL deep-link), automatically fetch detail
  // so consumers receive onPointDetail and can react (e.g., highlight left panel)
  useEffect(() => {
    let cancelled = false;
    try {
      if (!points || !Array.isArray(points) || points.length === 0) return;
      if (typeof selectedIndex !== "number") return;
      if (!simul || !resolvedToken) return;
      const pt = points.find((p) => Number(p.index) === Number(selectedIndex));
      const detailId = pt?.id as (string | undefined);
      if (!detailId) return;
      const url = new URL("/backoffice/simulation_graph_detail", apiBaseUrl);
      url.searchParams.set("ref_ademe", dpeId);
      url.searchParams.set("run_name", simul);
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
          if (!cancelled) {
            try { onPointDetailRef.current && onPointDetailRef.current(json); } catch {}
          }
        })
        .catch(() => { /* ignore */ });
    } catch {}
    return () => { cancelled = true; };
  }, [points, selectedIndex, simul, resolvedToken, apiBaseUrl, dpeId]);

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

    // Double-click anywhere on SVG to zoom in by 15% centered on cursor, without blocking brush
    d3.select(svgEl).on("dblclick", function (event: any) {
      try {
        const [sx, sy] = d3.pointer(event, svgEl);
        // convert to inner chart coordinates by removing margins
        const mx = sx - margin.left;
        const my = sy - margin.top;
        if (mx < 0 || my < 0 || mx > innerWidth || my > innerHeight) return;
        const cx = x.invert(mx);
        const cy = y.invert(my);
        const currentX = x.domain() as [number, number];
        const currentY = y.domain() as [number, number];
        const fullX = xDomain as [number, number];
        const fullY = yDomain as [number, number];
        const factor = 0.70; // zoom in by 30%

        const newXWidth = (currentX[1] - currentX[0]) * factor;
        const newYHeight = (currentY[1] - currentY[0]) * factor;

        let x0 = cx - newXWidth / 2;
        let x1 = cx + newXWidth / 2;
        const minX = Math.min(fullX[0], fullX[1]);
        const maxX = Math.max(fullX[0], fullX[1]);
        if (x0 < minX) { x1 += (minX - x0); x0 = minX; }
        if (x1 > maxX) { x0 -= (x1 - maxX); x1 = maxX; }

        let y0 = cy - newYHeight / 2;
        let y1 = cy + newYHeight / 2;
        const minY = Math.min(fullY[0], fullY[1]);
        const maxY = Math.max(fullY[0], fullY[1]);
        if (y0 < minY) { y1 += (minY - y0); y0 = minY; }
        if (y1 > maxY) { y0 -= (y1 - maxY); y1 = maxY; }

        setXDomainOverride([x0, x1]);
        setYDomainOverride([y0, y1]);
      } catch {}
    });
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


