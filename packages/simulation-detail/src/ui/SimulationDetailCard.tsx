import React from "react";
import { Card, Descriptions, Tag } from "antd";

export type SimulationPointDetail = {
  index: number;
  cost?: number;
  ep?: number;
  ges?: number;
  letter?: string;
};

export type SimulationDetailCardProps = {
  point?: SimulationPointDetail | null;
  loading?: boolean;
  mapColorDpe?: Record<string, string>;
  style?: React.CSSProperties;
  className?: string;
};

export const SimulationDetailCard: React.FC<SimulationDetailCardProps> = ({
  point,
  loading,
  mapColorDpe,
  style,
  className,
}) => {
  const colorMap = mapColorDpe || {};
  const letter = (point?.letter || "").toUpperCase();
  const tagColor = colorMap[letter] || "#9ca3af";

  return (
    <Card
      className={className}
      style={{ borderColor: "#e5e7eb", ...style }}
      loading={loading}
      size="small"
    >
      {!point ? (
        <div style={{ color: "#6b7280", fontSize: 13 }}>Select a point to see details</div>
      ) : (
        <Descriptions
          size="small"
          column={2}
          labelStyle={{ color: "#4b5563" }}
          contentStyle={{ color: "#111827" }}
        >
          <Descriptions.Item label="index">{point.index}</Descriptions.Item>
          <Descriptions.Item label="letter">
            {letter ? <Tag color={tagColor}>{letter}</Tag> : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="ep_conso_5_usages_m2">{Number.isFinite(point.ep as number) ? point?.ep : "-"}</Descriptions.Item>
          <Descriptions.Item label="emission_ges_5_usages_m2">{Number.isFinite(point.ges as number) ? point?.ges : "-"}</Descriptions.Item>
          <Descriptions.Item label="cost">{Number.isFinite(point.cost as number) ? point?.cost : "-"}</Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
};


