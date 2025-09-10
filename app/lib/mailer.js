// lib/mailer.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
host: process.env.SMTP_HOST,
port: Number(process.env.SMTP_PORT || 587),
secure: process.env.SMTP_SECURE === "true",
auth: {
user: process.env.SMTP_USER,
pass: process.env.SMTP_PASS,
},
});

export async function sendOtpEmail(to, code) {
const from = process.env.SMTP_FROM || "no-reply@example.com";
const info = await transporter.sendMail({
from,
to,
subject: "Seu código de verificação",
text: `Seu código é ${code}. Ele expira em ${Math.floor((Number(process.env.OTP_TTL_SECONDS || 600))/60)} minutos.`,
html: `<p>Seu código é <b>${code}</b>.</p><p>Ele expira em <b>${Math.floor((Number(process.env.OTP_TTL_SECONDS || 600))/60)} minutos</b>.</p>`,
});
return info.messageId;
}