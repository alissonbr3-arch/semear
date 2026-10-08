// Helpers de WhatsApp (Z-API) compartilhados pelas funções do Netlify.
// Credenciais: ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN (Netlify > Environment variables).

// Número de teste da Semear: usado pelo botão "Enviar teste" e pelo modo "Teste" da cobrança automática.
export const TEST_PHONE = "5567999693705";

export function somenteDigitos(s) {
  return String(s || "").replace(/\D/g, "");
}

export function formatarTelefone(telefone) {
  const d = somenteDigitos(telefone);
  if (d.startsWith("55") && d.length >= 12) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return null;
}

export async function enviarTexto(phone, message) {
  const { ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN } = process.env;
  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) {
    return { ok: false, error: "Z-API não configurada (faltam ZAPI_INSTANCE_ID, ZAPI_TOKEN ou ZAPI_CLIENT_TOKEN no Netlify)." };
  }
  try {
    const resp = await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
      body: JSON.stringify({ phone, message }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: data.message || data.error || `Z-API retornou ${resp.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

const ASSINATURA = "Semear Consultoria Agropecuária";

function primeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}
function moeda(n) {
  return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(iso) {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}
const TIPOS = {
  mensalidade: "Mensalidade", projeto: "Projeto", analise_solo: "Análise de Solo",
  limite_credito: "Limite de Crédito", outros: "Outros",
};
function tipoLabel(f) {
  return TIPOS[f.type] || f.type || "Honorário";
}

export function msgBoleto(finance, client) {
  return `Olá, ${primeiroNome(client.name)}! Tudo bem?\n\nSegue o boleto referente a *${tipoLabel(finance)}* — ${moeda(finance.amount)}` +
    (finance.asaasDueDate ? `, com vencimento em ${dataBR(finance.asaasDueDate)}` : "") +
    `:\n${finance.asaasBoletoUrl}\n\nQualquer dúvida, é só chamar.\n${ASSINATURA}`;
}

export function msgNota(finance, client) {
  return `Olá, ${primeiroNome(client.name)}! Tudo bem?\n\nSegue a nota fiscal${finance.asaasInvoiceNumber ? ` nº ${finance.asaasInvoiceNumber}` : ""} referente a *${tipoLabel(finance)}* — ${moeda(finance.amount)}:\n${finance.asaasInvoicePdfUrl}\n\n${ASSINATURA}`;
}

// tipo: "antes" (3 dias antes), "hoje", "atraso3", "atraso7"
export function msgLembrete(tipo, finance, client) {
  const base = `*${tipoLabel(finance)}* — ${moeda(finance.amount)} (vencimento ${dataBR(finance.asaasDueDate)})`;
  const link = `\n${finance.asaasBoletoUrl}`;
  const fim = `\n\nSe já pagou, desconsidere esta mensagem.\n${ASSINATURA}`;
  const oi = `Olá, ${primeiroNome(client.name)}! Tudo bem?\n\n`;
  if (tipo === "antes") return `${oi}Passando pra lembrar que o boleto de ${base} vence em 3 dias:${link}${fim}`;
  if (tipo === "hoje") return `${oi}O boleto de ${base} vence hoje:${link}${fim}`;
  if (tipo === "atraso3") return `${oi}Não identificamos o pagamento do boleto de ${base}. Segue o link pra consultar/pagar:${link}${fim}`;
  return `${oi}O boleto de ${base} segue em aberto. Se precisar de uma nova data ou tiver qualquer dúvida, é só responder esta mensagem:${link}${fim}`;
}

export function msgVisita(visit, ctx) {
  const linhas = [`Olá, ${primeiroNome(ctx.client.name)}! Tudo bem?`, "", `Segue o resumo da visita técnica de ${dataBR(visit.date)}:`, ""];
  linhas.push(`📍 ${[ctx.property?.name, ctx.field?.name].filter(Boolean).join(" · ")}`);
  if (ctx.harvest?.culture) linhas.push(`🌱 Cultura: ${ctx.harvest.culture}${visit.stage ? ` — ${visit.stage}` : ""}`);
  if (visit.technician) linhas.push(`👨‍🌾 Técnico: ${visit.technician}`);
  if (visit.pests) linhas.push("", `🐛 *Pragas/doenças:*\n${visit.pests}`);
  if (visit.recommendations) linhas.push("", `✅ *Recomendações:*\n${visit.recommendations}`);
  linhas.push("", ASSINATURA);
  return linhas.join("\n");
}

export function msgAgenda(task, client, assigneeName) {
  const dia = new Date(`${task.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  return `Olá, ${primeiroNome(client.name)}! Tudo bem?\n\nConfirmando a visita técnica: *${dia}*${assigneeName ? `, com ${assigneeName}` : ""}.${task.notes ? `\n\n${task.notes}` : ""}\n\nSe precisar remarcar, é só responder esta mensagem.\n${ASSINATURA}`;
}
