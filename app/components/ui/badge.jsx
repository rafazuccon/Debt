// filepath: /Users/gustavozuccon/nome-do-projeto/app/components/ui/badge.jsx
import React from "react";
export default function Badge({ children, intent }) {
  const color = intent === "info" ? "#6366f1" : intent === "warning" ? "#f59e42" : "#ccc";
  return (
    <span style={{
      padding: "4px 12px",
      borderRadius: "8px",
      background: color,
      color: "#fff",
      fontSize: "0.9em",
      fontWeight: "bold",
      marginRight: "8px"
    }}>
      {children}
    </span>
  );
}