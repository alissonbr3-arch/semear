// Netlify Function: gerar-nota-fiscal
//
// Emite uma Nota Fiscal de Serviço (NFS-e) via Asaas pra um honorário
// específico de Financeiro. Se o honorário já tiver um boleto Asaas
// (asaasPaymentId), a nota é vinculada a essa cobrança; senão, emite uma
// nota avulsa vinculada ao cliente (cria o cliente no Asaas na primeira vez,
// igual à função gerar-boleto).
//
// Pré-requisitos (feitos uma única vez, por você, direto no painel do
// Asaas — não dá pra automatizar isso aqui porque depende dos dados fiscais
// reais da empresa e de credenciais específicas da prefeitura):
//   1. Configurações > Notas fiscais > habilitar emissão e preencher os
//      dados fiscais da Semear Consultoria (CNAE, regime tributário,
//      inscrição municipal, etc.).
//   2. Cadastrar o serviço municipal no Asaas — a função usa o primeiro
//      serviço da lista dele (alíquota de ISS incluída).
//
// Precisa de ASAAS_API_KEY configurada em Site settings > Environment
// variables do Netlify (mesma chave usada em gerar-boleto). Só quem está
// logado E tem role "master" ou "administrador" em profiles pode emitir.
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
    return json({ error: "Apenas master/administrador podem emitir nota fiscal." }, 403);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }
  const { financeId } = body;
  if (!financeId) return json({ error: "financeId é obrigatório." }, 400);

  const [clients, finances, settings] = await Promise.all([
    getBlob(adminClient, "clients", []),
    getBlob(adminClient, "finances", []),
    getBlob(adminClient, "settings", {}),
  ]);

  // O serviço municipal vem direto do cadastro fiscal do Asaas (Configurações >
  // Notas fiscais). Se existir um override salvo em settings.notaFiscal, ele vence.
  let nf = settings?.notaFiscal || {};
  if (!nf.municipalServiceName || !(nf.municipalServiceId || nf.municipalServiceCode)) {
    const svcResp = await fetch(`${ASAAS_BASE_URL}/invoices/municipalServices?limit=20`, { headers: asaasHeaders });
    const svcData = await svcResp.json().catch(() => ({}));
    const svc = svcData?.data?.[0];
    if (!svcResp.ok || !svc) {
      return json({ error: "Não encontrei nenhum serviço municipal cadastrado no Asaas. Confira em Asaas > Configurações > Notas fiscais." }, 400);
    }
    nf = {
      municipalServiceId: svc.id,
      municipalServiceName: svc.description || svc.name,
      issPercent: svc.issTax ?? svc.iss ?? 0,
      retainIss: false,
    };
  }

  const finance = finances.find((f) => f.id === financeId);
  if (!finance) return json({ error: "Honorário não encontrado." }, 404);
  if (finance.asaasInvoiceId) return json({ error: "Este honorário já tem uma nota fiscal emitida/em andamento." }, 400);
  if (!(Number(finance.amount) > 0)) return json({ error: "Este honorário não tem valor definido." }, 400);

  const client = clients.find((c) => c.id === finance.clientId);
  if (!client) return json({ error: "Não encontrei o cliente deste honorário." }, 404);

  // A prefeitura exige e-mail e endereço completo do tomador — confere antes de
  // chamar o Asaas, pra devolver uma mensagem clara em vez de "Erro na emissão".
  const cep = somenteDigitos(client.postalCode);
  const faltando = [];
  if (!client.email || !String(client.email).includes("@")) faltando.push("e-mail");
  if (cep.length !== 8) faltando.push("CEP");
  if (!client.address) faltando.push("endereço");
  if (!client.addressNumber) faltando.push("número");
  if (!client.province) faltando.push("bairro");
  if (faltando.length) {
    return json({ error: `Complete o cadastro de ${client.name} em Clientes antes de emitir a nota: falta ${faltando.join(", ")}.` }, 400);
  }

  const customerBody = {
    name: client.name,
    email: client.email,
    mobilePhone: somenteDigitos(client.phone) || undefined,
    postalCode: cep,
    address: client.address,
    addressNumber: client.addressNumber,
    complement: client.complement || undefined,
    province: client.province,
    externalReference: client.id,
  };

  let customerId = client.asaasCustomerId;
  if (customerId) {
    // Cliente já existe no Asaas: atualiza com e-mail/endereço atuais.
    const upResp = await fetch(`${ASAAS_BASE_URL}/customers/${customerId}`, {
      method: "PUT",
      headers: asaasHeaders,
      body: JSON.stringify(customerBody),
    });
    if (!upResp.ok) {
      const upData = await upResp.json().catch(() => ({}));
      const msg = upData.errors?.[0]?.description || upData.message || `Asaas retornou ${upResp.status}`;
      return json({ error: `Erro ao atualizar ${client.name} no Asaas: ${msg}` }, 500);
    }
  } else {
    const cpfCnpj = somenteDigitos(client.cpfCnpj);
    if (!cpfCnpj) return json({ error: `Cadastre o CPF/CNPJ de ${client.name} antes de emitir a nota fiscal.` }, 400);
    const custResp = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({ ...customerBody, cpfCnpj }),
    });
    const custData = await custResp.json().catch(() => ({}));
    if (!custResp.ok || !custData.id) {
      const msg = custData.errors?.[0]?.description || custData.message || `Asaas retornou ${custResp.status}`;
      return json({ error: `Erro ao cadastrar ${client.name} no Asaas: ${msg}` }, 500);
    }
    customerId = custData.id;
    await setBlob(adminClient, "clients", clients.map((c) => (c.id === client.id ? { ...c, asaasCustomerId: customerId } : c)));
  }

  const tipoLabel = FINANCE_TYPE_LABELS_SERVER[finance.type] || finance.type || "Mensalidade";
  const descricao = `${tipoLabel} — ${client.name} — Semear Consultoria Agropecuária`;

  const invoicePayload = {
    effectiveDate: new Date().toISOString().slice(0, 10),
    municipalServiceName: nf.municipalServiceName,
    value: Number(finance.amount),
    serviceDescription: descricao,
    taxes: { iss: Number(nf.issPercent || 0), retainIss: !!nf.retainIss },
    ...(nf.municipalServiceId ? { municipalServiceId: nf.municipalServiceId } : { municipalServiceCode: nf.municipalServiceCode }),
    ...(finance.asaasPaymentId ? { payment: finance.asaasPaymentId } : { customer: customerId }),
  };

  const invResp = await fetch(`${ASAAS_BASE_URL}/invoices`, {
    method: "POST",
    headers: asaasHeaders,
    body: JSON.stringify(invoicePayload),
  });
  const invData = await invResp.json().catch(() => ({}));
  if (!invResp.ok || !invData.id) {
    const msg = invData.errors?.[0]?.description || invData.message || `Asaas retornou ${invResp.status}`;
    return json({ error: `Erro ao emitir a nota fiscal: ${msg}` }, 500);
  }

  await setBlob(adminClient, "finances", finances.map((f) => (
    f.id === finance.id
      ? { ...f, asaasInvoiceId: invData.id, asaasInvoiceStatus: invData.status, asaasInvoicePdfUrl: invData.pdfUrl || null }
      : f
  )));

  return json({ id: invData.id, status: invData.status, pdfUrl: invData.pdfUrl || null });
};
