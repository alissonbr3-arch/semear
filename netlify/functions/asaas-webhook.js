// Netlify Function: asaas-webhook
//
// Recebe o webhook de cobrança e de nota fiscal do Asaas (configurado no
// painel deles, em Integrações > Webhooks) e atualiza Financeiro sozinho:
// - Boleto pago (PAYMENT_RECEIVED/PAYMENT_CONFIRMED): marca o honorário
//   como "pago" — mesmo efeito de editar e trocar o status manualmente.
// - Nota fiscal (INVOICE_*): salva o status/link do PDF da nota assim que
//   ela é sincronizada/autorizada pela prefeitura, ou o erro se falhar.
//
// Protegido pelo token que o Asaas manda no header "asaas-access-token"
// (configure o mesmo valor em ASAAS_WEBHOOK_TOKEN nas variáveis de ambiente
// do Netlify e no campo "Token de Autenticação" do webhook, lá no Asaas —
// use o MESMO webhook pra cobranças e notas fiscais, só marcando os dois
// grupos de eventos na configuração dele no Asaas).
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
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
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const headerToken = event.headers["asaas-access-token"] || event.headers["Asaas-Access-Token"];
  if (!webhookToken || headerToken !== webhookToken) return json({ ok: false }, 401);
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: "Configuração do servidor incompleta." }, 500);

  let evento;
  try {
    evento = JSON.parse(event.body || "{}");
  } catch {
    return json({ ok: true });
  }

  const tipo = evento.event;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  if (tipo && tipo.startsWith("INVOICE_")) {
    const nota = evento.invoice;
    if (!nota?.id) return json({ ok: true, ignorado: true });

    const finances = await getBlob(adminClient, "finances", []);
    const finance = finances.find((f) => f.asaasInvoiceId === nota.id);
    if (!finance) return json({ ok: true, ignorado: true });

    const patch = {
      asaasInvoiceStatus: nota.status,
      asaasInvoicePdfUrl: nota.pdfUrl || finance.asaasInvoicePdfUrl || null,
      asaasInvoiceNumber: nota.number || finance.asaasInvoiceNumber || null,
    };
    await setBlob(adminClient, "finances", finances.map((f) => (f.asaasInvoiceId === nota.id ? { ...f, ...patch } : f)));

    if (tipo === "INVOICE_AUTHORIZED") {
      const clients = await getBlob(adminClient, "clients", []);
      const client = clients.find((c) => c.id === finance.clientId);
      const activityLog = await getBlob(adminClient, "activityLog", []);
      await setBlob(adminClient, "activityLog", [...activityLog, {
        id: uid(), at: new Date().toISOString(), userId: null, userName: "Asaas (webhook)",
        action: "update", entityType: "finance", entityName: client?.name || "(sem nome)",
        details: `Nota fiscal nº ${nota.number || "?"} autorizada · R$ ${Number(finance.amount).toLocaleString("pt-BR")}`,
      }]);
    }

    return json({ ok: true });
  }

  const pagamento = evento.payment;
  if (!pagamento?.id) return json({ ok: true, ignorado: true });

  const finances = await getBlob(adminClient, "finances", []);
  const finance = finances.find((f) => f.asaasPaymentId === pagamento.id);
  if (!finance) return json({ ok: true, ignorado: true });

  const patch = { asaasStatus: pagamento.status };
  if (tipo === "PAYMENT_RECEIVED" || tipo === "PAYMENT_CONFIRMED") {
    patch.status = "pago";
    patch.date = pagamento.paymentDate || pagamento.clientPaymentDate || new Date().toISOString().slice(0, 10);
    patch.reconciledBank = true;
    patch.reconciledAt = new Date().toISOString();
  }

  await setBlob(adminClient, "finances", finances.map((f) => (f.asaasPaymentId === pagamento.id ? { ...f, ...patch } : f)));

  if (patch.status === "pago") {
    const clients = await getBlob(adminClient, "clients", []);
    const client = clients.find((c) => c.id === finance.clientId);
    const activityLog = await getBlob(adminClient, "activityLog", []);
    await setBlob(adminClient, "activityLog", [...activityLog, {
      id: uid(), at: new Date().toISOString(), userId: null, userName: "Asaas (webhook)",
      action: "update", entityType: "finance", entityName: client?.name || "(sem nome)",
      details: `Boleto pago via Asaas · R$ ${Number(finance.amount).toLocaleString("pt-BR")} em ${patch.date}`,
    }]);
  }

  return json({ ok: true });
};
