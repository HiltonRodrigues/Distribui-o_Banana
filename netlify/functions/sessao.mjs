// Função serverless (Netlify Functions + Netlify Blobs) que guarda a ÚLTIMA SESSÃO
// (vendas compactadas, planning, lojas habilitadas e parâmetros) num estado
// partilhado. Permite que qualquer computador entre no dashboard sem carregar
// ficheiros, usando os dados carregados mais recentemente por qualquer utilizador.
//
// GET  /api/sessao -> devolve a sessão guardada (404 se ainda não existir)
// POST /api/sessao -> substitui a sessão guardada pela enviada

import { getStore } from "@netlify/blobs";

const CHAVE = "sessao";

export default async (req) => {
  const store = getStore("doca-sessao");
  const headers = { "cache-control": "no-store" };

  if (req.method === "GET") {
    const s = await store.get(CHAVE, { type: "json" });
    if (!s || !Array.isArray(s.vendas) || s.vendas.length === 0) {
      return new Response("Sem sessão guardada", { status: 404, headers });
    }
    return Response.json(s, { headers });
  }

  if (req.method === "POST" || req.method === "PUT") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("JSON inválido", { status: 400 });
    }
    if (!body || !Array.isArray(body.vendas) || body.vendas.length === 0) {
      return new Response("Sessão inválida", { status: 400 });
    }
    await store.setJSON(CHAVE, body);
    return Response.json({ ok: true }, { headers });
  }

  return new Response("Método não permitido", { status: 405 });
};

export const config = { path: "/api/sessao" };
