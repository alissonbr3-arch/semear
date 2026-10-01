// Netlify Function: gerar-boleto
//
// Gera (ou reaproveita) um boleto no Asaas pra cobrar um honorário específico
// de Financeiro de um cliente. Cria o cliente no Asaas na primeira vez
// (guarda o id em clients[].asaasCustomerId pra reaproveitar depois) e salva
// o link/status do boleto de volta no lançamento, em finances[].
//
// Precisa de ASAAS_API_KEY configurada em Site settings > Environment
// variables do Netlify (chave de API do Asaas, pode ser a de produção ou a
// de sandbox — nesse caso configure também ASAAS_BASE_URL apontando pra
// https://sandbox.asaas.com/api/v3). Só quem está logado E tem role
// "master" ou "administrador" em profiles pode gerar boleto.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || "https://api.asaas.com/v3";

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function somenteDigitos(s) {
  return String(s || "").replace(/\D/g, "");
}

const FINANCE_TYPE_LABELS_SERVER = {
  mensalidade: "Mensalidade", projeto: "Projeto", analise_solo: "Análise de Solo",
  limite_credito: "Limite de Crédito", outros: "Outros",
};

async function getBlob(adminClient, key, fallback) {
  const { data } = await adminClient.from("agrotrack_data").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}

async function setBlob(adminClient, key, value) {
  await adminClient.from("agrotrack_data").upsert({ key, value, updated_at: new Date().toISOString() });
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ error: "Método não permitido." }, 405);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Configuração do servidor incompleta (variáveis do Supabase ausentes)." }, 500);
  }
  const asaasKey = process.env.ASAAS_API_KEY;
  if (!asaasKey) return json({ error: "ASAAS_API_KEY não configurada nas variáveis de ambiente do Netlify." }, 500);
  const asaasHeaders = { "Content-Type": "application/json", access_token: asaasKey };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return json({ error: "Não autenticado." }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Sessão inválida." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();
  if (profileError || !callerProfile || !["master", "administrador"].includes(callerProfile.role)) {
    return json({ error: "Apenas master/administrador podem gerar boleto." }, 403);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }
  const { financeId } = body;
  if (!financeId) return json({ error: "financeId é obrigatório." }, 400);

  const [clients, finances] = await Promise.all([
    getBlob(adminClient, "clients", []),
    getBlob(adminClient, "finances", []),
  ]);

  const finance = finances.find((f) => f.id === financeId);
  if (!finance) return json({ error: "Honorário não encontrado." }, 404);
  if (finance.status === "pago") return json({ error: "Este honorário já está marcado como pago." }, 400);
  if (!(Number(finance.amount) > 0)) return json({ error: "Este honorário não tem valor definido." }, 400);

  const client = clients.find((c) => c.id === finance.clientId);
  if (!client) return json({ error: "Não encontrei o cliente deste honorário." }, 404);
  const cpfCnpj = somenteDigitos(client.cpfCnpj);
  if (!cpfCnpj) return json({ error: `Cadastre o CPF/CNPJ de ${client.name} antes de gerar o boleto.` }, 400);

  let customerId = client.asaasCustomerId;
  if (!customerId) {
    const custResp = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        name: client.name,
        cpfCnpj,
        email: client.email || undefined,
        mobilePhone: somenteDigitos(client.phone) || undefined,
        externalReference: client.id,
      }),
    });
    const custData = await custResp.json().catch(() => ({}));
    if (!custResp.ok || !custData.id) {
      const msg = custData.errors?.[0]?.description || custData.message || `Asaas retornou ${custResp.status}`;
      return json({ error: `Erro ao cadastrar ${client.name} no Asaas: ${msg}` }, 500);
    }
    customerId = custData.id;
    await setBlob(adminClient, "clients", clients.map((c) => (c.id === client.id ? { ...c, asaasCustomerId: customerId } : c)));
  }

  const dueDate = finance.date && finance.date >= new Date().toISOString().slice(0, 10)
    ? finance.date
    : new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const tipoLabel = FINANCE_TYPE_LABELS_SERVER[finance.type] || finance.type || "Mensalidade";
  const descricao = `${tipoLabel} — ${client.name} — Semear Consultoria Agropecuária`;

  const payResp = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: "POST",
    headers: asaasHeaders,
    body: JSON.stringify({
      customer: customerId,
      billingType: "BOLETO",
      value: Number(finance.amount),
      dueDate,
      description: descricao,
      externalReference: finance.id,
    }),
  });
  const payData = await payResp.json().catch(() => ({}));
  if (!payResp.ok || !payData.id) {
    const msg = payData.errors?.[0]?.description || payData.message || `Asaas retornou ${payResp.status}`;
    return json({ error: `Erro ao gerar o boleto: ${msg}` }, 500);
  }

  await setBlob(adminClient, "finances", finances.map((f) => (
    f.id === finance.id
      ? { ...f, asaasPaymentId: payData.id, asaasBoletoUrl: payData.invoiceUrl, asaasStatus: payData.status, asaasDueDate: payData.dueDate }
      : f
  )));

  return json({ url: payData.invoiceUrl, status: payData.status, dueDate: payData.dueDate });
};
