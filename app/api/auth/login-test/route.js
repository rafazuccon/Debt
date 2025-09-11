import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { identifier, password } = await req.json();
    
    if (!identifier || !password) {
      return NextResponse.json({ error: "Informe e-mail/telefone e senha." }, { status: 400 });
    }

    // Simulação simples para teste
    if (identifier === "test@test.com" && password === "123456") {
      return NextResponse.json({ 
        ok: true,
        message: "Login simulado funcionando!" 
      });
    }

    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  } catch (error) {
    console.error("[/api/auth/login-test] erro:", error);
    return NextResponse.json({ 
      error: "Erro interno", 
      details: error.message 
    }, { status: 500 });
  }
}
