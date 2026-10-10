// Mensagens automáticas de acompanhamento dos gestores (WhatsApp/Z-API):
//   - cobrança semanal: lista dos projetos em aberto de cada gestor
//   - resumo diário: agenda do dia, clientes sem visita e projetos que pedem atenção
//   - pendência do cliente: cobra o produtor quando o projeto está parado esperando ele
// Regras (etapas, dias parado, semáforo de visita) em shared/gestores.js.
// modo "teste" manda tudo pro número de teste com aviso de quem receberia;
// "ativa" manda pro destinatário de verdade.
import { TEST_PHONE, formatarTelefone, enviarTexto } from "./whatsapp.js";
import {
  STATUS_ABERTO, PARADO_PADRAO, VISITA_INTERVALO_PADRAO, emAberto, etapaAtual, diasParado,
  ultimaVisitaPorCliente, semaforoVisita, addDiasIso, hojeMS,
} from "../../shared/gestores.js";

const ASSINATURA = "Semear Consultoria Agropecuária";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function primeiroNome(nome) {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}
function dataBR(iso) {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}
function dataCurta(iso) {
  const [, m, d] = String(iso || "").slice(0, 10).split("-");
  return m && d ? `${d}/${m}` : "";
}
const nomeCliente = (clients, id) => (clients.find((c) => c.id === id) || {}).name || "—";

function linhaProjeto(s, clients, hoje, paradoDias) {
  const etapa = etapaAtual(s);
  const parado = diasParado(s, hoje);
  const partes = [etapa ? `etapa: ${etapa.label}${etapa.cliente ? " (aguardando o cliente)" : ""}` : STATUS_ABERTO[s.status]];
  if (parado >= paradoDias) partes.push(`parado há ${parado} dias`);
  if (s.vencimento) partes.push(`prazo ${dataBR(s.vencimento)}${s.vencimento < hoje ? " ⚠️ atrasado" : ""}`);
  return `*${s.tipo || "Serviço"}*${s.codigo ? ` (${s.codigo})` : ""} — ${nomeCliente(clients, s.clientId)}\n   ${partes.join(" · ")}`;
}

async function carregar(adminClient, getBlob) {
  const [services, clients, settings, profilesRes] = await Promise.all([
    getBlob(adminClient, "services", []), getBlob(adminClient, "clients", []), getBlob(adminClient, "settings", {}),
    adminClient.from("profiles").select("id,name,phone,role"),
  ]);
  return { services, clients, settings, profiles: (profilesRes.data || []).filter((p) => p.role !== "cliente") };
}

async function enviarPara(modo, pessoa, texto, falhas) {
  const phone = formatarTelefone(pessoa.phone);
  let destino = phone;
  if (modo === "teste") {
    destino = TEST_PHONE;
    texto = `[TESTE — iria para ${pessoa.name} (${phone || "sem telefone"})]\n\n${texto}`;
  } else if (!phone) {
    falhas.push(`${pessoa.name}: sem telefone válido no cadastro`);
    return false;
  }
  const r = await enviarTexto(destino, texto);
  if (!r.ok) { falhas.push(`${pessoa.name}: ${r.error}`); return false; }
  await sleep(1500);
  return true;
}

// ---------- cobrança semanal ----------
export function projetosEmAberto(services) {
  return (services || []).filter((s) => emAberto(s) && s.gestorId);
}

export function msgCobrancaGestor(gestor, itens, clients, hoje, paradoDias = PARADO_PADRAO) {
  const linhas = itens
    .slice()
    .sort((a, b) => diasParado(b, hoje) - diasParado(a, hoje))
    .map((s, i) => `${i + 1}. ${linhaProjeto(s, clients, hoje, paradoDias)}`);
  return `Bom dia, ${primeiroNome(gestor.name)}! 📋\n\nSeus projetos em aberto no Semear (${itens.length}):\n\n${linhas.join("\n\n")}\n\nQuando algum avançar, marque a etapa no Semear (menu Minha carteira). Boa semana!\n${ASSINATURA}`;
}

export async function enviarCobrancaGestores(adminClient, getBlob, modo) {
  const { services, clients, settings, profiles } = await carregar(adminClient, getBlob);
  const hoje = hojeMS();
  const paradoDias = Number(settings.paradoDias) || PARADO_PADRAO;
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
    if (await enviarPara(modo, gestor, msgCobrancaGestor(gestor, itens, clients, hoje, paradoDias), falhas)) enviados++;
  }
  return { modo, gestores: porGestor.size, enviados, falhas };
}

// ---------- resumo diário ----------
export function montarResumoDiario(gestor, dados, hoje) {
  const { tasks, clients, services, ultimaVisita, settings } = dados;
  const intervalo = Number(settings.visitaIntervaloDias) || VISITA_INTERVALO_PADRAO;
  const paradoDias = Number(settings.paradoDias) || PARADO_PADRAO;
  const minhas = (tasks || []).filter((t) => t.assigneeId === gestor.id && !t.done);
  const deHoje = minhas.filter((t) => t.date === hoje).sort((a, b) => String(a.time || "99").localeCompare(String(b.time || "99")));
  const atrasadas = minhas.filter((t) => t.date && t.date < hoje).sort((a, b) => a.date.localeCompare(b.date));
  const semVisita = clients
    .filter((c) => c.gestorId === gestor.id)
    .map((c) => ({ c, s: semaforoVisita(ultimaVisita[c.id], hoje, intervalo) }))
    .filter((x) => x.s.cor === "vermelho");
  const daqui7 = addDiasIso(hoje, 7);
  const projetos = projetosEmAberto(services)
    .filter((s) => s.gestorId === gestor.id)
    .filter((s) => (s.vencimento && s.vencimento <= daqui7) || diasParado(s, hoje) >= paradoDias);

  const blocos = [];
  const fmtTask = (t) => `• ${t.time ? `${t.time} ` : ""}${t.type === "visita" ? "Visita" : "Tarefa"}: ${t.title}${t.clientId ? ` — ${nomeCliente(clients, t.clientId)}` : ""}`;
  if (deHoje.length) blocos.push(`📅 *Agenda de hoje* (${deHoje.length})\n${deHoje.map(fmtTask).join("\n")}`);
  if (atrasadas.length) blocos.push(`⏰ *Atrasados na agenda* (${atrasadas.length})\n${atrasadas.slice(0, 8).map((t) => `${fmtTask(t)} (${dataCurta(t.date)})`).join("\n")}${atrasadas.length > 8 ? `\n…e mais ${atrasadas.length - 8}` : ""}`);
  if (semVisita.length) blocos.push(`🔴 *Clientes sem visita há mais de ${intervalo} dias* (${semVisita.length})\n${semVisita.slice(0, 10).map((x) => `• ${x.c.name} — ${x.s.diasSem === null ? "nunca visitado" : `última há ${x.s.diasSem} dias`}`).join("\n")}${semVisita.length > 10 ? `\n…e mais ${semVisita.length - 10}` : ""}`);
  if (projetos.length) blocos.push(`📌 *Projetos que pedem atenção* (${projetos.length})\n${projetos.map((s) => `• ${linhaProjeto(s, clients, hoje, paradoDias)}`).join("\n")}`);
  if (!blocos.length) return null;
  const [y, m, d] = hoje.split("-").map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" });
  return `Bom dia, ${primeiroNome(gestor.name)}! ☀️\nSeu dia — ${dia}\n\n${blocos.join("\n\n")}\n\n${ASSINATURA}`;
}

export async function enviarResumoDiario(adminClient, getBlob, modo) {
  const base = await carregar(adminClient, getBlob);
  const [tasks, visits, harvests, fields, properties] = await Promise.all([
    getBlob(adminClient, "tasks", []), getBlob(adminClient, "visits", []), getBlob(adminClient, "harvests", []),
    getBlob(adminClient, "fields", []), getBlob(adminClient, "properties", []),
  ]);
  const dados = { ...base, tasks, ultimaVisita: ultimaVisitaPorCliente({ visits, harvests, fields, properties }) };
  const hoje = hojeMS();
  let enviados = 0, comConteudo = 0;
  const falhas = [];
  for (const gestor of base.profiles) {
    const texto = montarResumoDiario(gestor, dados, hoje);
    if (!texto) continue;
    comConteudo++;
    if (await enviarPara(modo, gestor, texto, falhas)) enviados++;
  }
  return { modo, gestores: comConteudo, enviados, falhas };
}

// ---------- pendência do cliente ----------
// Projeto parado numa etapa que depende do produtor ("Documentos do cliente")
// e com o campo "O que falta" preenchido: cobra o cliente, no máximo 1x a cada 7 dias.
export function pendenciasDeCliente(services, hoje) {
  return (services || []).filter((s) => {
    const etapa = etapaAtual(s);
    if (!emAberto(s) || !etapa?.cliente || !String(s.pendenciaCliente || "").trim()) return false;
    const ultima = (s.pendenciaCobradaEm || []).slice(-1)[0];
    return !ultima || addDiasIso(String(ultima).slice(0, 10), 7) <= hoje;
  });
}

export function msgPendenciaCliente(s, client, gestor) {
  const contato = gestor ? `${gestor.name}${gestor.phone ? ` (${gestor.phone})` : ""}` : "nossa equipe";
  return `Olá, ${primeiroNome(client.name)}! Tudo bem?\n\nPara darmos andamento ao seu *${s.tipo || "projeto"}*, ainda precisamos de:\n\n${String(s.pendenciaCliente).trim()}\n\nPode enviar para ${contato} ou responder por aqui. Obrigado!\n${ASSINATURA}`;
}

export async function enviarPendenciaCliente(adminClient, getBlob, setBlob, modo, { serviceId = null } = {}) {
  const { services, clients, profiles } = await carregar(adminClient, getBlob);
  const hoje = hojeMS();
  const alvos = serviceId ? services.filter((s) => s.id === serviceId) : pendenciasDeCliente(services, hoje);
  let enviados = 0;
  const falhas = [];
  const cobrados = new Set();
  for (const s of alvos) {
    const client = clients.find((c) => c.id === s.clientId);
    if (!client) { falhas.push(`Serviço ${s.codigo || s.id}: cliente não encontrado`); continue; }
    if (!String(s.pendenciaCliente || "").trim()) { falhas.push(`${client.name}: preencha "O que falta" no serviço`); continue; }
    const gestor = profiles.find((p) => p.id === s.gestorId);
    if (await enviarPara(modo, client, msgPendenciaCliente(s, client, gestor), falhas)) {
      enviados++;
      if (modo === "ativa") cobrados.add(s.id);
    }
  }
  if (cobrados.size) {
    // Relê antes de gravar, pra não atropelar alterações feitas durante o envio.
    const atuais = await getBlob(adminClient, "services", []);
    const at = new Date().toISOString();
    await setBlob(adminClient, "services", atuais.map((s) => (cobrados.has(s.id) ? { ...s, pendenciaCobradaEm: [...(s.pendenciaCobradaEm || []), at] } : s)));
  }
  return { modo, alvos: alvos.length, enviados, falhas };
}
