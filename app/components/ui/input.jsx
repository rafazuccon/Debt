import React from "react";
export function Input(props) {
  return (
    <input
      {...props}
      style={{
        padding: "8px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        marginBottom: "8px",
        width: "100%",
      }}
    />
  );
}