import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "E-mail não fornecido" }, { status: 400 });
    }

    // Verificar variáveis de ambiente
    const config = {
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PORT: process.env.SMTP_PORT,
      FROM_EMAIL: process.env.FROM_EMAIL,
      hasPassword: !!process.env.SMTP_PASS
    };

    console.log("[TEST EMAIL] Config:", config);

    // Se não tiver configuração, return mock
    if (!config.SMTP_HOST || !config.SMTP_USER || !config.hasPassword) {
      return NextResponse.json({ 
        ok: false, 
        error: "SMTP não configurado", 
        config,
        mock: true 
      });
    }

    // Tentar enviar e-mail
    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransporter({
      host: config.SMTP_HOST,
      port: Number(config.SMTP_PORT || 587),
      secure: Number(config.SMTP_PORT) === 465,
      auth: {
        user: config.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verificar conexão
    await transporter.verify();
    console.log("[TEST EMAIL] Conexão SMTP verificada");

    // Enviar e-mail de teste
    const info = await transporter.sendMail({
      from: config.FROM_EMAIL || config.SMTP_USER,
      to: email,
      subject: "🧪 Teste de E-mail - PayMate",
      text: `Este é um e-mail de teste do sistema PayMate.`,
      html: `<h2>✅ E-mail funcionando!</h2><p>Este é um e-mail de teste do sistema PayMate.</p><p>Data: ${new Date().toLocaleString('pt-BR')}</p>`,
    });

    console.log("[TEST EMAIL] E-mail enviado:", info.messageId);

    return NextResponse.json({ 
      ok: true, 
      messageId: info.messageId,
      to: email,
      config: {
        ...config,
        hasPassword: undefined
      }
    });

  } catch (error) {
    console.error("[TEST EMAIL] Erro:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}
