import React from "react";

export default function Avatar({ src, alt }) {
  return (
    <img
      src={src || "https://ui-avatars.com/api/?name=User"}
      alt={alt || "Avatar"}
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        objectFit: "cover",
      }}
    />
  );
}