// Cronograma de aplicações de fungicida por talhão (safra).
//
// Cada safra (talhão + cultivar + plantio) vira uma linha do programa:
//   emergência  = informada ou plantio + 5 dias
//   colheita    = colheita real, ou estimada pelo ciclo da cultivar, ou informada
//   1ª aplicação = emergência + "início" (dias)  — ou a data digitada
//   próximas    = anterior + intervalo           — ou a data digitada (as seguintes
//                 continuam contando a partir dela)
//   em aberto   = dias sem cobertura: da última aplicação + intervalo até a colheita
// PDFs: um "cartão" por talhão (pro cliente saber quantas aplicações e quando)
// e uma lista cronológica de todas as aplicações.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const PADRAO_PROGRAMA = { qtde: 4, intervalo: 16, inicio: 30, diasEmergencia: 5 };

export function somaDias(iso, dias) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(dias || 0));
  return d.toISOString().slice(0, 10);
}
export function diasEntreIso(de, ate) {
  if (!de || !ate) return null;
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);
}
export function dataBR(iso) {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
}

// Monta a linha calculada do programa de uma safra.
export function calcularLinha(safra, prog, padrao = PADRAO_PROGRAMA) {
  const p = { ...padrao, ...(prog || {}) };
  const emergencia = p.emergencia || (safra.plantingDate ? somaDias(safra.plantingDate, padrao.diasEmergencia ?? 5) : null);
  const colheita = p.colheita || safra.harvestDate || safra.estimatedHarvestDate || null;
  const qtde = Math.max(0, Math.min(10, Number(p.qtde) || 0));
  const ajustes = p.ajustes || {};
  const datas = [];
  for (let i = 1; i <= qtde; i++) {
    const base = i === 1 ? (emergencia ? somaDias(emergencia, p.inicio) : null) : (datas[i - 2] ? somaDias(datas[i - 2], p.intervalo) : null);
    datas.push(ajustes[i] || base);
  }
  // A última aplicação ainda "cobre" a lavoura pelo intervalo; em aberto (sem
  // cobertura de fungicida) são os dias que sobram até a colheita.
  const ultima = datas[datas.length - 1] || null;
  const fimCobertura = ultima ? somaDias(ultima, p.intervalo) : null;
  const aberto = fimCobertura && colheita ? diasEntreIso(fimCobertura, colheita) : null;
  return {
    safraId: safra.id, codigo: p.codigo || null, cliente: safra.clientName, clientId: safra.clientId, fazenda: safra.propertyName,
    talhao: safra.fieldName, cultivar: safra.variety || "—", cultura: safra.culture, area: safra.fieldArea,
    emergencia, colheita, colheitaEstimada: !p.colheita && !safra.harvestDate && !!safra.estimatedHarvestDate,
    qtde, intervalo: Number(p.intervalo) || 0, inicio: Number(p.inicio) || 0, datas, ajustes, aberto, fimCobertura,
  };
}

// ---------- PDFs no padrão visual Semear ----------
// Cabeçalho creme com o logo, título verde, faixa de seção verde, tabela com
// cabeçalho verde e linhas claras, rodapé com filete dourado e "Página N".
const COR = {
  verde: [27, 77, 46], verde2: [46, 107, 68], dourado: [200, 155, 60], creme: [251, 249, 243],
  borda: [199, 210, 203], zebra: [241, 245, 238], cinza: [110, 110, 104], texto: [34, 34, 34],
};
// Cor de cada aplicação na linha do tempo (1ª verde, 2ª bege, 3ª azul…).
const COR_APLIC = [[225, 238, 226], [251, 235, 199], [230, 233, 245], [246, 227, 224], [227, 241, 245], [238, 232, 245]];

// Fontes do padrão Semear (Poppins nos títulos, Lora no texto), carregadas só
// na hora de gerar o PDF. Sem elas (offline), cai pra Helvetica/Times.
const FONTES = [
  ["Poppins", "bold", "/fonts/Poppins-Bold.ttf"], ["Poppins", "normal", "/fonts/Poppins-Medium.ttf"],
  ["Lora", "normal", "/fonts/Lora-Regular.ttf"], ["Lora", "italic", "/fonts/Lora-Italic.ttf"],
];
let fontesCache = null;
async function carregarFontes() {
  if (fontesCache) return fontesCache;
  try {
    const arquivos = await Promise.all(FONTES.map(async ([, , url]) => {
      const buf = await fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.arrayBuffer(); });
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    }));
    fontesCache = FONTES.map((f, i) => [...f, arquivos[i]]);
  } catch { fontesCache = []; }
  return fontesCache;
}
let F = { tit: "helvetica", txt: "times" };
async function prepararFontes(doc) {
  const fontes = await carregarFontes();
  if (fontes.length !== FONTES.length) { F = { tit: "helvetica", txt: "times" }; return; }
  fontes.forEach(([nome, estilo, url, b64]) => {
    const arq = url.split("/").pop();
    doc.addFileToVFS(arq, b64);
    doc.addFont(arq, nome, estilo);
  });
  F = { tit: "Poppins", txt: "Lora" };
}

let logoCache = null;
async function carregarLogo() {
  if (logoCache) return logoCache;
  try {
    const blob = await fetch("/logo-pdf.png").then((r) => (r.ok ? r.blob() : null));
    if (!blob) return null;
    logoCache = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  } catch { logoCache = null; }
  return logoCache;
}

function cabecalhoSemear(doc, logo, docTitulo, safra) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COR.creme);
  doc.rect(0, 0, W, 24, "F");
  if (logo) doc.addImage(logo, "PNG", 14, 5, 38, 13.4);
  doc.setFont(F.txt, "italic");
  doc.setTextColor(...COR.verde);
  doc.setFontSize(10.5);
  doc.text(docTitulo, W - 15, 11, { align: "right" });
  doc.setFontSize(9);
  if (safra) doc.text(`Safra ${safra}`, W - 15, 16, { align: "right" });
  doc.setFillColor(...COR.dourado);
  doc.rect(0, 23.2, W, 1.1, "F");
  doc.setFillColor(...COR.verde);
  doc.rect(0, 24.3, W, 0.5, "F");
  doc.setTextColor(0);
}
function rodapeSemear(doc) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...COR.dourado);
  doc.setLineWidth(0.35);
  doc.line(15, H - 15, W - 15, H - 15);
  doc.setFont(F.tit, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COR.verde);
  doc.text("Semear Consultoria Agropecuária  |  Uso interno", 15, H - 10.5);
  doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, W - 15, H - 10.5, { align: "right" });
  doc.setTextColor(0);
}
function tituloSemear(doc, titulo, subtitulo) {
  doc.setFont(F.tit, "bold");
  doc.setFontSize(21);
  doc.setTextColor(...COR.verde);
  doc.text(titulo, 15, 38);
  doc.setFont(F.txt, "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(...COR.cinza);
  doc.text(subtitulo, 15, 44.5, { maxWidth: 180 });
  doc.setTextColor(0);
  return 50;
}
function secaoSemear(doc, y, texto) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COR.verde);
  doc.rect(15, y, W - 30, 8.5, "F");
  doc.setFont(F.tit, "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(texto, 18.5, y + 5.9);
  doc.setTextColor(0);
  return y + 10;
}
function notaSemear(doc, y, texto) {
  doc.setFont(F.txt, "italic");
  doc.setFontSize(8.8);
  doc.setTextColor(...COR.cinza);
  const linhas = doc.splitTextToSize(texto, 180);
  doc.text(linhas, 15, y);
  doc.setTextColor(0);
  return y + linhas.length * 4;
}
// Célula "Talhão" com o nome em negrito e a fazenda (e o produtor) embaixo em itálico.
function celulaTalhao(doc, data, l, mostrarProdutor) {
  const { x, y, height } = data.cell;
  const sub = mostrarProdutor ? `${l.fazenda} · ${l.cliente}` : l.fazenda;
  doc.setFont(F.tit, "bold");
  // Nome comprido diminui a fonte até caber na coluna.
  let tam = 9;
  doc.setFontSize(tam);
  while (tam > 6.5 && doc.getTextWidth(String(l.talhao || "—")) > data.cell.width - 4) { tam -= 0.5; doc.setFontSize(tam); }
  doc.setTextColor(...COR.texto);
  doc.text(String(l.talhao || "—"), x + 2, y + height / 2 - 0.6);
  doc.setFont(F.txt, "italic");
  doc.setFontSize(7.8);
  doc.setTextColor(...COR.cinza);
  doc.text(doc.splitTextToSize(String(sub || ""), data.cell.width - 4)[0] || "", x + 2, y + height / 2 + 3.4);
  doc.setTextColor(0);
}
function nomeSafra(linhas) {
  const anos = linhas.map((l) => l.emergencia).filter(Boolean).sort();
  if (!anos.length) return "";
  const d = new Date(`${anos[0]}T12:00:00Z`);
  const ini = d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${ini}/${String(ini + 1).slice(2)}`;
}
function subtituloPadrao(linhas, extra) {
  const clientes = [...new Set(linhas.map((l) => l.cliente))];
  const safra = nomeSafra(linhas);
  return [clientes.length === 1 ? clientes[0] : `${clientes.length} produtores`, safra && `Safra ${safra}`, `Gerado em ${new Date().toLocaleDateString("pt-BR")}`, extra].filter(Boolean).join("  ·  ");
}

// PDF 1: programa por talhão — uma linha por talhão com todas as aplicações.
export async function pdfPorTalhao(linhas, { titulo, nomeArquivo } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await prepararFontes(doc);
  const logo = await carregarLogo();
  const safra = nomeSafra(linhas);
  const variosClientes = new Set(linhas.map((l) => l.cliente)).size > 1;
  const maxQ = Math.max(1, ...linhas.map((l) => l.qtde));
  cabecalhoSemear(doc, logo, "Programa de Fungicidas", safra);
  let y = tituloSemear(doc, "Programa de Fungicidas", subtituloPadrao(linhas, `${linhas.length} talhão(ões)`));
  y = secaoSemear(doc, y, "1 · Aplicações por Talhão");
  const head = [["Talhão", "Cultivar", "Emergência", "Colheita", ...Array.from({ length: maxQ }, (_, i) => `${i + 1}ª Aplic.`), "Em aberto"]];
  const body = linhas.map((l) => [
    "", `${l.cultivar}\n${l.qtde}× · cada ${l.intervalo} dias`, dataBR(l.emergencia), `${dataBR(l.colheita)}${l.colheitaEstimada ? "*" : ""}`,
    ...Array.from({ length: maxQ }, (_, i) => (i < l.qtde && l.datas[i] ? dataBR(l.datas[i]).slice(0, 5) : "—")),
    l.aberto === null ? "—" : `${l.aberto} dias`,
  ]);
  autoTable(doc, {
    startY: y, head, body, theme: "grid",
    margin: { left: 15, right: 15, top: 30, bottom: 22 },
    styles: { font: F.txt, fontSize: 9, textColor: COR.texto, lineColor: COR.borda, lineWidth: 0.2, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 }, valign: "middle", halign: "center", minCellHeight: 11 },
    headStyles: { font: F.tit, fontStyle: "bold", fillColor: COR.verde, textColor: 255, fontSize: 8, halign: "center" },
    alternateRowStyles: { fillColor: COR.zebra },
    columnStyles: { 0: { cellWidth: 34, halign: "left" }, 1: { cellWidth: 31, halign: "left", fontSize: 8 }, 2: { cellWidth: 22, fontSize: 8.6 }, 3: { cellWidth: 26, fontSize: 8.6 } },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === head[0].length - 1) {
        const l = linhas[d.row.index];
        d.cell.styles.fontStyle = "bold";
        if (l.aberto !== null && l.aberto > 25) d.cell.styles.textColor = [168, 112, 20];
        if (l.aberto !== null && l.aberto < 0) d.cell.styles.textColor = [176, 48, 40];
      }
    },
    didDrawCell: (d) => { if (d.section === "body" && d.column.index === 0) celulaTalhao(doc, d, linhas[d.row.index], variosClientes); },
    didDrawPage: () => { cabecalhoSemear(doc, logo, "Programa de Fungicidas", safra); rodapeSemear(doc); },
  });
  let yn = doc.lastAutoTable.finalY + 5;
  yn = notaSemear(doc, yn, "Em aberto = dias sem cobertura de fungicida: da última aplicação mais o intervalo (que ela ainda protege) até a colheita. "
    + (linhas.some((l) => l.colheitaEstimada) ? "* Colheita estimada pelo ciclo da cultivar. " : "")
    + "Datas sujeitas a ajuste conforme clima e condição da lavoura.");
  doc.save(nomeArquivo || "programa-fungicidas-por-talhao.pdf");
}

// PDF 2: linha do tempo — todas as aplicações em ordem de data.
export async function pdfCronologico(linhas, { titulo, nomeArquivo } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await prepararFontes(doc);
  const logo = await carregarLogo();
  const safra = nomeSafra(linhas);
  const variosClientes = new Set(linhas.map((l) => l.cliente)).size > 1;
  const itens = linhas.flatMap((l) => l.datas.map((d, i) => ({ l, n: i + 1, d, ultima: i === l.qtde - 1 }))).filter((x) => x.d)
    .sort((a, b) => a.d.localeCompare(b.d) || String(a.l.talhao).localeCompare(String(b.l.talhao), "pt-BR", { numeric: true }));
  cabecalhoSemear(doc, logo, "Linha do Tempo de Fungicidas", safra);
  let y = tituloSemear(doc, "Linha do Tempo de Aplicações", subtituloPadrao(linhas, `${itens.length} aplicações`));
  y = secaoSemear(doc, y, "1 · Aplicações em Ordem de Data");
  const sem = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const body = itens.map(({ l, n, d, ultima }) => [
    `${dataBR(d).slice(0, 5)}\n${sem[new Date(`${d}T12:00:00Z`).getUTCDay()]}`, "", `${n}ª Aplicação${ultima ? " (última)" : ""}`,
    ultima ? `${l.cultivar} · cobertura até ${dataBR(l.fimCobertura).slice(0, 5)} · colheita ${dataBR(l.colheita).slice(0, 5)}` : `${l.cultivar} · próxima em ${dataBR(l.datas[n]).slice(0, 5)}`,
  ]);
  autoTable(doc, {
    startY: y, head: [["Data", "Talhão", "Evento", "Cultivar / Observação"]], body, theme: "grid",
    margin: { left: 15, right: 15, top: 30, bottom: 22 },
    styles: { font: F.txt, fontSize: 9, textColor: COR.texto, lineColor: COR.borda, lineWidth: 0.2, cellPadding: { top: 2, bottom: 2, left: 2.2, right: 2.2 }, valign: "middle", minCellHeight: 10.5 },
    headStyles: { font: F.tit, fontStyle: "bold", fillColor: COR.verde, textColor: 255, fontSize: 9, halign: "center" },
    columnStyles: { 0: { cellWidth: 18, halign: "center", font: F.tit, fontStyle: "bold" }, 1: { cellWidth: 44 }, 2: { cellWidth: 38 } },
    didParseCell: (d) => {
      if (d.section !== "body") return;
      d.cell.styles.fillColor = COR_APLIC[(itens[d.row.index].n - 1) % COR_APLIC.length];
    },
    didDrawCell: (d) => { if (d.section === "body" && d.column.index === 1) celulaTalhao(doc, d, itens[d.row.index].l, variosClientes); },
    didDrawPage: () => { cabecalhoSemear(doc, logo, "Linha do Tempo de Fungicidas", safra); rodapeSemear(doc); },
  });
  // Legenda das cores (1ª, 2ª, 3ª… aplicação).
  let yl = doc.lastAutoTable.finalY + 6;
  const maxN = Math.max(1, ...itens.map((x) => x.n));
  if (yl > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); cabecalhoSemear(doc, logo, "Linha do Tempo de Fungicidas", safra); rodapeSemear(doc); yl = 34; }
  let xl = 15;
  for (let i = 0; i < maxN; i++) {
    doc.setFillColor(...COR_APLIC[i % COR_APLIC.length]);
    doc.setDrawColor(...COR.verde2);
    doc.setLineWidth(0.25);
    doc.rect(xl, yl - 3.3, 8, 4.2, "FD");
    doc.setFont(F.txt, "normal");
    doc.setFontSize(8.8);
    doc.text(`${i + 1}ª aplicação`, xl + 10, yl);
    xl += 34;
  }
  notaSemear(doc, yl + 7, "Datas previstas a partir da emergência, do intervalo entre aplicações e do ciclo da cultivar — sujeitas a ajuste conforme clima e condição da lavoura.");
  doc.save(nomeArquivo || "linha-do-tempo-fungicidas.pdf");
}
