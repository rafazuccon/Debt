import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
    }

    console.log("=== DIAGNÓSTICO DE EMAIL ===");
    console.log("SMTP_HOST:", process.env.SMTP_HOST);
    console.log("SMTP_PORT:", process.env.SMTP_PORT);
    console.log("SMTP_USER:", process.env.SMTP_USER);
    console.log("SMTP_PASS:", process.env.SMTP_PASS ? "***CONFIGURADO***" : "NÃO CONFIGURADO");

    // Configuração do SMTP com logs detalhados
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: true, // Ativa logs detalhados
      logger: true // Ativa logging
    });

    // Verificação da conexão
    console.log("Testando conexão SMTP...");
    try {
      const verified = await transporter.verify();
      console.log("✅ Conexão SMTP verificada:", verified);
    } catch (verifyError) {
      console.error("❌ Erro na verificação SMTP:", verifyError);
      return NextResponse.json({ 
        error: "Falha na conexão SMTP",
        details: verifyError.message,
        code: verifyError.code
      }, { status: 500 });
    }

    // Envio do e-mail de teste
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const mailOptions = {
      from: `"PayMate Diagnóstico" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🔧 Teste de Diagnóstico - PayMate",
      text: `Este é um e-mail de teste de diagnóstico.\n\nCódigo de teste: ${testCode}\n\nSe você recebeu este e-mail, a configuração está funcionando corretamente.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h1 style="color: #333;">🔧 PayMate - Diagnóstico de E-mail</h1>
          <p>Este é um e-mail de <strong>teste de diagnóstico</strong>.</p>
          
          <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0; color: #0066cc;">Código de Teste:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #0066cc; margin: 10px 0;">${testCode}</p>
          </div>
          
          <p>Se você recebeu este e-mail, significa que:</p>
          <ul>
            <li>✅ A configuração SMTP está correta</li>
            <li>✅ O servidor consegue se conectar ao Gmail</li>
            <li>✅ O e-mail foi enviado com sucesso</li>
          </ul>
          
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            Este e-mail foi enviado em: ${new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      `,
    };

    console.log("Enviando e-mail de diagnóstico...");
    const info = await transporter.sendMail(mailOptions);
    
    console.log("✅ E-mail enviado com sucesso!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
    console.log("Envelope:", info.envelope);
    
    return NextResponse.json({ 
      success: true, 
      message: "E-mail de diagnóstico enviado com sucesso",
      testCode,
      messageId: info.messageId,
      response: info.response,
      envelope: info.envelope,
      smtpConfig: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        secure: process.env.SMTP_SECURE
      }
    });

  } catch (error) {
    console.error("❌ Erro no diagnóstico de e-mail:", error);
    return NextResponse.json({ 
      error: "Erro no diagnóstico de e-mail",
      details: error.message,
      code: error.code,
      stack: error.stack
    }, { status: 500 });
  }
}
