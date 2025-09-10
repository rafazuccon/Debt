import React from "react";

export function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-gray-800 bg-black/60 backdrop-blur-md p-6 shadow-xl ${className}`}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={`text-gray-200 ${className}`}>{children}</div>;
}
