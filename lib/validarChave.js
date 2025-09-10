async function validarChave(key, document) {
  const resp = await fetch("/api/pix/validate-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, document, amount: 0.01 }),
  });
  const data = await resp.json();
  if (!data.ok) throw new Error(data.error?.nome || data.error || "Falha na validação");
  return data; // { ok, idEnvio, e2eId, status, bucket }
}
