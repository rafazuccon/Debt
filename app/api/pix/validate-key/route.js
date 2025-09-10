// app/api/pix/validate-key/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";

// ...código existente no topo

function toAmount(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return NaN;
  return Math.round(v * 100) / 100; // 2 casas
}

// Removed duplicate/incomplete POST handler to fix syntax error



/** ========= mTLS + OAuth helpers (iguais aos da sua /api/pix/qrcode) ========= */
const BASE = process.env.EFI_SANDBOX === "true"
  ? "https://pix-h.api.efipay.com.br"
  : "https://pix.api.efipay.com.br";

function getPfxBuffer() {
  const certPath = process.env.EFI_CERT_PATH || "";
  const resolved = path.resolve(process.cwd(), certPath);
  return fs.readFileSync(resolved); // lança ENOENT se não existir
}

function agent() {
  const pfx = getPfxBuffer();
  const passphrase = process.env.EFI_CERT_PASS || "";
  return new https.Agent({ pfx, passphrase, keepAlive: true });
}

async function getAccessToken() {
  const basic = Buffer.from(
    `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`
  ).toString("base64");

  const client = axios.create({
    baseURL: BASE,
    httpsAgent: agent(),
    timeout: 15000,
    proxy: false,
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });

  const resp = await client.post("/oauth/token", { grant_type: "client_credentials" });
  if (resp.status !== 200) {
    throw new Error(`OAuth (${resp.status}): ${JSON.stringify(resp.data)}`);
  }
  return resp.data.access_token;
}

/** ========= Utils ========= */
function onlyDigits(s = "") {
  return String(s).replace(/\D+/g, "");
}
function buildIdEnvio() {
  return `VALID-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** ========= Handler =========
 * Body esperado (exemplos):
 * { "key": "email@ex.com", "document": "12345678909", "amount": 0.01 }
 * { "key": "+5531999998888", "document": "11222333000181", "amount": 0.01 }
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = String(body.key || "").trim();
    const amount = Number(body.amount ?? 0.01);
    const documentRaw = String(body.document || "").trim();
    const document = onlyDigits(documentRaw);

    if (!key || !amount) {
      return NextResponse.json({ ok: false, error: "Informe key e amount." }, { status: 400 });
    }
    if (!document || ![11, 14].includes(document.length)) {
      return NextResponse.json({ ok: false, error: "Documento inválido. Use CPF (11) ou CNPJ (14)." }, { status: 400 });
    }

    // A chave do PAGADOR da sua conta Efí (aquela com webhook + escopo pix.send)
    const payerKey = (process.env.EFI_PAYER_KEY || "").trim();
    if (!payerKey) {
      return NextResponse.json({ ok: false, error: "Configuração ausente: defina EFI_PAYER_KEY no .env.local" }, { status: 500 });
    }

    const idEnvio = buildIdEnvio();
    const token = await getAccessToken();

    const client = axios.create({
      baseURL: BASE,
      httpsAgent: agent(),
      timeout: 20000,
      proxy: false,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });

    // Monta o favorecido conforme docs: incluir CPF/CNPJ para validar titularidade no envio
    // (se não pertencer, a API recusa a operação)
    // Exemplo oficial inclui "favorecido.cpf" com "favorecido.chave". :contentReference[oaicite:1]{index=1}
    const favorecido = { chave: key };
    if (document.length === 11) {
      favorecido.cpf = document;
    } else {
      favorecido.cnpj = document;
    }

    const payload = {
      valor: amount.toFixed(2),
      pagador: { chave: payerKey, infoPagador: "Validação de chave (microdepósito)" },
      favorecido,
    };

    // Efí recomenda PUT /v3/gn/pix/:idEnvio (v2 continua funcionando) com escopo pix.send. :contentReference[oaicite:2]{index=2}
    const resp = await client.put(`/v3/gn/pix/${encodeURIComponent(idEnvio)}`, payload);

    if (![200, 201].includes(resp.status)) {
      // alguns erros relevantes:
      // - nome: "chave_nao_pertence_ao_documento" quando CPF/CNPJ não bate com a chave
      // - nome: "chave_favorecido_nao_encontrada"
      // - nome: "id_envio_duplicado"
      // - 429 balde de fichas vazio (Bucket-Size / Retry-After nos headers)
      return NextResponse.json(
        { ok: false, status: resp.status, error: resp.data || "falha no envio" },
        { status: 422 }
      );
    }

    // Resposta de sucesso: status "EM_PROCESSAMENTO" com e2eId/idEnvio.
    return NextResponse.json({
      ok: true,
      idEnvio,
      e2eId: resp.data?.e2eId || null,
      status: resp.data?.status || "EM_PROCESSAMENTO",
      bucket: {
        // pode vir nos headers quando usando v3
        size: resp.headers?.["bucket-size"] ?? null,
        retryAfter: resp.headers?.["retry-after"] ?? null,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || "erro inesperado" }, { status: 500 });
  }
}
