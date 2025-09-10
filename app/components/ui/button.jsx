"use client"; 
import React from "react";

export function Button({ children, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: "8px 16px",
        borderRadius: "6px",
        border: "none",
        background: "#6366f1",
        color: "#fff"
      }}
    >
      {children}
    </button>
  );
}

// Botão para pagamento Pix ou boleto
export function ButtonPix({ children, url, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: "8px 16px",
        borderRadius: "6px",
        border: "none",
        background: "#10b981",
        color: "#fff",
        cursor: "pointer"
      }}
      onClick={() => window.open(url, "_blank")}
    >
      {children}
    </button>
  );
}