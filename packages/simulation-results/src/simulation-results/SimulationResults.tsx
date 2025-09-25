import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export type SimulationResultsProps = {
  dpeId: string;
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

function inferSeries(data: unknown): Array<{ x: number; y: number }> | null {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    const first = data[0] as unknown;
    if (typeof first === "number") {
      return (data as number[]).map((v, idx) => ({ x: idx, y: v }));
    }
    if (
      typeof first === "object" &&
      first !== null &&
      ("x" in (first as Record<string, unknown>) ||
        "y" in (first as Record<string, unknown>) ||
        "value" in (first as Record<string, unknown>) ||
        "date" in (first as Record<string, unknown>))
    ) {
      return (data as Array<Record<string, unknown>>).map((d, idx) => {
        const xRaw = (d["x"] ?? d["date"] ?? idx) as unknown;
        const yRaw = (d["y"] ?? d["value"] ?? 0) as unknown;
        const x = typeof xRaw === "number" ? xRaw : idx;
        const y = typeof yRaw === "number" ? yRaw : Number(yRaw) || 0;
        return { x, y };
      });
    }
  }
  return null;
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({
  dpeId,
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
    const url = new URL("/backoffice/simul_graph", apiBaseUrl);
    url.searchParams.set("dpe_id", dpeId);
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
  }, [apiBaseUrl, dpeId, resolvedToken]);

  const series = useMemo(() => {
    if (state.status !== "success") return null;
    return inferSeries(state.data);
  }, [state]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    if (!series) return;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xDomain = d3.extent(series, (d) => d.x) as [number, number];
    const yDomain = [0, d3.max(series, (d) => d.y) ?? 0];

    const x = d3.scaleLinear().domain(xDomain).nice().range([0, innerWidth]);
    const y = d3.scaleLinear().domain(yDomain).nice().range([innerHeight, 0]);

    const line = d3
      .line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => y(d.y));

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y));

    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", "#1677ff")
      .attr("stroke-width", 2)
      .attr("d", line);
  }, [series, width, height]);

  if (state.status === "loading") {
    return <div className={className}>Loading simulation results…</div>;
  }
  if (state.status === "error") {
    return <div className={className}>Error: {state.error}</div>;
  }

  if (state.status === "success" && !series) {
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


