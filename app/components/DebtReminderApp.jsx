// components/DebtReminderApp.jsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Avatar from "./ui/avatar";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import Modal from "./ui/modal";
import { QRCodeSVG } from "qrcode.react";
import { refundPix } from "@/lib/refundPix";

/* =========================================================
   UTIL: contatos no localStorage
   ========================================================= */
function loadContacts() {
  try { return JSON.parse(localStorage.getItem("pix-contacts") || "[]"); } catch { return []; }
}
function saveContacts(list) {
  localStorage.setItem("pix-contacts", JSON.stringify(list));
}
function upsertContact(c) {
  const list = loadContacts();
  const idx = list.findIndex(x => (x.pix || "").toLowerCase() === (c.pix || "").toLowerCase());
  if (idx >= 0) list[idx] = { ...list[idx], ...c };
  else list.unshift({ id: Date.now(), ...c });
  saveContacts(list);
  return list;
}

/* =========================================================
   Parser EMV Pix (copia-e-cola) – extrai chave (26/01) e valor (54)
   ========================================================= */
function parseEmvPix(payload = "") {
  payload = (payload || "").trim();
  if (!payload) return {};
  function readField(s, i) {
    const id = s.slice(i, i + 2);
    const len = parseInt(s.slice(i + 2, i + 4), 10);
    const val = s.slice(i + 4, i + 4 + len);
    return { id, len, val, next: i + 4 + len };
  }
  let i = 0;
  const map = {};
  while (i < payload.length - 4) {
    const { id, len, val, next } = readField(payload, i);
    if (!len || !id) break;
    map[id] = map[id] || [];
    map[id].push(val);
    i = next;
    if (id === "63") break; // CRC
  }
  let key = "";
  const mai = map["26"]?.[0];
  if (mai) {
    let j = 0;
    while (j < mai.length - 4) {
      const { id, len, val, next } = readField(mai, j);
      if (!len || !id) break;
      if (id === "01") key = val;
      j = next;
    }
  }
  const amount = map["54"]?.[0] ? Number(map["54"][0]) : undefined;
  return { key, amount };
}

/* =========================================================
   Helpers de máscara/validação e campo PixKeyField
   ========================================================= */
const onlyDigits = (s = "") => s.replace(/\D/g, "");
const maskCPF = (v) => {
  const d = onlyDigits(v).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2")
          .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
          .replace(/\.(\d{3})(\d)/, ".$1-$2");
};
const isValidCPF = (cpf) => onlyDigits(cpf).length === 11; // simples
const maskPhoneBR = (v) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
};
const normalizePhoneBR = (v) => `+55${onlyDigits(v)}`;
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function PixKeyField({ label = "Chave Pix", type = "email", value = "", onChange, required = false }) {
  const [t, setT] = useState(type);
  const [v, setV] = useState(value);

  useEffect(() => { emit(v, t); /* first shot */ }, []); // eslint-disable-line

  function emit(val, typ) {
    let full = val;
    if (typ === "cpf") full = onlyDigits(val);
    if (typ === "phone") full = normalizePhoneBR(val);
    if (typ === "email") full = val.trim().toLowerCase();
    onChange?.({ type: typ, value: val, full });
  }

  function handleType(next) {
    setT(next);
    setV("");
    emit("", next);
  }

  function handleInput(e) {
    const raw = e.target.value;
    let masked = raw;
    if (t === "cpf") masked = maskCPF(raw);
    if (t === "phone") masked = maskPhoneBR(raw);
    setV(masked);
    emit(masked, t);
  }

  const placeholder = t === "email" ? "email@exemplo.com" : t === "phone" ? "(11) 9XXXX-XXXX" : "000.000.000-00";
  const valid =
    (t === "email" && (v === "" || isEmail(v))) ||
    (t === "phone" && (v === "" || onlyDigits(v).length >= 10)) ||
    (t === "cpf" && (v === "" || isValidCPF(v)));

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-300">{label}</p>

      <div className="flex gap-2">
        <button type="button" onClick={() => handleType("email")}
          className={`px-3 py-1 rounded-lg text-sm border ${t==="email" ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-gray-900 border-gray-700 text-gray-300"}`}>
          E-mail
        </button>
        <button type="button" onClick={() => handleType("phone")}
          className={`px-3 py-1 rounded-lg text-sm border ${t==="phone" ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-gray-900 border-gray-700 text-gray-300"}`}>
          Telefone
        </button>
        <button type="button" onClick={() => handleType("cpf")}
          className={`px-3 py-1 rounded-lg text-sm border ${t==="cpf" ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-gray-900 border-gray-700 text-gray-300"}`}>
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

/* =========================================================
   UI: Menu de Perfil + Modal de Perfil
   ========================================================= */
function ProfileMenu({ avatarSrc, onEditarPerfil, onSair, size = 44 }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!open) return;
      if (menuRef.current && !menuRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleEsc(e) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  return (
    <div className="relative">
      <button ref={btnRef} onClick={() => setOpen(v => !v)} className="rounded-full border-2 border-purple-400 p-0.5" title="Menu do perfil">
        <img src={avatarSrc || "https://i.pravatar.cc/100"} alt="Perfil" width={size} height={size} className="rounded-full object-cover" />
      </button>

      {open && (
        <div ref={menuRef} className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-800 bg-gray-950 text-white shadow-2xl overflow-hidden z-50">
          <button onClick={() => { setOpen(false); onEditarPerfil?.(); }} className="w-full text-left px-4 py-3 hover:bg-gray-900">✏️ Editar perfil</button>
          <button onClick={() => { setOpen(false); onSair?.(); }} className="w-full text-left px-4 py-3 text-red-300 hover:bg-gray-900">⏏️ Sair</button>
        </div>
      )}
    </div>
  );
}

function ProfileModal({ open, onClose, user, onSave }) {
  const [form, setForm] = useState({ nome: "", email: "", pix: "", documento: "", avatar: "" });

  useEffect(() => {
    if (open && user) {
      setForm({
        nome: user.nome || "",
        email: user.email || "",
        pix: user.pix || "",
        documento: user.documento || "",
        avatar: user.avatar || "",
      });
    }
  }, [open, user]);

  function handleSave() {
    const cleaned = {
      ...user,
      nome: form.nome.trim(),
      email: form.email.trim(),
      pix: form.pix.trim(),
      documento: form.documento.trim(),
      avatar: form.avatar.trim(),
    };
    onSave?.(cleaned);
    onClose?.();
  }

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar perfil"
      actions={[
        <Button key="cancelar" variant="secondary" onClick={onClose}>Cancelar</Button>,
        <Button key="salvar" onClick={handleSave}>Salvar</Button>,
      ]}
    >
      <div className="space-y-4 text-white">
        <div className="flex items-center gap-3">
          <img src={form.avatar || "https://i.pravatar.cc/100"} alt="Preview" className="w-12 h-12 rounded-full object-cover" />
          <input
            type="file" accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const rd = new FileReader();
                rd.onloadend = () => setForm(f => ({ ...f, avatar: rd.result }));
                rd.readAsDataURL(file);
              }
            }}
            className="block text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500"
          />
        </div>

        <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <PixKeyField
          label="Minha chave Pix"
          type="email"
          value={form.pix}
          onChange={({ full }) => setForm({ ...form, pix: full })}
        />

        <Input placeholder="CPF/CNPJ (somente números)" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
      </div>
    </Modal>
  );
}

/* =========================================================
   ContactPicker + NewContactModal
   ========================================================= */
function ContactPicker({ onPick, onNew }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);

  useEffect(() => { if (open) setList(loadContacts()); }, [open]);

  const filtered = list
    .filter(c =>
      (c.nome || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(query.toLowerCase()) ||
      (c.pix || "").toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          className="w-full rounded-xl bg-black border border-gray-700 px-3 py-2 text-white"
          placeholder="Buscar contato (nome, e-mail ou Pix)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <Button variant="secondary" onClick={onNew}>Novo</Button>
      </div>
      {open && (
        <div
          className="absolute z-40 mt-2 w-full rounded-xl border border-gray-800 bg-gray-950 text-white shadow-xl max-h-72 overflow-auto"
          onMouseLeave={() => setOpen(false)}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">Nada encontrado.</div>
          ) : filtered.map(c => (
            <button
              key={c.id}
              onClick={() => { onPick?.(c); setOpen(false); setQuery(""); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-900"
              title={c.pix}
            >
              <div className="flex items-center gap-3">
                <img src={c.avatar || "https://i.pravatar.cc/100"} className="w-7 h-7 rounded-full object-cover" />
                <div className="min-w-0">
                  <p className="text-sm truncate">{c.nome || c.email || c.pix}</p>
                  <p className="text-xs text-gray-400 truncate">{c.email || c.pix}</p>
                </div>
                {c.validado && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-green-600/20 text-green-300 border border-green-700/40">
                    validado
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewContactModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ nome: "", email: "", pix: "", documento: "", avatar: "" });
  const [validando, setValidando] = useState(false);
  const [ok, setOk] = useState(false);
  if (!open) return null;

  async function validarPix() {
    if (!form.pix || !form.documento) return;
    setValidando(true);
    try {
      const r = await fetch("/api/pix/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chave: form.pix, documento: form.documento }),
      });
      const data = await r.json();
      if (data.ok) { setOk(true); alert("Chave validada com sucesso!"); }
      else { setOk(false); alert(data.error || "Falha ao validar chave."); }
    } finally { setValidando(false); }
  }

  function salvar() {
    const savedList = upsertContact({ ...form, validado: ok });
    onSaved?.(savedList);
    onClose?.();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo contato"
      actions={[
        <Button key="cancel" variant="secondary" onClick={onClose}>Cancelar</Button>,
        <Button key="save" onClick={salvar}>Salvar</Button>
      ]}
    >
      <div className="space-y-3 text-white">
        <Input placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
        <Input placeholder="E-mail (opcional)" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Chave Pix (email/telefone/CPF)" value={form.pix} onChange={e => setForm({ ...form, pix: e.target.value })} />
        <Input placeholder="CPF/CNPJ do titular (somente números)" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} />
        <div className="flex gap-2">
          <Button onClick={validarPix} disabled={validando}>{validando ? "Validando..." : "Validar chave"}</Button>
          {ok && <span className="self-center text-xs text-green-300">✅ Validada</span>}
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   APP PRINCIPAL (sem login/cadastro)
   ========================================================= */
export default function DebtReminderApp({ user }) {
  // seed de exemplo
  const amigosSeed = [
    { id: 1, nome: "João",  valor: 75,  avatar: "https://i.pravatar.cc/100?img=12", status: "pendente", motivo: "Almoço", papel: "sou_devedor", pixCredor: "joao@pix.com" },
    { id: 2, nome: "Maria", valor: 120, avatar: "https://i.pravatar.cc/100?img=5",  status: "pendente", motivo: "Cinema", papel: "sou_devedor", pixCredor: "maria@pix.com" },
    { id: 3, nome: "Pedro", valor: 50,  avatar: "https://i.pravatar.cc/100?img=22", status: "atrasada", motivo: "Uber",   papel: "sou_credor",  pixCredor: "" },
  ];

  const [amigos, setAmigos] = useState(amigosSeed);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [pixContato, setPixContato] = useState(""); // quando sou_devedor, chave do credor
  const [papel, setPapel] = useState("sou_devedor");
  const [payloadPixColado, setPayloadPixColado] = useState("");

  const [abrirModalPagar, setAbrirModalPagar] = useState(false);
  const [abrirModalExcluir, setAbrirModalExcluir] = useState(false);
  const [selecionado, setSelecionado] = useState(null);

  const [qrPayload, setQrPayload] = useState("");
  const [qrLoading, setQrLoading] = useState(false);

  const [abrirPerfil, setAbrirPerfil] = useState(false);
  const [abrirNovoContato, setAbrirNovoContato] = useState(false);

  // totais
  const totalEuDevo = amigos.filter(a => a.papel === "sou_devedor").reduce((s, a) => s + a.valor, 0);
  const pendenteEuDevo = amigos.filter(a => a.papel === "sou_devedor" && a.status !== "pago").reduce((s, a) => s + a.valor, 0);
  const totalMeDevem = amigos.filter(a => a.papel === "sou_credor").reduce((s, a) => s + a.valor, 0);
  const pendenteMeDevem = amigos.filter(a => a.papel === "sou_credor" && a.status !== "pago").reduce((s, a) => s + a.valor, 0);

  function adicionar() {
    if (!nome || !valor || !motivo) return;
    if (papel === "sou_devedor" && !pixContato) return;

    // salva/atualiza contato automaticamente
    upsertContact({
      nome: nome,
      email: nome?.includes("@") ? nome : "",
      pix: papel === "sou_devedor" ? pixContato : (user?.pix || ""),
      validado: false,
    });

    setAmigos(prev => [
      {
        id: Date.now(),
        nome,
        valor: Number(valor),
        motivo,
        avatar: "https://i.pravatar.cc/100",
        status: "pendente",
        papel,
        pixCredor: papel === "sou_devedor" ? pixContato.trim() : (user?.pix || ""),
      },
      ...prev,
    ]);
    setNome(""); setValor(""); setMotivo(""); setPixContato(""); setPapel("sou_devedor"); setPayloadPixColado("");
  }

  async function abrirPagamento(amigo) {
    setSelecionado(amigo);
    setQrPayload("");
    setQrLoading(true);

    try {
      const keyDoCredor = amigo.papel === "sou_devedor" ? amigo.pixCredor : (user?.pix || "");
      const resp = await fetch("/api/pix/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: keyDoCredor,
          amount: amigo.valor,
          name: amigo.papel === "sou_devedor" ? (amigo.nome || "CREDOR") : (user?.nome || "VOCÊ"),
          city: "SAO PAULO",
          txid: `APP-${amigo.id}`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.payload) throw new Error(data?.error || "Falha ao gerar QR.");
      setQrPayload(data.payload);
      setAbrirModalPagar(true);
    } catch (e) {
      alert(e.message || "Erro ao gerar QR Code.");
    } finally {
      setQrLoading(false);
    }
  }

  async function handleRefund(amigo) {
    if (!amigo.e2eId) {
      alert("Este registro não tem e2eId do Pix recebido.");
      return;
    }
    try {
      const result = await refundPix(amigo.e2eId, 0.01);
      alert("Devolução realizada!");
      console.log("Detalhes:", result);
    } catch (err) {
      alert("Erro na devolução: " + err.message);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Avatar/menu topo-direito */}
      <div className="absolute top-4 right-6">
        <ProfileMenu
          avatarSrc={user?.avatar}
          onEditarPerfil={() => setAbrirPerfil(true)}
          onSair={() => { /* faça logout fora deste componente */ }}
        />
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen">
        <img src="/logo.png" alt="Logo" style={{ height: 200 }} className="mb-4" />
        <p className="text-sm text-purple-400 text-center mb-6">Gerencie cobranças e pagamentos entre amigos.</p>

        {/* ---- Painel de totais ---- */}
        <div className="w-full max-w-xl mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-blue-900/40 bg-gradient-to-b from-blue-950/60 to-blue-900/20 p-4 shadow backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-blue-300/70 mb-2">Eu devo</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-200/80">Total</span>
                <span className="px-2 py-1 rounded-lg bg-blue-600/15 ring-1 ring-inset ring-blue-500/30 text-blue-300 text-lg font-semibold">
                  R$ {totalEuDevo.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-blue-200/80">Pendentes</span>
                <span className="px-2 py-1 rounded-lg bg-blue-600/15 ring-1 ring-inset ring-blue-500/30 text-blue-400 text-lg font-semibold">
                  R$ {pendenteEuDevo.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-900/40 bg-gradient-to-b from-blue-950/60 to-blue-900/20 p-4 shadow backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-blue-300/70 mb-2">Me devem</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-200/80">Total</span>
                <span className="px-2 py-1 rounded-lg bg-blue-600/15 ring-1 ring-inset ring-blue-500/30 text-blue-300 text-lg font-semibold">
                  R$ {totalMeDevem.toFixed(2)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-blue-200/80">Pendentes</span>
                <span className="px-2 py-1 rounded-lg bg-blue-600/15 ring-1 ring-inset ring-blue-500/30 text-blue-400 text-lg font-semibold">
                  R$ {pendenteMeDevem.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Registro ---- */}
        <Card className="p-6 mb-6 bg-black border border-gray-800 w-full max-w-lg">
          <h2 className="text-lg font-semibold mb-4 text-white">Registrar obrigação financeira</h2>
          <fieldset className="mb-4">
            <legend className="text-sm text-gray-300 mb-2">Relação da obrigação</legend>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="papel" value="sou_devedor" checked={papel === "sou_devedor"} onChange={() => setPapel("sou_devedor")} />
                <span className="text-sm text-gray-200"><strong>Serei o devedor</strong> (estarei devendo ao contato).</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="papel" value="sou_credor" checked={papel === "sou_credor"} onChange={() => setPapel("sou_credor")} />
                <span className="text-sm text-gray-200"><strong>Serei o credor</strong> (o contato estará em débito comigo).</span>
              </label>
            </div>
          </fieldset>

          <div className="space-y-3">
            <ContactPicker
              onPick={(c) => {
                setNome(c.nome || c.email || c.pix);
                if (papel === "sou_devedor") setPixContato(c.pix || "");
              }}
              onNew={() => setAbrirNovoContato(true)}
            />

            <Input placeholder="Valor (R$)" type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
            <Input placeholder="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />

            {/* Colar Copia-e-Cola para auto-preencher */}
            <div className="space-y-2">
              <Input
                placeholder="Colar Pix Copia-e-Cola (opcional)"
                value={payloadPixColado}
                onChange={(e) => {
                  const s = e.target.value;
                  setPayloadPixColado(s);
                  const { key, amount } = parseEmvPix(s);
                  if (key && papel === "sou_devedor") setPixContato(key);
                  if (amount && !valor) setValor(String(amount));
                }}
              />
              <p className="text-xs text-gray-400">Dica: cole aqui um Pix Copia-e-Cola para preencher chave/valor automaticamente.</p>
            </div>

            {papel === "sou_devedor" && (
              <PixKeyField
                label="Chave Pix do contato (credor)"
                type="email"
                value={pixContato}
                onChange={({ full }) => setPixContato(full)}
                required
              />
            )}

            {papel === "sou_credor" && (
              <p className="text-xs text-gray-400">
                O QR-Code será gerado com a sua chave Pix cadastrada:{" "}
                <span className="text-gray-200">{user?.pix || "não informada"}</span>.
              </p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={adicionar}>Registrar</Button>
            <Button variant="secondary" onClick={() => setAbrirModalExcluir(true)}>Excluir registro</Button>
          </div>
        </Card>

        {/* ---- Lista de obrigações ---- */}
        <Card className="p-6 bg-black border border-gray-800 w-full max-w-lg">
          <h2 className="text-lg font-semibold mb-4 text-purple-400">Obrigações registradas</h2>
          {amigos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum registro ainda.</p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {amigos.map((a) => {
                const contato = loadContacts().find(c =>
                  (c.pix || "").toLowerCase() === (
                    a.papel === "sou_devedor" ? (a.pixCredor || "").toLowerCase() : (user?.pix || "").toLowerCase()
                  )
                );
                return (
                  <li key={a.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar src={a.avatar} alt={a.nome} size="10" />
                      <div className="leading-tight min-w-0">
                        <p className="font-medium text-purple-400 truncate">
                          {a.nome}
                          {contato?.validado && (
                            <span className="ml-2 align-middle text-[10px] px-2 py-0.5 rounded bg-green-600/20 text-green-300 border border-green-700/40">
                              chave validada
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-purple-400">R$ {a.valor.toFixed(2)} • {a.motivo}</p>
                        <p className="text-xs text-gray-400">
                          {a.papel === "sou_devedor" ? "Você é o devedor neste registro." : "Você é o credor neste registro."}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {a.status !== "pago" && (
                        <Button onClick={() => abrirPagamento(a)} disabled={qrLoading && selecionado?.id === a.id}>
                          {qrLoading && selecionado?.id === a.id ? "Gerando..." : (a.papel === "sou_devedor" ? "Pagar" : "Cobrar")}
                        </Button>
                      )}
                      {/* Exemplo de botão de devolução (se você salvar e2eId no registro) */}
                      {a.e2eId && (
                        <Button variant="secondary" onClick={() => handleRefund(a)}>Devolver R$0,01</Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Modal pagamento/cobrança (QR do credor) */}
      <Modal
        open={abrirModalPagar}
        onClose={() => setAbrirModalPagar(false)}
        title={selecionado?.papel === "sou_devedor" ? `Pagar ${selecionado?.nome || ""}` : `Cobrar ${selecionado?.nome || ""}`}
        actions={[<Button key="fechar" variant="secondary" onClick={() => setAbrirModalPagar(false)}>Fechar</Button>]}
      >
        <div className="space-y-4 text-white">
          <p className="text-sm text-purple-400">Valor: R$ {selecionado?.valor?.toFixed(2)}</p>

          {qrLoading && <div className="text-sm text-gray-300">Gerando QR Code…</div>}

          {!qrLoading && qrPayload && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white inline-block">
                <QRCodeSVG value={qrPayload} size={220} style={{ shapeRendering: "crispEdges" }} />
              </div>
              <p className="text-xs break-all text-gray-300">{qrPayload}</p>
            </div>
          )}

          {!qrLoading && !qrPayload && (
            <p className="text-sm text-red-400">Não foi possível gerar o QR Code.</p>
          )}
        </div>
      </Modal>

      {/* Modal excluir registro */}
      <Modal
        open={abrirModalExcluir}
        onClose={() => setAbrirModalExcluir(false)}
        title="Excluir registro"
        actions={[<Button key="fechar" variant="secondary" onClick={() => setAbrirModalExcluir(false)}>Fechar</Button>]}
      >
        <div className="space-y-3 text-white">
          {amigos.length === 0 ? (
            <p className="text-sm text-gray-400">Não há registros para excluir.</p>
          ) : (
            <ul className="space-y-2">
              {amigos.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={a.avatar} alt={a.nome} className="w-8 h-8 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.nome}</p>
                      <p className="text-xs text-gray-400 truncate">
                        R$ {a.valor.toFixed(2)} — {a.motivo} • {a.papel === "sou_devedor" ? "Você deve" : "Ele deve"}
                      </p>
                    </div>
                  </div>
                  <Button variant="danger" onClick={() => setAmigos(prev => prev.filter(x => x.id !== a.id))}>
                    Excluir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      {/* Modais auxiliares */}
      <NewContactModal open={abrirNovoContato} onClose={() => setAbrirNovoContato(false)} onSaved={() => {}} />
      <ProfileModal 
        open={abrirPerfil} 
        onClose={() => setAbrirPerfil(false)} 
        user={user} 
        onSave={async (updatedUser) => {
          try {
            const response = await fetch('/api/user', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                nome: updatedUser.nome,
                email: updatedUser.email,
                pix: updatedUser.pix,
                documento: updatedUser.documento,
                avatar: updatedUser.avatar,
              }),
            });

            if (response.ok) {
              // Recarrega a página para atualizar os dados do usuário
              window.location.reload();
            } else {
              const error = await response.json();
              alert('Erro ao salvar perfil: ' + (error.error || 'Erro desconhecido'));
            }
          } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            alert('Erro ao salvar perfil: ' + error.message);
          }
        }} 
      />
    </div>
  );
}
