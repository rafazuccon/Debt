"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function toE164BRClient(input) {
  const digits = (input || "").replace(/\D/g, "");
  let d = digits.startsWith("5555") ? digits.slice(2) : digits; // corrige +5555...
  while (d.startsWith("0") && !d.startsWith("55")) d = d.slice(1);
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return input;
}

function VerifyForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const userId = sp.get("userId") || "";
  const channel = (sp.get("channel") || "SMS").toUpperCase(); // SMS | EMAIL
  const destinationRaw = sp.get("dest") || "";
  const destination = channel === "SMS" ? toE164BRClient(destinationRaw) : (destinationRaw || "");
  const next = sp.get("next") || "/";

  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [initialSendDone, setInitialSendDone] = useState(false);

  async function sendOtp() {
    setErr(""); setSending(true);
    try {
      const r = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, channel, destination, purpose: "verify-contact" }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 429) {
          throw new Error("Aguarde um momento antes de solicitar outro código.");
        }
        if (r.status === 404) {
          throw new Error("Usuário não encontrado. Redirecionando para novo cadastro...");
        }
        throw new Error(data?.error || "Falha ao enviar código.");
      }
      setSent(true);
      // Em dev você pode inspecionar data.debugCode na aba Network
    } catch (e) {
      setErr(e.message);
      // Se o usuário não existe, redireciona para signup após 3 segundos
      if (e.message.includes("Usuário não encontrado")) {
        setTimeout(() => {
          router.replace("/signup");
        }, 3000);
      }
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setErr(""); setVerifying(true);
    try {
      const r = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code, channel, destination, purpose: "verify-contact" }),
      });
      const data = await r.json();
      if (!r.ok || !data?.ok) throw new Error(data?.error || "Código inválido.");
      router.replace(next);
    } catch (e) {
      setErr(e.message);
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => { 
    if (userId && channel && destination && !initialSendDone) {
      sendOtp();
      setInitialSendDone(true);
    }
  }, [userId, channel, destination, initialSendDone]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 p-6 bg-gray-950">
        <h1 className="text-xl font-semibold mb-1">
          Confirme seu {channel === "SMS" ? "telefone" : "e-mail"}
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          Enviamos um código para <span className="text-gray-200">{destination}</span>.
        </p>

        <form onSubmit={verifyOtp} className="space-y-3">
          <Input
            placeholder="Código de 6 dígitos"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0,6))}
          />
          {err && <p className="text-sm text-red-400">{err}</p>}

          <Button type="submit" disabled={verifying || code.length !== 6} className="w-full">
            {verifying ? "Verificando..." : "Verificar"}
          </Button>

          <Button type="button" variant="secondary" disabled={sending} onClick={sendOtp} className="w-full">
            {sending ? "Reenviando..." : (sent ? "Reenviar código" : "Enviar código")}
          </Button>

          {err && err.includes("Usuário não encontrado") && (
            <Button type="button" variant="outline" onClick={() => router.replace("/signup")} className="w-full">
              Fazer novo cadastro
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Carregando...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
