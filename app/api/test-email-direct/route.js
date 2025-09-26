import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
    }

    // Verifica se o usuário existe
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Configuração do SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verifica se a configuração está funcionando
    try {
      await transporter.verify();
      console.log("SMTP configurado corretamente");
    } catch (error) {
      console.error("Erro na configuração SMTP:", error);
      return NextResponse.json({ 
        error: "Erro na configuração de e-mail",
        details: error.message 
      }, { status: 500 });
    }

    // Envia email de teste
    const testCode = "123456";
    
    const mailOptions = {
      from: `"PayMate" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Teste de Email - PayMate",
      text: `Seu código de teste é: ${testCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>PayMate - Teste de Email</h1>
          <p>Este é um email de teste.</p>
          <p>Seu código de verificação é: <strong>${testCode}</strong></p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    return NextResponse.json({ 
      success: true, 
      message: "Email de teste enviado com sucesso",
      userId: user.id,
      messageId: info.messageId,
      smtpUser: process.env.SMTP_USER,
      emailSentTo: email
    });

  } catch (error) {
    console.error("Erro ao enviar email de teste:", error);
    return NextResponse.json({ 
      error: "Erro interno do servidor",
      details: error.message 
    }, { status: 500 });
  }
}
