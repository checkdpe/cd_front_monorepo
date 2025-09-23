import React, { useMemo, useState } from "react";
import { Modal, Select, Input, Typography, Space } from "antd";

export type SimulationScenariosModalProps = {
  open: boolean;
  onCancel: () => void;
  onLoad: (runs: unknown) => void;
};

const { Text } = Typography;

const defaultRuns = [
  {
    elements_variant: "dpe.logement.enveloppe.plancher_haut_collection.plancher_haut",
    elements_scope: [0],
    scope_strategy: "all",
    scenarios: [
      {
        id: 1,
        input: {
          "donnee_entree.epaisseur_isolation": { set: 0 },
          "donnee_entree.enum_type_isolation_id": { set: 3 },
          "donnee_entree.enum_methode_saisie_u_id": { set: 3 }
        },
        cost: { "donnee_entree.surface_paroi_opaque": { multiply: 0 } }
      }
    ]
  }
];

const altRuns = [
  {
    elements_variant: "dpe.logement.enveloppe.murs_collection.mur",
    elements_scope: [0],
    scope_strategy: "all",
    scenarios: [
      {
        id: 85,
        input: {
          "donnee_entree.epaisseur_isolation": { set: 10 },
          "donnee_entree.enum_type_isolation_id": { set: 3 },
          "donnee_entree.enum_methode_saisie_u_id": { set: 3 }
        },
        cost: { "donnee_entree.surface_paroi_opaque": { multiply: 100 } }
      },
      {
        id: 88,
        input: {
          "donnee_entree.epaisseur_isolation": { set: 30 },
          "donnee_entree.enum_type_isolation_id": { set: 3 },
          "donnee_entree.enum_methode_saisie_u_id": { set: 3 }
        },
        cost: { "donnee_entree.surface_paroi_opaque": { multiply: 150 } }
      }
    ]
  }
];

export const SimulationScenariosModal: React.FC<SimulationScenariosModalProps> = ({ open, onCancel, onLoad }) => {
  const [selection, setSelection] = useState<string>("custom");
  const [text, setText] = useState<string>(JSON.stringify(defaultRuns, null, 2));
  const [isValid, setIsValid] = useState<boolean>(true);

  const options = useMemo(() => [
    { label: "Custom JSON", value: "custom" },
    { label: "Sample: default runs", value: "default" },
    { label: "Sample: alternative runs", value: "alt" },
  ], []);

  function handleSelect(value: string) {
    setSelection(value);
    if (value === "default") setText(JSON.stringify(defaultRuns, null, 2));
    else if (value === "alt") setText(JSON.stringify(altRuns, null, 2));
  }

  function handleChange(val: string) {
    setText(val);
    try { JSON.parse(val); setIsValid(true); } catch { setIsValid(false); }
  }

  function handleOk() {
    try {
      const parsed = JSON.parse(text);
      onLoad(parsed);
    } catch {
      // ignore, button disabled
    }
  }

  return (
    <Modal
      title="Load scenario"
      open={open}
      onCancel={onCancel}
      okText="Load"
      okButtonProps={{ disabled: !isValid }}
      onOk={handleOk}
      destroyOnHidden
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <div>
          <Text type="secondary">Preset</Text>
          <Select
            style={{ width: "100%", marginTop: 6 }}
            value={selection}
            options={options}
            onChange={handleSelect}
          />
        </div>
        <div>
          <Text type="secondary">Scenario JSON (will become runs)</Text>
          <Input.TextArea
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            autoSize={{ minRows: 8 }}
          />
        </div>
      </Space>
    </Modal>
  );
};
