export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const prisma = new PrismaClient();

// helpers
const onlyDigits = (s = "") => String(s).replace(/\D/g, "");
function toE164BR(input) {
  let d = onlyDigits(input || "");
  if (d.startsWith("5555")) d = d.slice(2);
  while (d.startsWith("0") && !d.startsWith("55")) d = d.slice(1);
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return `+${d}`;
  if (d.length === 10 || d.length === 11) return `+55${d}`;
  return null;
}
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());

export async function POST(req) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ error: "Informe e-mail/telefone e senha." }, { status: 400 });
    }

    // detectar se é email ou telefone
    let where = {};
    if (isEmail(identifier)) {
      where = { email: String(identifier).trim().toLowerCase() };
    } else {
      const phoneE164 = toE164BR(identifier);
      if (!phoneE164) return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
      where = { phoneE164 };
    }

    let user = await prisma.user.findFirst({
      where,
      select: {
        id: true,
        email: true,
        phoneE164: true,
        passwordHash: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
      },
    });

    // Se não encontrar o usuário, cria um usuário de teste (apenas para desenvolvimento)
    if (!user && process.env.NODE_ENV !== "production") {
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);
      
      user = await prisma.user.create({
        data: {
          email: isEmail(identifier) ? identifier.trim().toLowerCase() : null,
          phoneE164: !isEmail(identifier) ? toE164BR(identifier) : null,
          passwordHash: hashedPassword,
          emailVerifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          phoneE164: true,
          passwordHash: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
        }
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Senha inválida." }, { status: 401 });

    // se não verificado, devolve dados para ir ao /verify
    const verified = Boolean(user.emailVerifiedAt || user.phoneVerifiedAt);
    if (!verified) {
      const channel = user.phoneE164 ? "SMS" : "EMAIL";
      const destination = user.phoneE164 || user.email || "";
      return NextResponse.json({
        ok: true,
        needsVerify: true,
        userId: user.id,
        channel,
        destination,
        email: user.email,
      });
    }

    // verificado -> cria sessão
 const token = await new SignJWT({ uid: user.id })
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
  } catch (e) {
    console.error("[/api/auth/login] erro:", e);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
