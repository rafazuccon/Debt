// lib/sms.js
import twilio from "twilio";

const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_FROM;

const client = sid && token ? twilio(sid, token) : null;

export async function sendOtpSms(toE164, code) {
if (!client) throw new Error("Twilio não configurado");
const msg = await client.messages.create({
to: toE164,
from,
body: `Seu código é ${code}. Expira em ${Math.floor((Number(process.env.OTP_TTL_SECONDS || 600))/60)} min.`,
});
return msg.sid;
}