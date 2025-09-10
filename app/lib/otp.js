lib/otp.js
import crypto from "crypto";

const CODE_LENGTH = parseInt(process.env.OTP_CODE_LENGTH || "6", 10);
const TTL = parseInt(process.env.OTP_TTL_SECONDS || "600", 10); // 10 min
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);
const RESEND_WINDOW = parseInt(process.env.OTP_RESEND_WINDOW_SECONDS || "60", 10);

export function generateCode() {
const max = 10 ** CODE_LENGTH;
const n = crypto.randomInt(0, max);
return n.toString().padStart(CODE_LENGTH, "0");
}

export function hashCode(code) {
return crypto.createHash("sha256").update(code).digest("hex");
}

export function expiresAtFromNow() {
return new Date(Date.now() + TTL * 1000);
}

export const otpConfig = { CODE_LENGTH, TTL, MAX_ATTEMPTS, RESEND_WINDOW };