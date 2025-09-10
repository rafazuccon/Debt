import React from "react";

function onlyDigits(s = "") { return s.replace(/\D/g, ""); }
function maskCPF(v) {
  const d = onlyDigits(v).slice(0,11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}
function isValidCPF(cpf) { // validação simples (estrutura); regra oficial é mais longa
  return onlyDigits(cpf).length === 11;
}
function maskPhoneBR(v) {
  const d = onlyDigits(v).slice(0,11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
}
function normalizePhoneBR(v) {
  const d = onlyDigits(v);
  if (d.length === 11) return `+55${d}`; // ex: +55DDD9XXXXYYYY
  if (d.length === 10) return `+55${d}`; // sem nono dígito (fixo)
  return `+55${d}`;
}
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function PixKeyField({
  label = "Chave Pix",
  type,                   // "email" | "phone" | "cpf"
  value,                  // string
  onChange,               // ({ type, value, full }) => void  (full = normalizado)
  required = false,
}) {
  const [t, setT] = React.useState(type || "email");
  const [v, setV] = React.useState(value || "");

  React.useEffect(() => { onEmit(v, t); /* eslint-disable-next-line */ }, []);

  function onEmit(val, typ) {
    let full = val;
    if (typ === "cpf") full = onlyDigits(val);
    if (typ === "phone") full = normalizePhoneBR(val);
    if (typ === "email") full = val.trim().toLowerCase();
    onChange?.({ type: typ, value: val, full });
  }

  function handleType(nxt) {
    setT(nxt);
    const nv = ""; // limpa para evitar lixo de máscara
    setV(nv);
    onEmit(nv, nxt);
  }

  function handleInput(e) {
    const raw = e.target.value;
    let masked = raw;

    if (t === "cpf") masked = maskCPF(raw);
    if (t === "phone") masked = maskPhoneBR(raw);

    setV(masked);
    onEmit(masked, t);
  }

  const placeholder =
    t === "email" ? "email@exemplo.com" :
    t === "phone" ? "(11) 9XXXX-XXXX" :
    "000.000.000-00";

  const valid =
    (t === "email" && (v === "" || isEmail(v))) ||
    (t === "phone" && (v === "" || onlyDigits(v).length >= 10)) ||
    (t === "cpf" && (v === "" || isValidCPF(v)));

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-300">{label}</p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleType("email")}
          className={`px-3 py-1 rounded-lg text-sm border ${t==="email" ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-gray-900 border-gray-700 text-gray-300"}`}
        >
          E-mail
        </button>
        <button
          type="button"
          onClick={() => handleType("phone")}
          className={`px-3 py-1 rounded-lg text-sm border ${t==="phone" ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-gray-900 border-gray-700 text-gray-300"}`}
        >
          Telefone
        </button>
        <button
          type="button"
          onClick={() => handleType("cpf")}
          className={`px-3 py-1 rounded-lg text-sm border ${t==="cpf" ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-gray-900 border-gray-700 text-gray-300"}`}
        >
          CPF
        </button>
      </div>

      <input
        required={required}
        placeholder={placeholder}
        value={v}
        onChange={handleInput}
        className={`w-full rounded-xl bg-black border px-3 py-2 outline-none ${valid ? "border-gray-700 text-white" : "border-red-500/60 text-red-200"}`}
        inputMode={t === "email" ? "email" : "numeric"}
      />

      {!valid && (
        <p className="text-xs text-red-400">
          {t === "email" && "Informe um e-mail válido."}
          {t === "phone" && "Informe DDD + número (10 ou 11 dígitos)."}
          {t === "cpf" && "Informe um CPF válido (11 dígitos)."}
        </p>
      )}
    </div>
  );
}
