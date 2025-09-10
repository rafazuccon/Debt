import { NextResponse } from "next/server";
import { PrismaClient, OtpChannel } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
}
function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}
function expiresAtFromNow(min = 5) {
  return new Date(Date.now() + min * 60 * 1000);
}

// ---- Normalizador de telefone BR ----
function onlyDigits(s = "") { return s.replace(/\D/g, ""); }
function toE164BR(input) {
  const d = onlyDigits(input || "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return null;
}

// ---- E-mail ----
async function sendEmail(to, code) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.FROM_EMAIL || user;

  if (!host || !user || !pass) {
    console.log(`[DEV MOCK][EMAIL] para ${to}: código ${code}`);
    return { mock: true };
  }

  const nodemailer = (await import("nodemailer")).default;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Seu código de verificação",
    text: `Seu código é: ${code}`,
    html: `<p>Seu código é: <b>${code}</b></p>`,
  });
  console.log("[SMTP] enviado:", info.messageId);
  return { messageId: info.messageId };
}

// ---- SMS ----
async function sendSms(to, code) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !tok || !from) {
    console.log(`[DEV MOCK][SMS] para ${to}: código ${code}`);
    return { mock: true };
  }
  const twilio = (await import("twilio")).default;
  const tw = twilio(sid, tok);
  const msg = await tw.messages.create({
    to,
    from,
    body: `Seu código é: ${code}`,
  });
  console.log("[Twilio] SID:", msg.sid, "status:", msg.status);
  return { sid: msg.sid, status: msg.status };
}

export async function POST(req) {
  try {
    const { userId, channel, destination, purpose = "verify-contact" } = await req.json();
if (!userId || !channel || !destination) {
  return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
}

    const ch = channel.toUpperCase();
    if (!["EMAIL", "SMS"].includes(ch)) {
      return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
    }

    const dest = ch === "SMS" ? toE164BR(destination) : destination.trim().toLowerCase();
    if (ch === "SMS" && !dest) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }

    // Verifica se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ 
        error: "Usuário não encontrado. Tente fazer um novo cadastro." 
      }, { status: 404 });
    }

    // Verifica se já foi enviado um código recentemente (últimos 30 segundos)
    const recentOtp = await prisma.otpCode.findFirst({
      where: {
        userId,
        channel: ch,
        destination: dest,
        purpose,
        lastSentAt: {
          gte: new Date(Date.now() - 30 * 1000), // 30 segundos atrás
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentOtp) {
      return NextResponse.json({ 
        error: "Aguarde um momento antes de solicitar outro código." 
      }, { status: 429 });
    }

    const code = generateCode();
    const codeHash = hashCode(code);

    await prisma.otpCode.create({
      data: {
        userId,
        channel: ch,
        destination: dest,
        codeHash,
        purpose,
        expiresAt: expiresAtFromNow(),
        lastSentAt: new Date(),
      },
    });

    const result = ch === "SMS" ? await sendSms(dest, code) : await sendEmail(dest, code);

    const payload = { ok: true, ttl: 300, destination: dest };
    if (process.env.NODE_ENV !== "production") {
      payload.debugCode = code;
      payload.transport = result;
    }

    // Retorne a resposta
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[otp/send] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}