// lib/efi.js
import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";

const BASE = process.env.EFI_SANDBOX === "true"
  ? "https://pix-h.api.efipay.com.br"
  : "https://pix.api.efipay.com.br";

function getPfxBuffer() {
  const p = process.env.EFI_CERT_PATH || "";
  const resolved = path.resolve(process.cwd(), p);
  const buf = fs.readFileSync(resolved); // lança ENOENT se não existir
  return buf;
}

function agent() {
  const pfx = getPfxBuffer();
  const passphrase = process.env.EFI_CERT_PASS || "";
  return new https.Agent({
    pfx,
    passphrase,
    keepAlive: true,
    // rejectUnauthorized: true // mantenha true em produção
  });
}

export async function getAccessToken() {
  const basic = Buffer.from(
    `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`
  ).toString("base64");

  const client = axios.create({
    httpsAgent: agent(),
    baseURL: BASE,
    timeout: 15000,
    proxy: false, // evita problemas com proxy local
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });

  const resp = await client.post("/oauth/token", { grant_type: "client_credentials" });
  if (resp.status !== 200) {
    throw new Error(`OAuth falhou (${resp.status}): ${JSON.stringify(resp.data)}`);
  }
  return resp.data.access_token;
}
