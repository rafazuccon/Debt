export function toE164BR(phone) {
  // Remove tudo que não é dígito
  const digits = String(phone).replace(/\D/g, "");
  // Adiciona +55 se não tiver
  if (digits.length === 11) return `+55${digits}`;
  if (digits.length === 13 && digits.startsWith("55")) return `+${digits}`;
  return null; // inválido
}

