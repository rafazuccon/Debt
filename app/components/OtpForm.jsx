"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OtpForm({ userId, destination, channel = "EMAIL", onSuccess }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleVerify(e) {
    e.preventDefault();
    setErr("");
    if (!code) return setErr("Informe o código.");

    setLoading(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code, channel, destination }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return setErr(data?.error || "Falha ao verificar.");
      }
      onSuccess?.();
    } catch {
      setErr("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleVerify} className="space-y-3">
      <Input
        placeholder="Código de 6 dígitos"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0,6))}
      />
      {err && <p className="text-sm text-red-400">{err}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Verificando..." : "Verificar"}
      </Button>
    </form>
  );
}
