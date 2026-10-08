// Netlify Function: enviar-whatsapp
//
// Envia mensagens de WhatsApp (Z-API, número da Semear) a pedido de quem está
// logado no app. kinds:
//   boleto  { financeId }  → link do boleto Asaas pro cliente
//   nota    { financeId }  → link do PDF da nota fiscal pro cliente
//   visita  { visitId }    → resumo da visita técnica pro cliente
//   agenda  { taskId }     → confirmação de visita agendada pro cliente
//   teste                  → mensagem de teste só pro número de teste da Semear
// Qualquer usuário da equipe (role diferente de "cliente") pode enviar.
import { createClient } from "@supabase/supabase-js";
import { TEST_PHONE, formatarTelefone, enviarTexto, msgBoleto, msgNota, msgVisita, msgAgenda } from "../lib/whatsapp.js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
async function getBlob(adminClient, key, fallback) {
  const { data } = await adminClient.from("agrotrack_data").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}
async function setBlob(adminClient, key, value) {
  await adminClient.from("agrotrack_data").upsert({ key, value, updated_at: new Date().toISOString() });
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ error: "Método não permitido." }, 405);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Configuração do servidor incompleta." }, 500);

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return json({ error: "Não autenticado." }, 401);
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Sessão inválida." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile } = await adminClient.from("profiles").select("role,name").eq("id", caller.id).single();
  if (!profile || profile.role === "cliente") return json({ error: "Sem permissão." }, 403);

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json({ error: "Corpo da requisição inválido." }, 400); }
  const { kind } = body;

  if (kind === "teste") {
    const r = await enviarTexto(TEST_PHONE, "✅ Teste do Semear: o WhatsApp está conectado e funcionando.\n\nSemear Consultoria Agropecuária");
    if (!r.ok) return json({ error: r.error }, 500);
    return json({ ok: true, para: TEST_PHONE });
  }

  const clients = await getBlob(adminClient, "clients", []);
  let message, client, patchFinanceId = null, patchField = null;

  if (kind === "boleto" || kind === "nota") {
    const finances = await getBlob(adminClient, "finances", []);
    const finance = finances.find((f) => f.id === body.financeId);
    if (!finance) return json({ error: "Honorário não encontrado." }, 404);
    client = clients.find((c) => c.id === finance.clientId);
    if (!client) return json({ error: "Cliente não encontrado." }, 404);
    if (kind === "boleto") {
      if (!finance.asaasBoletoUrl) return json({ error: "Este honorário ainda não tem boleto gerado." }, 400);
      message = msgBoleto(finance, client);
      patchField = "whatsappBoletoEnviadoAt";
    } else {
      if (!finance.asaasInvoicePdfUrl) return json({ error: "A nota fiscal ainda não foi autorizada (sem PDF)." }, 400);
      message = msgNota(finance, client);
      patchField = "whatsappNotaEnviadaAt";
    }
    patchFinanceId = finance.id;
  } else if (kind === "visita") {
    const [visits, harvests, fields, properties] = await Promise.all([
      getBlob(adminClient, "visits", []), getBlob(adminClient, "harvests", []),
      getBlob(adminClient, "fields", []), getBlob(adminClient, "properties", []),
    ]);
    const visit = visits.find((v) => v.id === body.visitId);
    if (!visit) return json({ error: "Visita não encontrada." }, 404);
    const harvest = harvests.find((h) => h.id === visit.harvestId);
    const field = harvest ? fields.find((f) => f.id === harvest.fieldId) : null;
    const property = field ? properties.find((p) => p.id === field.propertyId) : null;
    client = property ? clients.find((c) => c.id === property.clientId) : null;
    if (!client) return json({ error: "Não achei o cliente desta visita." }, 404);
    message = msgVisita(visit, { client, harvest, field, property });
  } else if (kind === "agenda") {
    const [tasks, profiles] = await Promise.all([getBlob(adminClient, "tasks", []), adminClient.from("profiles").select("id,name")]);
    const task = tasks.find((t) => t.id === body.taskId);
    if (!task) return json({ error: "Item da agenda não encontrado." }, 404);
    client = clients.find((c) => c.id === task.clientId);
    if (!client) return json({ error: "Vincule um cliente a este item da agenda primeiro." }, 400);
    const assignee = (profiles.data || []).find((p) => p.id === task.assigneeId);
    message = msgAgenda(task, client, assignee?.name);
  } else {
    return json({ error: "Tipo de envio inválido." }, 400);
  }

  const phone = formatarTelefone(client.phone);
  if (!phone) return json({ error: `${client.name} não tem um telefone válido cadastrado (com DDD).` }, 400);

  const r = await enviarTexto(phone, message);
  if (!r.ok) return json({ error: `Falha ao enviar WhatsApp: ${r.error}` }, 500);

  const at = new Date().toISOString();
  if (patchFinanceId) {
    const finances = await getBlob(adminClient, "finances", []);
    await setBlob(adminClient, "finances", finances.map((f) => (f.id === patchFinanceId ? { ...f, [patchField]: at } : f)));
  }
  const log = await getBlob(adminClient, "activityLog", []);
  await setBlob(adminClient, "activityLog", [...log, {
    id: uid(), at, userId: caller.id, userName: profile.name || "Equipe",
    action: "update", entityType: kind === "visita" ? "visit" : kind === "agenda" ? "task" : "finance",
    entityName: client.name, details: `WhatsApp enviado (${kind}) para ${phone}`,
  }]);

  return json({ ok: true, para: phone, at });
};
