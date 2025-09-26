import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { toE164BR } from "@/lib/phone";
import nodemailer from "nodemailer";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { email, phone, password } = await req.json();
    if (!email && !phone) {
      return NextResponse.json({ error: "Informe e-mail ou telefone." }, { status: 400 });
    }

    const phoneE164 = phone ? toE164BR(phone) : null;
    if (phone && !phoneE164) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }

    // Verifica se já existe usuário com o mesmo e-mail ou telefone
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email?.trim().toLowerCase() || undefined },
          { phoneE164: phoneE164 || undefined }
        ]
      }
    });
    if (existing) {
      return NextResponse.json({ error: "Usuário já cadastrado com este e-mail ou telefone." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await prisma.user.create({
      data: {
        email: email?.trim().toLowerCase() || null,
        phoneE164,
        passwordHash,
      },
    });

    // Decide canal inicial e envia OTP automaticamente
    const channel = email ? "EMAIL" : "SMS";
    const destination = email ? user.email : user.phoneE164;

    // Envia OTP automaticamente após criar usuário
    try {
      if (email) {
        // Gera código OTP
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

        // Salva OTP no banco
        await prisma.otpCode.create({
          data: {
            userId: user.id,
            channel: "EMAIL",
            destination: user.email,
            purpose: "verify-contact",
            codeHash: hashedCode,
            expiresAt,
            lastSentAt: new Date(),
          },
        });

        // Envia e-mail
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"PayMate" <${process.env.SMTP_USER}>`,
          to: user.email,
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

        console.log(`[signup] OTP enviado automaticamente para ${destination}`);
        return NextResponse.json({
          ok: true,
          userId: user.id,
          channel,
          destination,
          email: user.email,
          phoneE164: user.phoneE164,
          otpSent: true,
          debugCode: code, // Apenas para debug
        });
      } else {
        // Se não há e-mail, retorna sem enviar OTP
        return NextResponse.json({
          ok: true,
          userId: user.id,
          channel,
          destination,
          email: user.email,
          phoneE164: user.phoneE164,
          otpSent: false,
          otpError: "Envio por SMS não implementado",
        });
      }
      
    } catch (otpError) {
      console.error(`[signup] Erro ao enviar OTP:`, otpError);
      // Ainda retorna sucesso do cadastro, mas sem OTP
      return NextResponse.json({
        ok: true,
        userId: user.id,
        channel,
        destination,
        email: user.email,
        phoneE164: user.phoneE164,
        otpSent: false,
        otpError: otpError.message || "Erro interno ao enviar código",
      });
    }
  } catch (err) {
    console.error("[signup] erro:", err);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}