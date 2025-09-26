import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { testEmails } = await req.json();
    
    if (!testEmails || !Array.isArray(testEmails)) {
      return NextResponse.json({ error: "Lista de e-mails é obrigatória" }, { status: 400 });
    }

    console.log("=== TESTE DE MÚLTIPLOS E-MAILS ===");
    console.log(`Testando ${testEmails.length} e-mails:`, testEmails);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: false,
      logger: false
    });

    const results = [];

    for (const email of testEmails) {
      console.log(`\n--- Testando ${email} ---`);
      
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      try {
        // Envia e-mail individual
        const mailOptions = {
          from: `"PayMate Teste Múltiplo" <${process.env.SMTP_USER}>`,
          to: email,
          subject: `🧪 Teste Múltiplo PayMate - ${email}`,
          text: `Teste para ${email}\nCódigo: ${testCode}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h1 style="color: #333;">🧪 PayMate - Teste Múltiplo</h1>
              <p>Este é um teste específico para o e-mail: <strong>${email}</strong></p>
              
              <div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin: 0; color: #0066cc;">Seu Código:</h3>
                <p style="font-size: 24px; font-weight: bold; color: #0066cc; margin: 10px 0;">${testCode}</p>
              </div>
              
              <p><strong>Hora do envio:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              <p><strong>Domínio testado:</strong> ${email.split('@')[1]}</p>
              
              <p style="font-size: 12px; color: #666;">
                Se você recebeu este e-mail, o sistema está funcionando para seu provedor de e-mail.
              </p>
            </div>
          `,
        };

        console.log(`Enviando para ${email}...`);
        const startTime = Date.now();
        const info = await transporter.sendMail(mailOptions);
        const duration = Date.now() - startTime;
        
        console.log(`✅ Enviado para ${email} em ${duration}ms`);
        console.log(`Message ID: ${info.messageId}`);
        
        results.push({
          email,
          status: 'success',
          messageId: info.messageId,
          response: info.response,
          duration,
          testCode,
          provider: email.split('@')[1]
        });
        
        // Pequeno delay entre envios para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Erro ao enviar para ${email}:`, error.message);
        results.push({
          email,
          status: 'error',
          error: error.message,
          code: error.code,
          provider: email.split('@')[1]
        });
      }
    }

    // Estatísticas finais
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    
    console.log(`\n=== RESULTADOS FINAIS ===`);
    console.log(`✅ Sucessos: ${successful}/${testEmails.length}`);
    console.log(`❌ Falhas: ${failed}/${testEmails.length}`);
    
    return NextResponse.json({
      success: true,
      message: `Teste finalizado: ${successful} sucessos, ${failed} falhas`,
      results,
      summary: {
        total: testEmails.length,
        successful,
        failed,
        successRate: (successful / testEmails.length * 100).toFixed(1) + '%'
      }
    });

  } catch (error) {
    console.error("❌ Erro geral no teste múltiplo:", error);
    return NextResponse.json({ 
      error: "Erro no teste múltiplo",
      details: error.message 
    }, { status: 500 });
  }
}
