// Função serverless (Netlify Functions + Netlify Blobs) que guarda as gravações
// de distribuição num único estado partilhado por todos os utilizadores do site.
//
// GET  /api/gravacoes  -> devolve o estado completo { stockGravado, gravacoesPorCD }
// POST /api/gravacoes  -> aplica uma ação e devolve o estado atualizado:
//   { action: "gravar", entradas: [{loja, qtd, data, cd}...],
//     gravacao: { cd, data, totalCx, dia } }
//   { action: "limpar_cd", cd: "..." }
//   { action: "limpar_tudo" }
//
// As ações são aplicadas no servidor (leitura + junção + escrita), pelo que duas
// pessoas a gravar quase ao mesmo tempo não se apagam uma à outra.

import { getStore } from "@netlify/blobs";

const ESTADO_VAZIO = { stockGravado: {}, gravacoesPorCD: {} };
const CHAVE = "estado";

function normalizar(obj) {
  if (!obj || typeof obj !== "object") return { ...ESTADO_VAZIO };
  return {
    stockGravado: obj.stockGravado && typeof obj.stockGravado === "object" ? obj.stockGravado : {},
    gravacoesPorCD: obj.gravacoesPorCD && typeof obj.gravacoesPorCD === "object" ? obj.gravacoesPorCD : {},
  };
}

export default async (req) => {
  const store = getStore("doca-gravacoes");
  const headers = { "cache-control": "no-store" };

  if (req.method === "GET") {
    const estado = normalizar(await store.get(CHAVE, { type: "json" }));
    return Response.json(estado, { headers });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response("JSON inválido", { status: 400 });
    }

    const estado = normalizar(await store.get(CHAVE, { type: "json" }));

    if (body.action === "gravar") {
      for (const e of Array.isArray(body.entradas) ? body.entradas : []) {
        if (!e || !e.loja || !(Number(e.qtd) > 0)) continue;
        const loja = String(e.loja);
        if (!estado.stockGravado[loja]) estado.stockGravado[loja] = [];
        estado.stockGravado[loja].push({
          qtd: Number(e.qtd),
          data: String(e.data || "").slice(0, 10),
          cd: String(e.cd || ""),
        });
      }
      if (body.gravacao && body.gravacao.cd) {
        const cd = String(body.gravacao.cd);
        if (!estado.gravacoesPorCD[cd]) estado.gravacoesPorCD[cd] = [];
        estado.gravacoesPorCD[cd].push({
          data: String(body.gravacao.data || new Date().toISOString()),
          totalCx: Number(body.gravacao.totalCx) || 0,
          dia: String(body.gravacao.dia || "Todos os dias"),
        });
      }
    } else if (body.action === "limpar_cd" && body.cd) {
      const cd = String(body.cd);
      for (const loja of Object.keys(estado.stockGravado)) {
        estado.stockGravado[loja] = estado.stockGravado[loja].filter((x) => x.cd !== cd);
        if (estado.stockGravado[loja].length === 0) delete estado.stockGravado[loja];
      }
      delete estado.gravacoesPorCD[cd];
    } else if (body.action === "limpar_tudo") {
      estado.stockGravado = {};
      estado.gravacoesPorCD = {};
    } else {
      return new Response("Ação inválida", { status: 400 });
    }

    await store.setJSON(CHAVE, estado);
    return Response.json(estado, { headers });
  }

  return new Response("Método não permitido", { status: 405 });
};

export const config = { path: "/api/gravacoes" };
