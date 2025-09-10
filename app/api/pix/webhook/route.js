// app/api/pix/webhook/route.js
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

export async function POST(req) {
  try {
    const payload = await req.json();
    console.log("Webhook recebido:", payload);

    // Itera sobre todos os Pix recebidos
    for (const pix of payload.pix || []) {
      const { valor, endToEndId } = pix;
      const amount = parseFloat(valor);

      // Se foi microdepósito de validação (0,01) → devolve automaticamente
      if (amount === 0.01 && endToEndId) {
        const token = await getAccessToken();
        const client = axios.create({
          baseURL: BASE,
          httpsAgent: agent(),
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          validateStatus: () => true,
        });

        const devId = `DEV-${Date.now()}`;
        const resp = await client.post(`/v2/pix/${encodeURIComponent(endToEndId)}/devolucao/${encodeURIComponent(devId)}`, {
          valor: "0.01",
        });

        console.log("Tentativa de devolução:", resp.status, resp.data);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erro no webhook:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
