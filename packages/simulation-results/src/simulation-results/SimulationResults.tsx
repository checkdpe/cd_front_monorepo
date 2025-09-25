import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Select, Space } from "antd";

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
}) => {
  const [state, setState] = useState<FetchState<unknown>>({ status: "idle" });
  const [resolvedToken, setResolvedToken] = useState<string | undefined>(token);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [xMetric, setXMetric] = useState<"index" | "cost">("index");
  const [yMetric, setYMetric] = useState<"ep" | "ges">("ep");
  const [localSelectedIndex, setLocalSelectedIndex] = useState<number | undefined>(undefined);

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

    const x = d3.scaleLinear().domain(xDomain || [0, 1]).nice().range([0, innerWidth]);
    const y = d3.scaleLinear().domain(yDomain || [0, 1]).nice().range([innerHeight, 0]);

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
  }, [points, width, height, xMetric, yMetric, mapColorDpe, selectedIndex, primaryColor, localSelectedIndex]);

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
            value={xMetric}
            onChange={(v) => setXMetric(v)}
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
            value={yMetric}
            onChange={(v) => setYMetric(v)}
            style={{ width: 220 }}
            options={[
              { label: "ep_conso_5_usages_m2", value: "ep" },
              { label: "emission_ges_5_usages_m2", value: "ges" },
            ]}
          />
        </Space>
      </div>
      <svg ref={svgRef} width={width} height={height} />
    </div>
  );
};


