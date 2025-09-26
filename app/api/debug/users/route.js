import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phoneE164: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      users,
      count: users.length 
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ 
      error: "Erro interno",
      details: error.message 
    }, { status: 500 });
  }
}
