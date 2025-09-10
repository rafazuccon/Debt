// lib/refundPix.js

/**
 * Faz uma chamada à rota /api/pix/refund para devolver um Pix recebido
 * @param {string} e2eId - Identificador do Pix recebido (vem do webhook da Efí)
 * @param {number} amount - Valor da devolução (em reais). Pode ser parcial ou total.
 * @param {string} [id] - ID único da devolução (se não passar, gera automático)
 * @returns {Promise<object>} Resposta do backend { ok, devolucao }
 */
export async function refundPix(e2eId: string, amount: number = 0.01, id?: string) {
  const resp = await fetch("/api/pix/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      e2eId,
      amount,
      id: id || `DEV-${Date.now()}`
    }),
  });

  const data = await resp.json();

  if (!data.ok) {
    throw new Error(
      data.error?.mensagem ||
      data.error?.nome ||
      data.error ||
      "Falha na devolução"
    );
  }

  return data; // { ok: true, devolucao: {...} }
}
