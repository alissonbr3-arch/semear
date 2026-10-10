// Cobrança semanal dos gestores: cada gestor recebe no WhatsApp a lista dos
// projetos/serviços avulsos que estão no nome dele e ainda não foram
// finalizados (status "Em negociação" ou "Em andamento").
// Usado pela função agendada (toda segunda) e pelo botão "Enviar teste".
import { TEST_PHONE, formatarTelefone, enviarTexto } from "./whatsapp.js";

const STATUS_ABERTO = { negociacao: "Em negociação", andamento: "Em andamento" };

function primeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}
function dataBR(iso) {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Serviços avulsos (projeto, análise, limite de crédito…) em aberto. Os
// recorrentes (assistência técnica mensal/anual) ficam de fora — ficam "em
// andamento" o ano todo e virariam cobrança toda semana.
export function projetosEmAberto(services) {
  return (services || []).filter((s) => STATUS_ABERTO[s.status] && s.gestorId && (s.periodicidade || "unica") === "unica");
}

export function msgCobrancaGestor(gestor, itens, clients, hoje) {
  const linhas = itens
    .slice()
    .sort((a, b) => String(a.vencimento || "9999").localeCompare(String(b.vencimento || "9999")))
    .map((s, i) => {
      const cliente = (clients.find((c) => c.id === s.clientId) || {}).name || "—";
      const atrasado = s.vencimento && s.vencimento < hoje;
      const venc = s.vencimento ? ` · prazo ${dataBR(s.vencimento)}${atrasado ? " ⚠️ atrasado" : ""}` : "";
      return `${i + 1}. *${s.tipo || "Serviço"}*${s.codigo ? ` (${s.codigo})` : ""} — ${cliente}\n   ${STATUS_ABERTO[s.status]}${venc}`;
    });
  return `Bom dia, ${primeiroNome(gestor.name)}! 📋\n\nSeus projetos em aberto no Semear (${itens.length}):\n\n${linhas.join("\n\n")}\n\nQuando algum avançar, atualize o status em Serviços. Boa semana!\nSemear Consultoria Agropecuária`;
}

// modo: "teste" manda tudo pro número de teste (com aviso de quem receberia);
// "ativa" manda pra cada gestor.
export async function enviarCobrancaGestores(adminClient, getBlob, modo) {
  const [services, clients, profilesRes] = await Promise.all([
    getBlob(adminClient, "services", []),
    getBlob(adminClient, "clients", []),
    adminClient.from("profiles").select("id,name,phone,role"),
  ]);
  const profiles = profilesRes.data || [];
  const hoje = new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10);
  const porGestor = new Map();
  projetosEmAberto(services).forEach((s) => {
    if (!porGestor.has(s.gestorId)) porGestor.set(s.gestorId, []);
    porGestor.get(s.gestorId).push(s);
  });

  let enviados = 0;
  const falhas = [];
  for (const [gestorId, itens] of porGestor) {
    const gestor = profiles.find((p) => p.id === gestorId);
    if (!gestor) { falhas.push(`Gestor ${gestorId} não encontrado`); continue; }
    const phone = formatarTelefone(gestor.phone);
    let texto = msgCobrancaGestor(gestor, itens, clients, hoje);
    let destino = phone;
    if (modo === "teste") {
      destino = TEST_PHONE;
      texto = `[TESTE — iria para ${gestor.name} (${phone || "sem telefone"})]\n\n${texto}`;
    } else if (!phone) {
      falhas.push(`${gestor.name}: sem telefone válido no cadastro da equipe`);
      continue;
    }
    const r = await enviarTexto(destino, texto);
    if (!r.ok) { falhas.push(`${gestor.name}: ${r.error}`); continue; }
    enviados++;
    await sleep(1500);
  }
  return { modo, gestores: porGestor.size, enviados, falhas };
}
