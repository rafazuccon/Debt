"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// Se seus componentes de UI existirem nesses caminhos, mantenha.
// Se não, troque por <input> e <button> padrão.
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [identifier, setIdentifier] = useState(""); // e-mail ou telefone
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); 
    setLoading(true);
    
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
        credentials: 'include' // Garante que os cookies sejam incluídos
      });
      const data = await r.json();
      
      console.log("Login response:", { ok: r.ok, status: r.status, data });

      if (!r.ok) {
        setErr(data?.error || `Erro (HTTP ${r.status})`);
        return;
      }

      if (data.needsVerify) {
        const url = `/verify?userId=${data.userId}` +
          `&channel=${data.channel}` +
          `&dest=${encodeURIComponent(data.destination || "")}` +
          `&email=${encodeURIComponent(data.email || "")}` +
          `&next=${encodeURIComponent(next)}`;
        console.log("Redirecting to verify:", url);
        router.push(url);
        return;
      }

      console.log("Login successful, redirecting to:", next);
      
      // Aguarda um pouco para garantir que o cookie foi definido
      setTimeout(() => {
        window.location.replace(next);
      }, 100);
      
    } catch (error) {
      console.error("Login error:", error);
      setErr("Falha de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 p-6 bg-gray-950">
        <h1 className="text-xl font-semibold mb-1">Entrar</h1>
        <p className="text-sm text-gray-400 mb-6">
          Use seu e-mail ou telefone e sua senha.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            placeholder="E-mail ou telefone"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <Input
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {err && <p className="text-sm text-red-400">{err}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="text-xs text-gray-500 mt-4 flex justify-between">
          <a href="/signup" className="underline">Criar conta</a>
          <a href="/verify" className="underline">Já tenho código</a>
        </div>
      </div>
    </div>
  );
}
