import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pix, setPix] = useState("");
  const [mensagem, setMensagem] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    // Aqui você pode integrar com um backend ou serviço de email
    setMensagem("Email de confirmação enviado!");
    if (onLogin) onLogin({ email, pix });
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow mb-8">
      <h2 className="text-xl font-bold mb-4">Cadastro</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Seu email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="text"
          placeholder="Chave Pix"
          value={pix}
          onChange={e => setPix(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">
          Cadastrar
        </button>
      </form>
      {mensagem && <p className="mt-4 text-green-600">{mensagem}</p>}
    </div>
  );
}