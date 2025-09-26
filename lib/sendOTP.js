import { PrismaClient, OtpChannel } from "@prisma/client";
import crypto from "crypto";
import nodemailer from "nodemailer";

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

// ---- E-mail ----
async function sendEmail(to, code) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("Configuração SMTP incompleta");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"PayMate" <${user}>`,
    to,
    subject: "Seu código de verificação - PayMate",
    text: `Seu código de verificação é: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>PayMate</h1>
        <p>Seu código de verificação é:</p>
        <h2 style="color: #0066cc; font-size: 32px; letter-spacing: 5px;">${code}</h2>
        <p>Este código expira em 5 minutos.</p>
      </div>
    `,
  });

  console.log(`[SMTP] enviado: código para ${to}`);
  return true;
}

// Função principal para enviar OTP
export async function sendOTP(userId, channel, destination, purpose = "verify-contact") {
  try {
    // Verifica se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const ch = channel.toUpperCase();
    if (!["EMAIL", "SMS"].includes(ch)) {
      throw new Error("Canal inválido");
    }

    const dest = ch === "SMS" ? destination : destination.trim().toLowerCase();

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
      throw new Error("Aguarde 30 segundos antes de solicitar um novo código");
    }

    // Gera e armazena o código
    const code = generateCode();
    const hashedCode = hashCode(code);
    const expiresAt = expiresAtFromNow(5);

    await prisma.otpCode.create({
      data: {
        userId,
        channel: ch,
        destination: dest,
        purpose,
        hashedCode,
        expiresAt,
        lastSentAt: new Date(),
      },
    });

    // Envia o código
    if (ch === "EMAIL") {
      await sendEmail(dest, code);
    } else if (ch === "SMS") {
      // Implementar SMS se necessário
      throw new Error("SMS não implementado ainda");
    }

    return {
      success: true,
      ttl: 300,
      destination: dest,
      debugCode: code // Remover em produção
    };

  } catch (error) {
    console.error("[sendOTP] erro:", error);
    throw error;
  }
}
