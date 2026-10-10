// Zonas de manejo por cruzamento de camadas (NDVI, argila, CTC, …).
//
// Metodologia (a mesma ideia dos softwares de zona de manejo / do Geodata,
// só que com várias camadas em vez de só NDVI):
//   1. O talhão vira uma malha de células (~15–25 m). Cada célula recebe o
//      valor de cada camada (NDVI da imagem; atributos de solo interpolados
//      dos pontos de uma análise anterior).
//   2. Cada camada é padronizada (z-score) e multiplicada pelo seu peso.
//   3. K-means agrupa as células em N classes (classe 1 = menor valor da 1ª camada).
//   4. Filtro de maioria tira o "pontilhado" (célula isolada vira a classe dos vizinhos).
//   5. As manchas contínuas de cada classe viram zonas; mancha pequena se junta à
//      vizinha com quem divide mais borda; mancha grande é dividida (k-means nas
//      coordenadas) até ficar perto do tamanho alvo.
//   6. Contorno de cada zona = borda das células, suavizado e recortado pelo talhão.
//   7. Cada zona recebe 1 ponto da amostra composta (rótulo Z01…) e N subamostras
//      bem espalhadas (k-means nas células da zona).
import { intersection } from "martinez-polygon-clipping";

const M_POR_GRAU = 111320;

// Gerador pseudoaleatório com semente fixa: mesma entrada = mesmas zonas.
function rng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pontoNoPoligono(lat, lng, poly) {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

// K-means (k-means++ pra escolher os centros iniciais). dados = array de vetores.
export function kmeans(dados, k, { iter = 40, seed = 42 } = {}) {
  const n = dados.length;
  if (!n) return { rotulos: [], centros: [] };
  k = Math.max(1, Math.min(k, n));
  const r = rng(seed);
  const dim = dados[0].length;
  const d2 = (a, b) => { let s = 0; for (let i = 0; i < dim; i++) { const d = a[i] - b[i]; s += d * d; } return s; };
  const centros = [dados[Math.floor(r() * n)].slice()];
  const minD = new Float64Array(n).fill(Infinity);
  while (centros.length < k) {
    let soma = 0;
    const ult = centros[centros.length - 1];
    for (let i = 0; i < n; i++) { minD[i] = Math.min(minD[i], d2(dados[i], ult)); soma += minD[i]; }
    let alvo = r() * soma, escolhido = n - 1;
    for (let i = 0; i < n; i++) { alvo -= minD[i]; if (alvo <= 0) { escolhido = i; break; } }
    centros.push(dados[escolhido].slice());
  }
  const rotulos = new Int32Array(n);
  for (let it = 0; it < iter; it++) {
    let mudou = false;
    for (let i = 0; i < n; i++) {
      let melhor = 0, md = Infinity;
      for (let c = 0; c < k; c++) { const d = d2(dados[i], centros[c]); if (d < md) { md = d; melhor = c; } }
      if (rotulos[i] !== melhor) { rotulos[i] = melhor; mudou = true; }
    }
    const somas = Array.from({ length: k }, () => new Float64Array(dim));
    const cont = new Int32Array(k);
    for (let i = 0; i < n; i++) { cont[rotulos[i]]++; for (let j = 0; j < dim; j++) somas[rotulos[i]][j] += dados[i][j]; }
    for (let c = 0; c < k; c++) if (cont[c]) for (let j = 0; j < dim; j++) centros[c][j] = somas[c][j] / cont[c];
    if (!mudou && it > 0) break;
  }
  return { rotulos: Array.from(rotulos), centros };
}

// Traça o contorno (anéis) de um conjunto de células da malha. Devolve anéis
// em coordenadas de canto da malha [col, lin] (fechados).
function contornoCelulas(conjunto, cols) {
  // Arestas orientadas (sentido anti-horário em volta de cada célula), só onde o vizinho está fora.
  const arestas = new Map(); // "x,y" -> [[x2,y2], ...]
  const add = (x1, y1, x2, y2) => {
    const k = `${x1},${y1}`;
    if (!arestas.has(k)) arestas.set(k, []);
    arestas.get(k).push([x2, y2]);
  };
  conjunto.forEach((idx) => {
    const x = idx % cols, y = Math.floor(idx / cols);
    const tem = (xx, yy) => xx >= 0 && xx < cols && yy >= 0 && conjunto.has(yy * cols + xx);
    if (!tem(x, y - 1)) add(x, y, x + 1, y);         // sul
    if (!tem(x + 1, y)) add(x + 1, y, x + 1, y + 1); // leste
    if (!tem(x, y + 1)) add(x + 1, y + 1, x, y + 1); // norte
    if (!tem(x - 1, y)) add(x, y + 1, x, y);         // oeste
  });
  const aneis = [];
  const dirDe = (a, b) => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
  while (arestas.size) {
    const [k0, lista0] = arestas.entries().next().value;
    const inicio = k0.split(",").map(Number);
    let atual = inicio, prox = lista0.pop();
    if (!lista0.length) arestas.delete(k0);
    const anel = [inicio];
    let dir = dirDe(atual, prox);
    let guarda = 0;
    while (guarda++ < 1e6) {
      anel.push(prox);
      atual = prox;
      if (atual[0] === inicio[0] && atual[1] === inicio[1]) break;
      const k = `${atual[0]},${atual[1]}`;
      const lista = arestas.get(k);
      if (!lista || !lista.length) break;
      // Em encontro de 4 arestas (células encostadas só na diagonal) vira à esquerda.
      let escolha = 0;
      if (lista.length > 1) {
        const esquerda = [-dir[1], dir[0]];
        const i = lista.findIndex((p) => { const d = dirDe(atual, p); return d[0] === esquerda[0] && d[1] === esquerda[1]; });
        escolha = i >= 0 ? i : 0;
      }
      prox = lista.splice(escolha, 1)[0];
      if (!lista.length) arestas.delete(k);
      dir = dirDe(atual, prox);
    }
    // Tira vértices colineares (a escada vira segmentos mais longos).
    const limpo = anel.filter((p, i) => {
      if (i === 0 || i === anel.length - 1) return true;
      const a = anel[i - 1], b = anel[i + 1];
      return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]));
    });
    if (limpo.length >= 4) aneis.push(limpo);
  }
  return aneis;
}

// Suaviza um anel fechado (Chaikin), pra borda não ficar em escada.
function chaikin(anel, voltas = 2) {
  let pts = anel.slice(0, -1);
  for (let v = 0; v < voltas; v++) {
    const novo = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      novo.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      novo.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    pts = novo;
  }
  return [...pts, pts[0]];
}

function areaAnel(anel) {
  let a = 0;
  for (let i = 0; i < anel.length - 1; i++) a += anel[i][0] * anel[i + 1][1] - anel[i + 1][0] * anel[i][1];
  return a / 2;
}

/**
 * Gera as zonas de manejo.
 * @param {object} p
 * @param {Array<[number,number]>} p.poligono contorno do talhão [[lat,lng],…]
 * @param {Array<{key,label,peso,valorEm:(lat,lng)=>number|null}>} p.camadas
 * @param {number} p.classes nº de classes (3–6)
 * @param {number} p.haPorZona tamanho médio desejado de cada zona (ha)
 * @param {number} p.subPorZona subamostras por zona
 */
export function gerarZonasManejo({ poligono, camadas, classes = 4, haPorZona = 5, subPorZona = 6 }) {
  if (!poligono || poligono.length < 3) throw new Error("Talhão sem contorno.");
  const ativas = camadas.filter((c) => Number(c.peso) > 0);
  if (!ativas.length) throw new Error("Escolha pelo menos uma camada com peso maior que zero.");

  const lats = poligono.map((p) => p[0]), lngs = poligono.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latMedia = (minLat + maxLat) / 2;
  const mPorGrauLng = M_POR_GRAU * Math.cos((latMedia * Math.PI) / 180);
  const larguraM = (maxLng - minLng) * mPorGrauLng, alturaM = (maxLat - minLat) * M_POR_GRAU;
  // Célula de ~15–25 m (no máx. ~9 mil células no retângulo do talhão).
  const celM = Math.max(15, Math.sqrt((larguraM * alturaM) / 9000));
  const dLat = celM / M_POR_GRAU, dLng = celM / mPorGrauLng;
  const cols = Math.ceil((maxLng - minLng) / dLng), lins = Math.ceil((maxLat - minLat) / dLat);
  const haCelula = (celM * celM) / 10000;

  // 1) Células dentro do talhão + valores das camadas.
  const celulas = []; // { idx, x, y, lat, lng, v:[…] }
  for (let y = 0; y < lins; y++) {
    for (let x = 0; x < cols; x++) {
      const lat = minLat + (y + 0.5) * dLat, lng = minLng + (x + 0.5) * dLng;
      if (!pontoNoPoligono(lat, lng, poligono)) continue;
      celulas.push({ idx: y * cols + x, x, y, lat, lng, v: ativas.map((c) => c.valorEm(lat, lng)) });
    }
  }
  if (celulas.length < classes * 3) throw new Error("Talhão pequeno demais pra esse número de classes.");

  // 2) Padroniza cada camada (falta de dado = média) e aplica o peso.
  const estat = ativas.map((c, j) => {
    const vals = celulas.map((cel) => cel.v[j]).filter((v) => v !== null && v !== undefined && Number.isFinite(v));
    if (!vals.length) throw new Error(`Sem dados de ${c.label} dentro do talhão.`);
    const media = vals.reduce((a, b) => a + b, 0) / vals.length;
    const dp = Math.sqrt(vals.reduce((a, b) => a + (b - media) ** 2, 0) / vals.length) || 1;
    return { media, dp };
  });
  celulas.forEach((cel) => {
    cel.v = cel.v.map((v, j) => (v === null || v === undefined || !Number.isFinite(v) ? estat[j].media : v));
  });
  const feats = celulas.map((cel) => cel.v.map((v, j) => ((v - estat[j].media) / estat[j].dp) * Number(ativas[j].peso)));

  // 3) K-means nas classes, ordenadas pela 1ª camada (classe 1 = menor valor).
  const km = kmeans(feats, classes);
  const mediaPrimeira = Array.from({ length: km.centros.length }, (_, c) => {
    const cs = celulas.filter((_, i) => km.rotulos[i] === c);
    return cs.reduce((a, cel) => a + cel.v[0], 0) / (cs.length || 1);
  });
  const ordem = mediaPrimeira.map((m, c) => [m, c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const remap = new Map(ordem.map((c, i) => [c, i]));
  const classeDe = new Map();
  celulas.forEach((cel, i) => classeDe.set(cel.idx, remap.get(km.rotulos[i])));

  // 4) Filtro de maioria (8 vizinhos), 2 passadas.
  const vizinhos8 = (x, y) => [[x - 1, y - 1], [x, y - 1], [x + 1, y - 1], [x - 1, y], [x + 1, y], [x - 1, y + 1], [x, y + 1], [x + 1, y + 1]];
  for (let pass = 0; pass < 2; pass++) {
    const novo = new Map(classeDe);
    celulas.forEach((cel) => {
      const cont = {};
      vizinhos8(cel.x, cel.y).forEach(([xx, yy]) => {
        const c = classeDe.get(yy * cols + xx);
        if (c !== undefined && xx >= 0 && xx < cols) cont[c] = (cont[c] || 0) + 1;
      });
      const [melhor, n] = Object.entries(cont).sort((a, b) => b[1] - a[1])[0] || [];
      if (melhor !== undefined && n >= 5 && Number(melhor) !== classeDe.get(cel.idx)) novo.set(cel.idx, Number(melhor));
    });
    novo.forEach((v, k) => classeDe.set(k, v));
  }

  // 5) Manchas contínuas (4 vizinhos) por classe.
  const vizinhos4 = (idx) => {
    const x = idx % cols, y = Math.floor(idx / cols);
    return [x > 0 ? idx - 1 : -1, x < cols - 1 ? idx + 1 : -1, idx - cols, idx + cols].filter((i) => i >= 0 && classeDe.has(i));
  };
  const zonaDe = new Map();
  let zonas = []; // { id, classe, cels:Set }
  celulas.forEach((cel) => {
    if (zonaDe.has(cel.idx)) return;
    const classe = classeDe.get(cel.idx);
    const z = { id: zonas.length, classe, cels: new Set() };
    const pilha = [cel.idx];
    zonaDe.set(cel.idx, z.id);
    while (pilha.length) {
      const i = pilha.pop();
      z.cels.add(i);
      vizinhos4(i).forEach((n) => { if (!zonaDe.has(n) && classeDe.get(n) === classe) { zonaDe.set(n, z.id); pilha.push(n); } });
    }
    zonas.push(z);
  });

  const alvoCel = Math.max(4, (Number(haPorZona) || 5) / haCelula);
  const minCel = alvoCel * 0.4;
  // Junta manchas pequenas na vizinha com quem divide mais borda (da menor
  // pra maior). Mancha pequena sem vizinha (ilha) fica como está.
  const juntarPequenas = () => {
    const ilhas = new Set();
    for (let guarda = 0; guarda < 5000; guarda++) {
      const peq = zonas
        .filter((z) => z.cels.size && z.cels.size < minCel && !ilhas.has(z.id))
        .sort((a, b) => a.cels.size - b.cels.size)[0];
      if (!peq) break;
      const borda = {};
      peq.cels.forEach((i) => vizinhos4(i).forEach((n) => {
        const zn = zonaDe.get(n);
        if (zn !== undefined && zn !== peq.id) borda[zn] = (borda[zn] || 0) + 1;
      }));
      const alvo = Object.entries(borda).sort((a, b) => b[1] - a[1])[0];
      if (!alvo) { ilhas.add(peq.id); continue; }
      const destino = zonas.find((z) => z.id === Number(alvo[0]));
      peq.cels.forEach((i) => { destino.cels.add(i); zonaDe.set(i, destino.id); });
      peq.cels = new Set();
    }
  };
  juntarPequenas();

  // Divide manchas grandes em pedaços de tamanho perto do alvo.
  const celPorIdx = new Map(celulas.map((c) => [c.idx, c]));
  zonas.filter((z) => z.cels.size > alvoCel * 1.6).forEach((z) => {
    const k = Math.round(z.cels.size / alvoCel);
    if (k < 2) return;
    const lista = [...z.cels];
    const coords = lista.map((i) => { const c = celPorIdx.get(i); return [c.x, c.y]; });
    const { rotulos } = kmeans(coords, k, { seed: 7 + z.id });
    const novas = Array.from({ length: k }, (_, j) => ({ id: zonas.length + j, classe: z.classe, cels: new Set() }));
    lista.forEach((i, n) => { novas[rotulos[n]].cels.add(i); zonaDe.set(i, novas[rotulos[n]].id); });
    z.cels = new Set();
    zonas.push(...novas);
  });
  // Os pedaços podem ter saído partidos: refaz as manchas contínuas por zona.
  const refeitas = [];
  zonaDe.clear();
  zonas.filter((z) => z.cels.size).forEach((z) => {
    const restantes = new Set(z.cels);
    while (restantes.size) {
      const ini = restantes.values().next().value;
      const nova = { id: refeitas.length, classe: z.classe, cels: new Set() };
      const pilha = [ini];
      restantes.delete(ini);
      while (pilha.length) {
        const i = pilha.pop();
        nova.cels.add(i);
        zonaDe.set(i, nova.id);
        vizinhos4(i).forEach((n) => { if (restantes.has(n)) { restantes.delete(n); pilha.push(n); } });
      }
      refeitas.push(nova);
    }
  });
  zonas = refeitas;
  juntarPequenas();
  zonas = zonas.filter((z) => z.cels.size);

  // 6) Contornos (recortados pelo talhão) e 7) pontos.
  const talhaoGeo = [[[...poligono.map(([lat, lng]) => [lng, lat]), [poligono[0][1], poligono[0][0]]]]];
  const cantoParaLngLat = ([cx, cy]) => [minLng + cx * dLng, minLat + cy * dLat];
  const resultado = zonas.map((z) => {
    const cels = [...z.cels].map((i) => celPorIdx.get(i));
    const aneis = contornoCelulas(z.cels, cols)
      .map((a) => chaikin(a).map(cantoParaLngLat))
      .sort((a, b) => Math.abs(areaAnel(b)) - Math.abs(areaAnel(a)));
    // Anel externo anti-horário, buracos no sentido contrário (padrão GeoJSON).
    const ext = aneis[0] ? (areaAnel(aneis[0]) < 0 ? aneis[0].slice().reverse() : aneis[0]) : null;
    const buracos = aneis.slice(1).map((a) => (areaAnel(a) > 0 ? a.slice().reverse() : a));
    let poligonos = ext ? [[ext, ...buracos]] : [];
    try {
      const recortado = intersection(poligonos, talhaoGeo);
      if (recortado && recortado.length) poligonos = recortado;
    } catch (e) { /* mantém sem recorte se a operação falhar */ }

    // Subamostras: k-means nas coordenadas das células → célula mais perto de cada centro.
    const coords = cels.map((c) => [c.x, c.y]);
    const k = Math.min(Math.max(1, Number(subPorZona) || 1), cels.length);
    const { centros } = kmeans(coords, k, { seed: 99 + z.id });
    const perto = (cx, cy) => cels.reduce((m, c) => { const d = (c.x - cx) ** 2 + (c.y - cy) ** 2; return d < m.d ? { c, d } : m; }, { c: cels[0], d: Infinity }).c;
    const subamostras = centros.map(([cx, cy]) => { const c = perto(cx, cy); return { lat: c.lat, lng: c.lng }; });
    // Ponto da amostra composta: célula mais perto do centro de massa da zona.
    const mx = cels.reduce((a, c) => a + c.x, 0) / cels.length, my = cels.reduce((a, c) => a + c.y, 0) / cels.length;
    const centro = perto(mx, my);
    const medias = ativas.map((c, j) => ({ key: c.key, label: c.label, media: cels.reduce((a, cel) => a + cel.v[j], 0) / cels.length }));
    return {
      classe: z.classe, areaHa: cels.length * haCelula, poligonos,
      centro: { lat: centro.lat, lng: centro.lng }, subamostras, medias,
      _ordem: [-(centro.lat), centro.lng],
    };
  });
  // Numeração de norte pra sul, oeste pra leste (ordem de caminhamento no campo).
  resultado.sort((a, b) => {
    const faixa = (z) => Math.round(z._ordem[0] / (dLat * 8));
    return faixa(a) - faixa(b) || a._ordem[1] - b._ordem[1];
  });
  resultado.forEach((z, i) => { z.label = `Z${String(i + 1).padStart(2, "0")}`; delete z._ordem; });

  const resumoClasses = Array.from({ length: classes }, (_, c) => {
    const zs = resultado.filter((z) => z.classe === c);
    const area = zs.reduce((a, z) => a + z.areaHa, 0);
    return {
      classe: c, zonas: zs.length, areaHa: area,
      medias: ativas.map((cam, j) => ({
        label: cam.label,
        media: area ? zs.reduce((a, z) => a + z.medias[j].media * z.areaHa, 0) / area : null,
      })),
    };
  }).filter((r) => r.zonas);

  return { zonas: resultado, classes: resumoClasses, celulaM: Math.round(celM) };
}

// Ponto dentro de um MultiPolygon GeoJSON ([[anel externo, buracos…], …] em [lng,lat]).
export function pontoNaZona(lat, lng, poligonos) {
  for (const poly of poligonos || []) {
    const [ext, ...buracos] = poly;
    const dentro = (anel) => {
      let d = false;
      for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
        const [xi, yi] = anel[i], [xj, yj] = anel[j];
        if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) d = !d;
      }
      return d;
    };
    if (ext && dentro(ext) && !buracos.some(dentro)) return true;
  }
  return false;
}
