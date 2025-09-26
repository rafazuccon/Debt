import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export async function GET() {
  const status = {
    timestamp: new Date().toLocaleString('pt-BR'),
    status: "checking",
    services: {},
    errors: []
  };

  try {
    // Teste de conexão com banco de dados
    console.log("🔍 Testando conexão com banco de dados...");
    const userCount = await prisma.user.count();
    status.services.database = {
      status: "✅ online",
      userCount,
      message: "Conexão com PostgreSQL funcionando"
    };
  } catch (dbError) {
    console.error("❌ Erro no banco:", dbError.message);
    status.services.database = {
      status: "❌ erro",
      error: dbError.message,
      code: dbError.code
    };
    status.errors.push(`Database: ${dbError.message}`);
  }

  try {
    // Teste de conexão SMTP
    console.log("🔍 Testando conexão SMTP...");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });

    const verified = await transporter.verify();
    status.services.smtp = {
      status: "✅ online", 
      verified,
      host: process.env.SMTP_HOST,
      user: process.env.SMTP_USER,
      message: "Conexão SMTP com Gmail funcionando"
    };
  } catch (smtpError) {
    console.error("❌ Erro SMTP:", smtpError.message);
    status.services.smtp = {
      status: "❌ erro",
      error: smtpError.message,
      code: smtpError.code
    };
    status.errors.push(`SMTP: ${smtpError.message}`);
  }

  // Verificação de variáveis de ambiente
  const requiredEnvs = ['DATABASE_URL', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'JWT_SECRET'];
  const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
  
  if (missingEnvs.length > 0) {
    status.services.environment = {
      status: "❌ erro",
      missing: missingEnvs,
      message: "Variáveis de ambiente faltando"
    };
    status.errors.push(`Environment: Faltam variáveis ${missingEnvs.join(', ')}`);
  } else {
    status.services.environment = {
      status: "✅ ok",
      message: "Todas as variáveis de ambiente configuradas"
    };
  }

  // Status geral
  status.status = status.errors.length === 0 ? "✅ sistema saudável" : "⚠️ problemas detectados";

  console.log("=== STATUS DO SISTEMA ===");
  console.log(`Status geral: ${status.status}`);
  console.log(`Banco: ${status.services.database?.status || 'não testado'}`);
  console.log(`SMTP: ${status.services.smtp?.status || 'não testado'}`);
  console.log(`Env: ${status.services.environment?.status || 'não testado'}`);
  
  if (status.errors.length > 0) {
    console.log("Erros encontrados:", status.errors);
  }

  return NextResponse.json(status, {
    status: status.errors.length === 0 ? 200 : 503
  });
}
