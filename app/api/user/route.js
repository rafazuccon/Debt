import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

// Função auxiliar para extrair userId do token
async function getUserIdFromRequest(req) {
  const cookies = req.headers.get('cookie');
  const sessionMatch = cookies?.match(/session=([^;]+)/);
  const sessionToken = sessionMatch?.[1];

  if (!sessionToken) {
    throw new Error("Token não encontrado");
  }

  const { payload } = await jwtVerify(
    sessionToken,
    new TextEncoder().encode(process.env.JWT_SECRET || "supersecret")
  );
  return payload.uid;
}

export async function GET(req) {
  try {
    const userId = await getUserIdFromRequest(req);

    // Busca o usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneE164: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        nome: true,
        pix: true,
        documento: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        phoneE164: user.phoneE164,
        emailVerifiedAt: user.emailVerifiedAt,
        phoneVerifiedAt: user.phoneVerifiedAt,
        nome: user.nome || "",
        pix: user.pix || user.email || user.phoneE164 || "",
        documento: user.documento || "",
        avatar: user.avatar || "",
      }
    });
  } catch (err) {
    console.error("[GET /api/user] erro:", err);
    if (err.message === "Token não encontrado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const userId = await getUserIdFromRequest(req);
    const { nome, email, pix, documento, avatar } = await req.json();

    // Valida email se fornecido
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // Verifica se email já existe em outro usuário
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          id: { not: userId }
        }
      });
      if (existingUser) {
        return NextResponse.json({ error: "Este email já está em uso" }, { status: 400 });
      }
    }

    // Atualiza o usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: email?.toLowerCase() || undefined,
        nome: nome || undefined,
        pix: pix || undefined,
        documento: documento || undefined,
        avatar: avatar || undefined,
      },
      select: {
        id: true,
        email: true,
        phoneE164: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        nome: true,
        pix: true,
        documento: true,
        avatar: true,
        updatedAt: true,
      }
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phoneE164: updatedUser.phoneE164,
        emailVerifiedAt: updatedUser.emailVerifiedAt,
        phoneVerifiedAt: updatedUser.phoneVerifiedAt,
        nome: updatedUser.nome || "",
        pix: updatedUser.pix || updatedUser.email || updatedUser.phoneE164 || "",
        documento: updatedUser.documento || "",
        avatar: updatedUser.avatar || "",
      }
    });
  } catch (err) {
    console.error("[PUT /api/user] erro:", err);
    if (err.message === "Token não encontrado") {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
