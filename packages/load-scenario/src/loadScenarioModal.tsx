import React, { useEffect, useMemo, useState } from "react";
import { Modal, Input, Typography, Space, Select, Button, Table, Tag } from "antd";

export type LoadScenarioModalProps = {
  open: boolean;
  onCancel: () => void;
  onSelect: (payload: unknown) => void;
  /**
   * Used to build the API URL. Defaults to https://api-dev.etiquettedpe.fr
   */
  baseUrl?: string;
  /** If provided, prefill ref_ademe */
  initialRefAdeme?: string;
  /** Provide a function that returns a Cognito access token string */
  getAccessToken: () => Promise<string | null>;
};

type SavedScenarioItem = {
  id?: string | number;
  created_at?: string;
  label?: string;
  ref_ademe?: string;
  // Any other fields we might receive
  [key: string]: unknown;
};

export const LoadScenarioModal: React.FC<LoadScenarioModalProps> = ({ open, onCancel, onSelect, baseUrl = "https://api-dev.etiquettedpe.fr", initialRefAdeme, getAccessToken }) => {
  const [refAdeme, setRefAdeme] = useState<string>(initialRefAdeme || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SavedScenarioItem[] | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newError, setNewError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    setError(null);
    setCreating(false);
    setNewName("");
    setNewError(null);
    // Preset ref_ademe with current one each time the modal opens
    setRefAdeme(initialRefAdeme || "");
  }, [open, initialRefAdeme]);

  useEffect(() => {
    if (!open) return;
    if (refAdeme && refAdeme.trim()) {
      // auto-fetch when opening with a prefilled ref_ademe
      void fetchSaved();
    }
  }, [open, refAdeme]);

  async function fetchSaved() {
    try {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();
      if (!token) {
        throw new Error("No access token available. Please sign in.");
      }
      const url = new URL("/backoffice/simulation_scenario_saved", baseUrl);
      if (refAdeme) url.searchParams.set("ref_ademe", refAdeme);
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
      const data = (await res.json().catch(() => null)) as unknown;
      const raw: unknown[] = Array.isArray((data as any)?.items)
        ? ((data as any).items as unknown[])
        : (Array.isArray(data) ? (data as unknown[]) : []);
      const normalized: SavedScenarioItem[] = raw.map((it) => {
        if (typeof it === "string") {
          const colon = it.indexOf(":");
          const ref = colon !== -1 ? it.slice(0, colon) : undefined;
          const label = colon !== -1 ? it.slice(colon + 1) : it;
          return { id: it, ref_ademe: ref, label } as SavedScenarioItem;
        }
        if (it && typeof it === "object") return it as SavedScenarioItem;
        return { id: String(it), label: String(it) } as SavedScenarioItem;
      });
      setItems(normalized);
    } catch (e: any) {
      setError(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function handleCreateNew() {
    try {
      setNewError(null);
      const ra = (refAdeme || "").trim();
      const name = (newName || "").trim();
      if (!ra) {
        setNewError("ref_ademe required");
        return;
      }
      if (!name) {
        setNewError("Enter a name");
        return;
      }
      // Basic validation: letters, numbers, dash, underscore and dots, length <= 64
      const ok = /^[A-Za-z0-9._-]{1,64}$/.test(name);
      if (!ok) {
        setNewError("Use letters, numbers, . _ - (max 64)");
        return;
      }
      onSelect({ ref_ademe: ra, label: name });
    } catch {}
  }

  const columns = useMemo(
    () => [
      { title: "Label", dataIndex: "label", key: "label", render: (v: any) => v || "(no label)" },
      { title: "Ref", dataIndex: "ref_ademe", key: "ref_ademe" },
      { title: "Created", dataIndex: "created_at", key: "created_at" },
      {
        title: "",
        key: "action",
        render: (_: any, record: SavedScenarioItem) => (
          <Button type="link" onClick={() => onSelect(record)}>load</Button>
        ),
      },
    ],
    [onSelect]
  );

  const displayedItems = useMemo(() => {
    if (!Array.isArray(items)) return items;
    return items.filter((it) => {
      try {
        const label = String((it as any)?.label ?? "");
        return !label.toLowerCase().includes("o3cl");
      } catch {
        return true;
      }
    });
  }, [items]);

  return (
    <Modal
      title="Load scenario"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
   >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <div>
          <div style={{ marginBottom: 6, color: "#4b5563" }}>ref_ademe</div>
          <Input value={refAdeme} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefAdeme(e.target.value)} placeholder="e.g. 2394E0980765L" />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button onClick={() => {
              setCreating((v) => {
                const next = !v;
                if (next && !newName) setNewName("simul_new");
                if (!next) { setNewError(null); }
                return next;
              });
            }}>new</Button>
            {creating ? (
              <>
                <Input
                  placeholder="name"
                  value={newName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                  onPressEnter={handleCreateNew}
                  style={{ width: 220 }}
                />
                <Button type="primary" onClick={handleCreateNew}>go</Button>
              </>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={onCancel}>Cancel</Button>
            {!creating && (
              <Button type="primary" onClick={fetchSaved} loading={loading}>Fetch</Button>
            )}
          </div>
        </div>
        {newError ? (
          <div style={{ color: "#b91c1c" }}>{newError}</div>
        ) : null}
        {error && (
          <div style={{ color: "#b91c1c" }}>{error}</div>
        )}
        {Array.isArray(items) && (
          <Table
            dataSource={displayedItems as any}
            columns={columns as any}
            rowKey={(r: SavedScenarioItem) => String(r.id ?? `${r.ref_ademe}-${r.created_at}`)}
            pagination={false}
            size="small"
          />
        )}
      </Space>
    </Modal>
  );
};


