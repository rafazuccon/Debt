import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { toE164BR } from "@/lib/phone";

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

    // Decide canal inicial
    const channel = email ? "EMAIL" : "SMS";
    const destination = email ? user.email : user.phoneE164;

    return NextResponse.json({
      ok: true,
      userId: user.id,
      channel,
      destination,
      email: user.email,
      phoneE164: user.phoneE164,
    });
  } catch (err) {
    console.error("[signup] erro:", err);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}