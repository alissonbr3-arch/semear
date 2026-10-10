// Regras de acompanhamento dos gestores, usadas pelo app (Painel dos
// Gestores, Serviços) e pelas mensagens automáticas de WhatsApp (funções do
// Netlify). Tudo aqui é função pura sobre os dados do agrotrack_data.

export const STATUS_ABERTO = { negociacao: "Em negociação", andamento: "Em andamento" };
export const VISITA_INTERVALO_PADRAO = 30; // dias entre visitas a um cliente
export const PARADO_PADRAO = 15; // dias na mesma etapa = projeto parado

// Etapas padrão por tipo de serviço avulso. "cliente: true" = etapa que
// depende do produtor (o app pode cobrar ele direto no WhatsApp).
export function etapasPadrao(tipo) {
  const t = String(tipo || "").toLowerCase();
  if (t.includes("solo")) {
    return ["Coleta das amostras", "No laboratório", "Laudo e recomendação entregues"].map((label) => ({ label }));
  }
  if (t.includes("projeto") || t.includes("limite") || t.includes("crédito") || t.includes("credito")) {
    return [
      { label: "Documentos do cliente", cliente: true },
      { label: "Elaboração" },
      { label: "Protocolo no banco" },
      { label: "Análise do banco" },
      { label: "Aprovado" },
      { label: "Crédito liberado" },
    ];
  }
  return [{ label: "Em execução" }, { label: "Entregue" }];
}

export function novasEtapas(tipo, uidFn) {
  return etapasPadrao(tipo).map((e) => ({ id: uidFn(), label: e.label, cliente: !!e.cliente, doneAt: null }));
}

// Serviço avulso (projeto, análise, limite…) ainda não finalizado. Os
// recorrentes (assistência técnica mensal/anual) ficam de fora.
export function ehAvulso(s) {
  return (s.periodicidade || "unica") === "unica";
}
export function emAberto(s) {
  return !!STATUS_ABERTO[s.status] && ehAvulso(s);
}

export function etapaAtual(s) {
  return (s.etapas || []).find((e) => !e.doneAt) || null;
}

// Desde quando o projeto está na etapa atual (ou, sem etapas, no status atual).
export function desdeQuando(s) {
  const etapas = s.etapas || [];
  const atual = etapaAtual(s);
  if (atual) {
    const idx = etapas.indexOf(atual);
    const anterior = idx > 0 ? etapas[idx - 1].doneAt : null;
    if (anterior) return String(anterior).slice(0, 10);
  }
  return String(s.statusChangedAt || s.createdAt || (s.competencia ? `${s.competencia}-01` : "") || "").slice(0, 10) || null;
}

export function diasEntre(deIso, ateIso) {
  if (!deIso || !ateIso) return 0;
  return Math.max(0, Math.round((Date.parse(`${ateIso}T00:00:00Z`) - Date.parse(`${String(deIso).slice(0, 10)}T00:00:00Z`)) / 86400000));
}

export function diasParado(s, hoje) {
  return diasEntre(desdeQuando(s), hoje);
}

export function addDiasIso(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Última visita por cliente: visita → safra → talhão → propriedade → cliente.
export function ultimaVisitaPorCliente({ visits, harvests, fields, properties }) {
  const harvestField = new Map((harvests || []).map((h) => [h.id, h.fieldId]));
  const fieldProp = new Map((fields || []).map((f) => [f.id, f.propertyId]));
  const propClient = new Map((properties || []).map((p) => [p.id, p.clientId]));
  const ult = {};
  (visits || []).forEach((v) => {
    const clientId = propClient.get(fieldProp.get(harvestField.get(v.harvestId)));
    if (!clientId || !v.date) return;
    if (!ult[clientId] || v.date > ult[clientId]) ult[clientId] = v.date;
  });
  return ult;
}

// Semáforo de visita do cliente: verde = em dia; amarelo = vence nos
// próximos 7 dias; vermelho = atrasada ou nunca visitado.
export function semaforoVisita(ultimaVisita, hoje, intervalo = VISITA_INTERVALO_PADRAO) {
  if (!ultimaVisita) return { cor: "vermelho", vence: null, diasSem: null };
  const vence = addDiasIso(ultimaVisita, Number(intervalo) || VISITA_INTERVALO_PADRAO);
  const diasSem = diasEntre(ultimaVisita, hoje);
  if (vence < hoje) return { cor: "vermelho", vence, diasSem };
  if (vence <= addDiasIso(hoje, 7)) return { cor: "amarelo", vence, diasSem };
  return { cor: "verde", vence, diasSem };
}

export function hojeMS() {
  return new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10);
}
