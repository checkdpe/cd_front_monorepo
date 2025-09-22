import React, { useMemo, useState } from "react";
import "./amplify";
import { authorizedFetch } from "./auth";
import { Button, Card, Col, Flex, InputNumber, Row, Select, Space, Typography, message } from "antd";
import { TopMenu } from "@acme/top-menu";

const { Title, Paragraph } = Typography;

export const App: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>("{\n  \"items\": []\n}");
  const [apiDebug, setApiDebug] = useState<number | undefined>(undefined);
  const [skip, setSkip] = useState<number>(0);
  const [limit, setLimit] = useState<number>(0);
  const [numChunks, setNumChunks] = useState<number>(1);
  const [numWorkers, setNumWorkers] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const apiDebugOptions = useMemo(() => [
    { label: "none", value: undefined },
    { label: "1", value: 1 },
    { label: "2", value: 2 },
  ], []);

  async function handleSubmit() {
    try {
      const parsed = jsonText.trim() ? JSON.parse(jsonText) : {};
      const payload = {
        data: parsed,
        options: {
          api_debug: apiDebug,
          skip,
          limit,
          nb_chunks: numChunks,
          nb_workers: numWorkers,
        }
      };
      setSubmitting(true);
      // Example: send with Authorization Bearer header if available
      try {
        // Replace "/api/simulate" with your real endpoint
        await authorizedFetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        message.success("Submitted simulation payload");
      } catch (e) {
        message.error("Failed to submit");
      } finally {
        setSubmitting(false);
        // eslint-disable-next-line no-console
        console.log("simulation payload", payload);
      }
    } catch (err) {
      message.error("Invalid JSON");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0b0c0f" }}>
      <TopMenu
        authLabel="login / sign-up"
        authHref={import.meta.env.VITE_AUTH_URL || "/auth"}
      />
      <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Simulation</Title>
          <Paragraph style={{ color: "#4b5563", marginTop: 4 }}>Provide JSON and configure options, then submit.</Paragraph>
        </Col>

        <Col xs={24} lg={16}>
          <Card style={{ background: "#ffffff", borderColor: "#e5e7eb" }} bodyStyle={{ padding: 16 }}>
            <div style={{ display: "grid" }}>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="Paste or write JSON here"
                style={{
                  minHeight: 420,
                  width: "100%",
                  background: "#ffffff",
                  color: "#111827",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
                  fontSize: 14,
                  lineHeight: 1.45,
                  resize: "vertical",
                }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card style={{ background: "#ffffff", borderColor: "#e5e7eb" }} bodyStyle={{ padding: 16 }}>
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
                <InputNumber value={numWorkers} onChange={(v) => setNumWorkers(Number(v ?? 1))} style={{ width: "100%" }} min={1} />
              </div>

              <Flex justify="flex-end">
                <Button type="primary" onClick={handleSubmit} loading={submitting}>
                  submit
                </Button>
              </Flex>
            </Space>
          </Card>
        </Col>
      </Row>
      </div>
    </div>
  );
};


