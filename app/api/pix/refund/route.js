// app/api/pix/refund/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";

const BASE = process.env.EFI_SANDBOX === "true"
  ? "https://pix-h.api.efipay.com.br"
  : "https://pix.api.efipay.com.br";

function getPfxBuffer() {
  const resolved = path.resolve(process.cwd(), process.env.EFI_CERT_PATH || "");
  return fs.readFileSync(resolved);
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
  const resp = await axios.post(
    `${BASE}/oauth/token`,
    { grant_type: "client_credentials" },
    { httpsAgent: agent(), headers: { Authorization: `Basic ${basic}` }, validateStatus:()=>true }
  );
  if (resp.status !== 200) throw new Error(`OAuth (${resp.status}): ${JSON.stringify(resp.data)}`);
  return resp.data.access_token;
}
function toAmount(n){ const v=Number(n); return Number.isFinite(v)? Math.round(v*100)/100 : NaN; }

export async function POST(req) {
  try {
    const { e2eId, amount, id = `DEV-${Date.now()}` } = await req.json();

    if (!e2eId) return NextResponse.json({ ok:false, error:"Informe e2eId do Pix recebido." }, { status:400 });

    const min = toAmount(process.env.PIX_MIN_AMOUNT ?? 0.01);
    const max = toAmount(process.env.PIX_MAX_AMOUNT ?? 2000);
    const val = toAmount(amount);
    if (!Number.isFinite(val) || val < min) {
      return NextResponse.json({ ok:false, error:`Valor de devolução inválido (mín. ${min.toFixed(2)}).` }, { status:422 });
    }
    // (Opcional) também pode validar `val <= valorOriginalDoPix`

    const token = await getAccessToken();
    const client = axios.create({
      baseURL: BASE,
      httpsAgent: agent(),
      timeout: 20000,
      proxy: false,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      validateStatus: () => true,
    });

    // POST /v2/pix/{e2eId}/devolucao/{id}
    const resp = await client.post(`/v2/pix/${encodeURIComponent(e2eId)}/devolucao/${encodeURIComponent(id)}`, {
      valor: val.toFixed(2),
    });

    if (![200, 201].includes(resp.status)) {
      return NextResponse.json({ ok:false, status: resp.status, error: resp.data }, { status:422 });
    }

    return NextResponse.json({ ok:true, devolucao: resp.data });
  } catch (e) {
    return NextResponse.json({ ok:false, error: e?.message || "erro inesperado" }, { status:500 });
  }
}
