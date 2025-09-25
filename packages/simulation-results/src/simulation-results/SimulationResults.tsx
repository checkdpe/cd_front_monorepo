import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export type SimulationResultsProps = {
  dpeId: string;
  simul?: string;
  token?: string;
  getAccessToken?: () => Promise<string | undefined>;
  apiBaseUrl?: string;
  width?: number;
  height?: number;
  className?: string;
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
}) => {
  const [state, setState] = useState<FetchState<unknown>>({ status: "idle" });
  const [resolvedToken, setResolvedToken] = useState<string | undefined>(token);
  const svgRef = useRef<SVGSVGElement | null>(null);

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
    const margin = { top: 20, right: 40, bottom: 30, left: 48 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const xDomain: [number, number] = [0, Math.max(0, (points.length - 1))];
    const epMax = d3.max(points, (p) => Number(p.ep ?? 0)) ?? 0;
    const gesMax = d3.max(points, (p) => Number(p.ges ?? 0)) ?? 0;
    const leftMax = Math.max(epMax, gesMax, 0);
    const costMax = d3.max(points, (p) => Number(p.cost ?? 0)) ?? 0;

    const x = d3.scaleLinear().domain(xDomain).nice().range([0, innerWidth]);
    const yLeft = d3.scaleLinear().domain([0, leftMax]).nice().range([innerHeight, 0]);
    const yRight = d3.scaleLinear().domain([0, costMax]).nice().range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(Math.min(points.length, 10)).tickFormat((v) => String(v)));
    g.append("g").call(d3.axisLeft(yLeft));
    g.append("g")
      .attr("transform", `translate(${innerWidth},0)`) 
      .call(d3.axisRight(yRight));

    const epSeries = points.filter((p) => Number.isFinite(p.ep)).map((p) => ({ x: p.index, y: Number(p.ep) }));
    const gesSeries = points.filter((p) => Number.isFinite(p.ges)).map((p) => ({ x: p.index, y: Number(p.ges) }));
    const costSeries = points.filter((p) => Number.isFinite(p.cost)).map((p) => ({ x: p.index, y: Number(p.cost) }));

    const lineLeft = d3
      .line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => yLeft(d.y));

    const lineRight = d3
      .line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => yRight(d.y));

    if (epSeries.length > 0) {
      g.append("path")
        .datum(epSeries)
        .attr("fill", "none")
        .attr("stroke", "#1677ff")
        .attr("stroke-width", 2)
        .attr("d", lineLeft);

      // EP markers with letter labels
      const epGroup = g.append("g");
      epGroup
        .selectAll("circle.ep")
        .data(points.filter((p) => Number.isFinite(p.ep)))
        .enter()
        .append("circle")
        .attr("class", "ep")
        .attr("cx", (p) => x(p.index))
        .attr("cy", (p) => yLeft(Number(p.ep)))
        .attr("r", 3.5)
        .attr("fill", "#1677ff");

      epGroup
        .selectAll("text.letter")
        .data(points.filter((p) => Number.isFinite(p.ep) && p.letter))
        .enter()
        .append("text")
        .attr("class", "letter")
        .attr("x", (p) => x(p.index) + 6)
        .attr("y", (p) => yLeft(Number(p.ep)) - 6)
        .attr("font-size", 10)
        .attr("fill", "#111827")
        .text((p) => String(p.letter));
    }

    if (gesSeries.length > 0) {
      g.append("path")
        .datum(gesSeries)
        .attr("fill", "none")
        .attr("stroke", "#10b981")
        .attr("stroke-width", 2)
        .attr("d", lineLeft);
    }

    if (costSeries.length > 0) {
      g.append("path")
        .datum(costSeries)
        .attr("fill", "none")
        .attr("stroke", "#f59e0b")
        .attr("stroke-width", 2)
        .attr("d", lineRight);
    }
  }, [points, width, height]);

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

  return <svg ref={svgRef} className={className} width={width} height={height} />;
};


