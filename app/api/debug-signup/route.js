import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Teste 1: Verificar variáveis de ambiente
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      SMTP_USER: !!process.env.SMTP_USER,
      SMTP_PASS: !!process.env.SMTP_PASS,
      SMTP_HOST: !!process.env.SMTP_HOST,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
    };
    
    // Teste 2: Testar importação
    let phoneImportTest = "OK";
    try {
      const { toE164BR } = await import("../../lib/phone.js");
      const testPhone = toE164BR("11999999999");
      if (testPhone !== "+5511999999999") {
        phoneImportTest = `FAIL: Expected +5511999999999, got ${testPhone}`;
      }
    } catch (e) {
      phoneImportTest = `ERROR: ${e.message}`;
    }

    // Teste 3: Testar Prisma
    let prismaTest = "OK";
    try {
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();
      // Não executamos query real para não criar problemas
      prismaTest = "Import OK";
    } catch (e) {
      prismaTest = `ERROR: ${e.message}`;
    }

    // Teste 4: Testar bcrypt
    let bcryptTest = "OK";
    try {
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash("test", 10);
      if (hash.length > 0) {
        bcryptTest = "OK";
      }
    } catch (e) {
      bcryptTest = `ERROR: ${e.message}`;
    }

    // Teste 5: Testar nodemailer
    let nodemailerTest = "OK";
    try {
      const nodemailer = await import("nodemailer");
      // Apenas testar se importa
      if (nodemailer.createTransporter) {
        nodemailerTest = "OK";
      }
    } catch (e) {
      nodemailerTest = `ERROR: ${e.message}`;
    }

    return NextResponse.json({
      status: "success",
      timestamp: new Date().toISOString(),
      tests: {
        environment: envCheck,
        phoneImport: phoneImportTest,
        prisma: prismaTest,
        bcrypt: bcryptTest,
        nodemailer: nodemailerTest,
      }
    });

  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Testar apenas a primeira parte do signup sem banco
    const { email, phone, password } = body;
    
    if (!email && !phone) {
      return NextResponse.json({ error: "Informe e-mail ou telefone." }, { status: 400 });
    }

    // Testar função de telefone
    let phoneTest = "N/A";
    if (phone) {
      try {
        const { toE164BR } = await import("../../lib/phone.js");
        const phoneE164 = toE164BR(phone);
        phoneTest = phoneE164 || "Invalid";
      } catch (e) {
        phoneTest = `ERROR: ${e.message}`;
      }
    }

    // Testar hash da senha
    let passwordTest = "N/A";
    if (password) {
      try {
        const bcrypt = await import("bcryptjs");
        const passwordHash = await bcrypt.hash(String(password), 10);
        passwordTest = passwordHash.length > 0 ? "OK" : "FAIL";
      } catch (e) {
        passwordTest = `ERROR: ${e.message}`;
      }
    }

    return NextResponse.json({
      status: "test_success",
      receivedData: { email: !!email, phone: !!phone, password: !!password },
      tests: {
        phoneProcessing: phoneTest,
        passwordHashing: passwordTest,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
