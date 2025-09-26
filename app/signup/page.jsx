"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
}
function onlyDigits(s = "") {
  return String(s).replace(/\D/g, "");
}
function phoneMaskBR(v = "") {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}

function SignupForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [mode, setMode] = useState("EMAIL"); // "EMAIL" | "SMS"
  const [email, setEmail] = useState("");
  const [phoneRaw, setPhoneRaw] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (mode === "EMAIL") {
      if (!email.trim()) return setErr("Informe seu e-mail.");
      if (!isEmail(email)) return setErr("E-mail inválido.");
    } else {
      const d = onlyDigits(phoneRaw);
      if (d.length < 10) return setErr("Telefone inválido. Use DDD + número.");
    }

    if (!password || password.length < 6) {
      return setErr("A senha deve ter pelo menos 6 caracteres.");
    }

    setLoading(true);
    try {
      const body = {
        email: mode === "EMAIL" ? email.trim().toLowerCase() : null,
        phone: mode === "SMS" ? phoneRaw : null, // backend normaliza
        password,
      };

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Se já existe e está verificado, mande para login
        if (res.status === 409) {
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setErr(data?.error || `Erro ao cadastrar (HTTP ${res.status})`);
        return;
      }

      const url = `/verify?userId=${data.userId}` +
        `&channel=${data.channel}` +
        `&dest=${encodeURIComponent(data.destination || "")}` +
        `&email=${encodeURIComponent(data.email || body.email || "")}` +
        `&next=${encodeURIComponent(next)}`;

      // Use window.location para evitar problemas de hidratação
      window.location.href = url;
    } catch {
      setErr("Falha de rede ao cadastrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 p-6 bg-gray-950">
        <h1 className="text-xl font-semibold mb-1">Criar conta</h1>
        <p className="text-sm text-gray-400 mb-4">
          Você pode confirmar por <span className="text-gray-200">e-mail</span> ou <span className="text-gray-200">SMS</span>.
        </p>

        {/* Abas */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "EMAIL" ? "default" : "secondary"}
            onClick={() => setMode("EMAIL")}
          >
            Cadastrar com e-mail
          </Button>
          <Button
            type="button"
            variant={mode === "SMS" ? "default" : "secondary"}
            onClick={() => setMode("SMS")}
          >
            Cadastrar com telefone
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "EMAIL" ? (
            <Input
              placeholder="Seu e-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : (
            <Input
              placeholder="Telefone (DDD + número)"
              value={phoneRaw}
              onChange={(e) => setPhoneRaw(phoneMaskBR(e.target.value))}
              inputMode="tel"
            />
          )}

          <Input
            placeholder="Senha (mín. 6)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {err && <p className="text-sm text-red-400">{err}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          Ao continuar, você concorda com nossos termos e política de privacidade.
        </p>

        {/* 🔹 Botão/link para login */}
        <p className="text-sm text-gray-400 mt-4">
          Já tem conta?{" "}
          <a href="/login" className="underline text-blue-400">
            Faça o login
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Carregando...</div>}>
      <SignupForm />
    </Suspense>
  );
}
