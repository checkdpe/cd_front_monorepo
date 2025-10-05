import React from "react";

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  useDevEnvironment: boolean;
  onEnvironmentChange: (useDev: boolean) => void;
  devEnvironmentUrl?: string;
  prodEnvironmentUrl?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  useDevEnvironment,
  onEnvironmentChange,
  devEnvironmentUrl = "Development",
  prodEnvironmentUrl = "Production"
}) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px"
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "600",
              color: "#111827"
            }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              appearance: "none",
              border: "none",
              background: "transparent",
              fontSize: "20px",
              cursor: "pointer",
              color: "#6b7280",
              padding: "4px",
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "8px"
            }}
          >
            API Environment
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              backgroundColor: "#f9fafb"
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "500",
                  color: "#111827",
                  marginBottom: "2px"
                }}
              >
                {useDevEnvironment ? devEnvironmentUrl : prodEnvironmentUrl}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280"
                }}
              >
                {useDevEnvironment 
                  ? "Development API endpoint" 
                  : "Production API endpoint"
                }
              </div>
            </div>
            <label
              style={{
                position: "relative",
                display: "inline-block",
                width: "44px",
                height: "24px"
              }}
            >
              <input
                type="checkbox"
                checked={useDevEnvironment}
                onChange={(e) => onEnvironmentChange(e.target.checked)}
                style={{
                  opacity: 0,
                  width: 0,
                  height: 0
                }}
              />
              <span
                style={{
                  position: "absolute",
                  cursor: "pointer",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: useDevEnvironment ? "#3b82f6" : "#d1d5db",
                  transition: "0.3s",
                  borderRadius: "24px"
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    content: '""',
                    height: "18px",
                    width: "18px",
                    left: useDevEnvironment ? "22px" : "3px",
                    bottom: "3px",
                    backgroundColor: "white",
                    transition: "0.3s",
                    borderRadius: "50%",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)"
                  }}
                />
              </span>
            </label>
          </div>
        </div>

        <div
          style={{
            padding: "12px",
            backgroundColor: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#92400e"
          }}
        >
          ⚠️ Changing the environment will require a page refresh to take effect.
        </div>
      </div>
    </div>
  );
};
