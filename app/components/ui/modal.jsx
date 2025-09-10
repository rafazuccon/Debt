import React from "react";

export default function Modal({ open, onClose, title, actions, children }) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        isolation: "isolate",
      }}
    >
      {/* Overlay: escuro + blur (no overlay, não no painel) */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Painel: fundo sólido (sem blur) para não “embacar” o QR */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 640,
          borderRadius: 16,
          background: "#0b0b0f",        // sólido
          color: "#fff",
          border: "1px solid #262626",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid #262626",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: "transparent",
              border: "none",
              color: "#a3a3a3",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: 20 }}>{children}</div>

        {/* Ações */}
        {actions && (
          <div
            style={{
              padding: "0 20px 20px",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
