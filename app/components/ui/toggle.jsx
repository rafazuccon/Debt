// filepath: /Users/gustavozuccon/nome-do-projeto/app/components/ui/toggle.jsx
import React from "react";
export default function Toggle({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      style={{ width: 24, height: 24 }}
    />
  );
}