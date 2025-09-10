import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req) {
  try {
    const { userId, code, channel, destination, purpose = "verify-contact" } = await req.json();
    if (!userId || !code) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

const otp = await prisma.otpCode.findFirst({
  where: { userId, purpose, destination, consumedAt: null },
  orderBy: { createdAt: "desc" },
});

    console.log("[otp/verify] Tentativa de verificação:", {
      userId,
      code: code.slice(0, 2) + "****", // Apenas primeiros 2 dígitos para segurança
      channel,
      destination,
      otpFound: !!otp,
      otpExpired: otp ? otp.expiresAt < new Date() : null,
    });

    if (!otp) return NextResponse.json({ error: "Código não encontrado" }, { status: 400 });
    if (otp.codeHash !== hashCode(code)) return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    if (otp.expiresAt < new Date()) return NextResponse.json({ error: "Código expirado" }, { status: 400 });

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    if (channel === "EMAIL") {
      await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    } else {
      await prisma.user.update({ where: { id: userId }, data: { phoneVerifiedAt: new Date() } });
    }

    // cria sessão com JWT
    const token = await new SignJWT({ uid: userId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET || "supersecret"));

    const res = NextResponse.json({ ok: true });
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    console.error("[otp/verify] erro:", err);
    return NextResponse.json({ error: "Falha ao verificar OTP" }, { status: 500 });
  }
}

