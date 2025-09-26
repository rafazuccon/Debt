import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(req) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "E-mail não fornecido" }, { status: 400 });
    }

    // Deletar usuário
    const deleted = await prisma.user.deleteMany({
      where: {
        email: email.toLowerCase()
      }
    });

    return NextResponse.json({ 
      ok: true, 
      deleted: deleted.count,
      message: `Usuário ${email} removido do banco` 
    });

  } catch (error) {
    console.error("[DELETE USER] Erro:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}
