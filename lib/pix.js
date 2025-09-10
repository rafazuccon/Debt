export function gerarPixCopiaCola({ chave, valor, nome }) {
  // Exemplo simplificado! Para produção, use uma lib específica.
  return `00020126360014BR.GOV.BCB.PIX0114${chave}520400005303986540${valor?.toFixed(2) || "0.00"}5802BR5913${nome}6009SAO PAULO62070503***6304`;
}
