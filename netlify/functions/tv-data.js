// Netlify Function: tv-data
//
// Alimenta a página /tv (TV corporativa da Semear). Não exige login, mas só
// responde com a chave privada do link (?k=...) guardada no blob "tvConfig".
// Devolve apenas o que a TV mostra — nada de financeiro, telefone ou e-mail.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}
async function getBlob(adminClient, key, fallback) {
  const { data } = await adminClient.from("agrotrack_data").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}

export const handler = async (event) => {
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Configuração do servidor incompleta." }, 500);
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const config = await getBlob(adminClient, "tvConfig", null);
  // TV pública (config.public = true): qualquer um com o endereço /tv vê. Fora disso, exige a chave ?k=.
  const key = event.queryStringParameters?.k;
  if (!config?.public && (!config?.key || !key || key !== config.key)) return json({ error: "Link da TV inválido." }, 401);
  // config.mask = true abrevia o nome dos clientes (ex.: "Humberto R.") pra quando a TV é pública.
  const maskName = (n) => {
    if (!config?.mask) return n;
    const parts = String(n || "").trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || "";
  };

  const [clients, properties, fields, harvests, visits, tasks, avatars, profilesResp] = await Promise.all([
    getBlob(adminClient, "clients", []), getBlob(adminClient, "properties", []), getBlob(adminClient, "fields", []),
    getBlob(adminClient, "harvests", []), getBlob(adminClient, "visits", []), getBlob(adminClient, "tasks", []),
    getBlob(adminClient, "teamAvatars", {}), adminClient.from("profiles").select("id,name,role"),
  ]);

  // Cotações: lidas das tabelas que o painel Nexus já mantém atualizadas (CBOT via Yahoo,
  // Milho B3 via Notícias Agrícolas e dólar à vista). Se faltar algo, a TV só omite o card.
  let cotacoes = null;
  try {
    const { data: rows } = await adminClient.from("nexus_cotacoes").select("codigo,produto,mes,ultima,varr,pct,preco_saca_brl,updated_at").in("codigo", ["ZSX26.CBT", "ZSH27.CBT", "CCM", "USD/BRL"]);
    const { data: dolarRows } = await adminClient.from("nexus_dolar").select("atual,anterior,variacao,ptax_auto,ptax_auto_data,updated_at").eq("id", 1);
    const by = Object.fromEntries((rows || []).map((r) => [r.codigo, r]));
    const num = (v) => (v === null || v === undefined ? null : Number(v));
    const pick = (r) => (r ? { mes: r.mes, ultima: num(r.ultima), pct: num(r.pct), sacaBrl: num(r.preco_saca_brl), updatedAt: r.updated_at } : null);
    const d = dolarRows?.[0];
    cotacoes = {
      sojaNov: pick(by["ZSX26.CBT"]),
      sojaMar: pick(by["ZSH27.CBT"]),
      milhoB3: pick(by["CCM"]),
      dolar: d ? { atual: num(d.atual), anterior: num(d.anterior), variacao: num(d.variacao), ptax: num(d.ptax_auto), ptaxData: d.ptax_auto_data, updatedAt: d.updated_at } : null,
    };
  } catch {
    cotacoes = null;
  }

  const team = (profilesResp.data || [])
    .filter((p) => p.role !== "cliente")
    .map((p) => ({ id: p.id, name: p.name, avatar: avatars?.[p.id] || null }));

  return json({
    generatedAt: new Date().toISOString(),
    cotacoes,
    avisos: Array.isArray(config.avisos) ? config.avisos : [],
    radio: config.radio === false ? null : (config.radio || { name: "Groove Salad (SomaFM)", url: "https://ice2.somafm.com/groovesalad-128-aac" }),
    team,
    clients: clients.map((c) => ({ id: c.id, name: maskName(c.name), gestorId: c.gestorId || null })),
    properties: properties.map((p) => ({ id: p.id, clientId: p.clientId, name: config?.mask ? "" : p.name })),
    fields: fields.map((f) => ({
      id: f.id, propertyId: f.propertyId, name: f.name, area: f.area,
      fieldMap: f.fieldMap ? { mode: f.fieldMap.mode, points: f.fieldMap.points, areaHa: f.fieldMap.areaHa } : null,
    })),
    harvests: harvests.map((h) => ({ id: h.id, fieldId: h.fieldId, culture: h.culture, plantingDate: h.plantingDate, harvestDate: h.harvestDate })),
    visits: visits.map((v) => ({ id: v.id, harvestId: v.harvestId, date: v.date, technician: v.technician })),
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, type: t.type, date: t.date, done: !!t.done, assigneeId: t.assigneeId || null, clientId: t.clientId || null })),
  });
};
