import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const width = 600;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    const data = [12, 5, 6, 6, 9, 10, 3, 15, 8];

    const x = d3
      .scaleBand()
      .domain(data.map((_, i) => String(i + 1)))
      .range([margin.left, width - margin.right])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data) ?? 0])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("font", "12px system-ui, -apple-system, Segoe UI, Roboto");

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .call((g) => g.selectAll("text").attr("dy", "0.8em"));

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .call((g) => g.selectAll("text").attr("dx", "-0.4em"));

    svg
      .append("g")
      .selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (_, i) => x(String(i + 1))!)
      .attr("y", (d) => y(d))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(0) - y(d))
      .attr("fill", "#4e79a7");

    return () => {
      d3.select(container).selectAll("*").remove();
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>Basic D3 Bar Chart</h1>
      <div ref={containerRef} />
    </div>
  );
};


