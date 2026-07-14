// Função serverless (Netlify Functions + Netlify Blobs) que guarda os AJUSTES
// partilhados do dashboard: parâmetros de cálculo, coberturas por loja, stock
// editado, edições de CX na distribuição, quantidades recebidas por CD e dias
// selecionados. É atualizada automaticamente a cada alteração no dashboard e
// carregada por todos os utilizadores ao abrir o site.
//
// GET  /api/ajustes -> devolve os ajustes guardados (404 se ainda não existirem)
// POST /api/ajustes -> substitui os ajustes guardados pelos enviados

import { getStore } from "@netlify/blobs";

const CHAVE = "ajustes";

export default async (req) => {
  const store = getStore("doca-ajustes");
  const headers = { "cache-control": "no-store" };

  if (req.method === "GET") {
    const a = await store.get(CHAVE, { type: "json" });
    if (!a || typeof a !== "object") {
      return new Response("Sem ajustes guardados", { status: 404, headers });
    }
    return Response.json(a, { headers });
  }

  if (req.method === "POST" || req.method === "PUT") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("JSON inválido", { status: 400 });
    }
    if (!body || typeof body !== "object" || !body.atualizadoEm) {
      return new Response("Ajustes inválidos", { status: 400 });
    }
    await store.setJSON(CHAVE, body);
    return Response.json({ ok: true }, { headers });
  }

  return new Response("Método não permitido", { status: 405 });
};

export const config = { path: "/api/ajustes" };
