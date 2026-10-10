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

const VERDE = [[226, 234, 207], [240, 244, 230]];
const AZUL = [[196, 214, 234], [222, 232, 243]];

function rodape(doc, empresa) {
  const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80);
  (empresa || ["Semear Consultoria Agropecuária"]).forEach((l, i, arr) => doc.text(l, w / 2, h - 8 - (arr.length - 1 - i) * 3.6, { align: "center" }));
  doc.setTextColor(0);
}
function cabecalho(doc, titulo) {
  const w = doc.internal.pageSize.getWidth();
  const agora = new Date();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(40);
  doc.text(String(titulo || "").toUpperCase(), 10, 9);
  doc.text(`${agora.toLocaleDateString("pt-BR")}  |  ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, w - 10, 9, { align: "right" });
  doc.setTextColor(0);
}

// PDF 1: um bloco por talhão (produtor, fazenda, talhão, cultivar, emergência,
// colheita) com a lista de aplicações e datas à direita — cores alternadas.
export function pdfPorTalhao(linhas, { titulo, empresa, nomeArquivo } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const x0 = 10, xCod = x0 + 6, xEsq = xCod, wEsq = 112, xRot = xEsq + wEsq, wRot = 36, xData = xRot + wRot, wData = W - 10 - xData;
  const linhaH = 9.5;
  let y = 13;
  cabecalho(doc, titulo);
  linhas.forEach((l, idx) => {
    const n = Math.max(l.qtde, 1);
    const altura = Math.max(n, 4) * linhaH;
    if (y + altura > H - 22) { rodape(doc, empresa); doc.addPage(); cabecalho(doc, titulo); y = 13; }
    const [forte, fraco] = idx % 2 === 0 ? VERDE : AZUL;
    // Fundo do bloco e coluna do código
    doc.setFillColor(...fraco);
    doc.rect(x0, y, W - 20, altura, "F");
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(x0, y, W - 20, altura, "S");
    doc.setLineWidth(0.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    String(l.codigo || idx + 1).split("").forEach((ch, i, arr) => doc.text(ch, x0 + 3, y + altura / 2 - ((arr.length - 1) * 3) / 2 + i * 3, { align: "center", baseline: "middle" }));

    // Lado esquerdo: 2 linhas de rótulo/valor, talhão e cultivar.
    const meio = xEsq + wEsq / 2, q = altura / 4;
    const rot = (txt, x, yy) => { doc.setFont("helvetica", "bold"); doc.setFontSize(6.3); doc.text(txt, x, yy, { align: "center" }); };
    const val = (txt, x, yy, tam = 8.5) => { doc.setFont("helvetica", "normal"); doc.setFontSize(tam); doc.text(String(txt || "—").toUpperCase(), x, yy, { align: "center", maxWidth: wEsq / 2 - 4 }); };
    doc.line(xEsq, y + q / 2, xRot, y + q / 2);
    doc.line(xEsq, y + q, xRot, y + q);
    doc.line(xEsq, y + q * 1.5, xRot, y + q * 1.5);
    doc.line(xEsq, y + q * 2, xRot, y + q * 2);
    doc.line(xEsq, y + q * 3, xRot, y + q * 3);
    doc.line(meio, y, meio, y + q * 2);
    rot("PRODUTOR", xEsq + wEsq / 4, y + q * 0.33);
    rot("DATA DE EMERGÊNCIA", meio + wEsq / 4, y + q * 0.33);
    val(l.cliente, xEsq + wEsq / 4, y + q * 0.85);
    val(dataBR(l.emergencia), meio + wEsq / 4, y + q * 0.85);
    rot("FAZENDA", xEsq + wEsq / 4, y + q * 1.33);
    rot(l.colheitaEstimada ? "COLHEITA (ESTIMADA)" : "DATA DE COLHEITA", meio + wEsq / 4, y + q * 1.33);
    val(l.fazenda, xEsq + wEsq / 4, y + q * 1.85);
    val(dataBR(l.colheita), meio + wEsq / 4, y + q * 1.85);
    val(l.talhao, meio, y + q * 2.6, 9.5);
    val(l.cultivar, meio, y + q * 3.6, 9);

    // Lado direito: uma faixa por aplicação.
    const hApl = altura / n;
    for (let i = 0; i < n; i++) {
      const yy = y + i * hApl;
      doc.setFillColor(...(i % 2 === 0 ? forte : fraco));
      doc.rect(xRot, yy, wRot + wData, hApl, "F");
      doc.line(xRot, yy, xRot + wRot + wData, yy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(l.qtde ? `${i + 1}º APLICAÇÃO` : "SEM APLICAÇÃO", xRot + wRot / 2, yy + hApl / 2, { align: "center", baseline: "middle" });
      doc.setFont("helvetica", "normal");
      doc.text(l.qtde ? dataBR(l.datas[i]) : "—", xData + wData / 2, yy + hApl / 2, { align: "center", baseline: "middle" });
    }
    doc.line(xRot, y, xRot, y + altura);
    doc.line(xData, y, xData, y + altura);
    doc.setLineWidth(0.5);
    doc.rect(x0, y, W - 20, altura, "S");
    doc.setLineWidth(0.2);
    y += altura;
  });
  rodape(doc, empresa);
  doc.save(nomeArquivo || "aplicacoes-por-talhao.pdf");
}

// PDF 2: todas as aplicações em ordem de data.
export function pdfCronologico(linhas, { titulo, empresa, nomeArquivo } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const variasFazendas = new Set(linhas.map((l) => l.fazenda)).size > 1;
  const variosClientes = new Set(linhas.map((l) => l.cliente)).size > 1;
  const itens = linhas.flatMap((l) => l.datas.map((d, i) => ({ l, n: i + 1, d }))).filter((x) => x.d)
    .sort((a, b) => a.d.localeCompare(b.d) || String(a.l.talhao).localeCompare(String(b.l.talhao)));
  cabecalho(doc, titulo);
  const head = [[...(variosClientes ? ["PRODUTOR"] : []), ...(variasFazendas ? ["FAZENDA"] : []), "TALHÃO", "APLICAÇÃO", "DATA"]];
  const body = itens.map(({ l, n, d }) => [
    ...(variosClientes ? [String(l.cliente || "").toUpperCase()] : []),
    ...(variasFazendas ? [String(l.fazenda || "").toUpperCase()] : []),
    String(l.talhao || "").toUpperCase(), `${n}ª APLIC`, dataBR(d),
  ]);
  autoTable(doc, {
    startY: 16, head, body, theme: "grid",
    styles: { fontSize: 8.5, halign: "center", cellPadding: 1.8, lineColor: [237, 125, 49], lineWidth: 0.15 },
    headStyles: { fillColor: [237, 125, 49], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [251, 227, 214] },
    margin: { left: 25, right: 25, bottom: 20 },
    didDrawPage: () => { cabecalho(doc, titulo); rodape(doc, empresa); },
  });
  doc.save(nomeArquivo || "aplicacoes-por-data.pdf");
}
