// app/api/pix/qrcode/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";


// ...código existente no topo

function toAmount(n: number | string) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN;
}

// (Removido: duplicata do handler POST)


/** ==== helpers mTLS + OAuth ==== */
const BASE = process.env.EFI_SANDBOX === "true"
  ? "https://pix-h.api.efipay.com.br"
  : "https://pix.api.efipay.com.br";

function getPfxBuffer() {
  // aceita caminho relativo ou absoluto
  const certPath = process.env.EFI_CERT_PATH || "";
  const resolved = path.resolve(process.cwd(), certPath);
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

/** ==== EMV estático simples (para chave de terceiros) ==== */
// utilitário para montar TLV
function tlv(id: string, value: string) {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}
function crc16(payload: string) {
  // cálculo CRC16/IBM-3740
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
function gerarEmvEstatico({ key, amount, name = "RECEBEDOR", city = "SAO PAULO" }: { key: string; amount: number | string; name?: string; city?: string }) {
  // IDs fixos do BR Code
  const payloadFormat = tlv("00", "01");
  const pointInitMethod = tlv("01", "11"); // estático
  const gui = tlv("00", "BR.GOV.BCB.PIX");
  const chave = tlv("01", key);
  const merchantAccountInfo = tlv("26", gui + chave);
  const merchantCategory = tlv("52", "0000");
  const currency = tlv("53", "986");
  const amountField = amount ? tlv("54", Number(amount).toFixed(2)) : "";
  const countryCode = tlv("58", "BR");
  const nameField = tlv("59", (name || "RECEBEDOR").toString().substring(0, 25));
  const cityField = tlv("60", (city || "SAO PAULO").toString().substring(0, 15));
  const addDataField = tlv("62", tlv("05", "***")); // txid opcional

  // monta sem CRC (ID 63) para calcular
  const semCRC = payloadFormat + pointInitMethod + merchantAccountInfo + merchantCategory +
                 currency + amountField + countryCode + nameField + cityField + addDataField + "6304";
  const crc = crc16(semCRC);
  return semCRC + crc;
}

/** ==== Handler ==== */
export async function POST(request: Request) {
  try {
    const { key, amount, name = "RECEBEDOR", city = "SAO PAULO", txid = "" } = await request.json();

    if (!key || !amount) {
      return NextResponse.json({ ok: false, error: "Informe key e amount." }, { status: 400 });
    }

    const myKey = (process.env.EFI_RECEIVER_KEY || "").trim().toLowerCase();
    const reqKey = String(key).trim().toLowerCase();

    // Se a chave do recebedor é a SUA, usa cobrança dinâmica na Efí
    if (myKey && reqKey === myKey) {
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

      const body = {
        calendario: { expiracao: 3600 },
        devedor: undefined, // opcional: CPF/CNPJ + nome para cobrança identificada
        valor: { original: Number(amount).toFixed(2) },
        chave: process.env.EFI_RECEIVER_KEY,
        solicitacaoPagador: txid ? `Ref: ${txid}` : "Pagamento",
      };

      const resp = await client.post("/v2/cob", body);
      if (resp.status !== 201 && resp.status !== 200) {
        return NextResponse.json(
          { ok: false, error: `cob (${resp.status}): ${JSON.stringify(resp.data)}` },
          { status: 502 }
        );
      }

      const emv = resp.data?.location ? null : resp.data?.pixCopiaECola; // alguns PSPs retornam 'pixCopiaECola'
      // fallback: consultar /v2/loc/{id}/qrcode se vier 'loc'
      if (!emv && resp.data?.loc?.id) {
        const qr = await client.get(`/v2/loc/${resp.data.loc.id}/qrcode`);
        if (qr.status !== 200) {
          return NextResponse.json(
            { ok: false, error: `qrcode (${qr.status}): ${JSON.stringify(qr.data)}` },
            { status: 502 }
          );
        }
        return NextResponse.json({ ok: true, mode: "efi-dinamico", payload: qr.data.qrcode, imagemQrcode: qr.data.imagemQrcode, txid: resp.data.txid });
      }

      return NextResponse.json({ ok: true, mode: "efi-dinamico", payload: emv || "", txid: resp.data.txid });
    }

    // Caso a chave seja de TERCEIROS: EMV estático local
    const emv = gerarEmvEstatico({ key, amount, name, city });
    return NextResponse.json({ ok: true, mode: "estatico", payload: emv });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro inesperado" }, { status: 500 });
  }
}
