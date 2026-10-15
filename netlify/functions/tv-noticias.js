// Netlify Function: tv-noticias
//
// Manchetes pra tela "Semear News" da TV: só Canal Rural e Notícias Agrícolas, e só
// os temas Soja, Milho, Dólar e Boi. Não usa login nem dados do Semear.
const UA = "Mozilla/5.0 (compatible; SemearTV/1.0)";
const REGEX_DOLAR = /d[óo]lar|c[âa]mbio|cambial/i;

// Canal Rural: feeds RSS por assunto.
const CANAL_RURAL = [
  { url: "https://www.canalrural.com.br/agricultura/soja/feed/", tema: "Soja" },
  { url: "https://www.canalrural.com.br/agricultura/milho/feed/", tema: "Milho" },
  { url: "https://www.canalrural.com.br/pecuaria/boi/feed/", tema: "Boi" },
  { url: "https://www.canalrural.com.br/economia/feed/", tema: "Dólar", filtro: REGEX_DOLAR },
];
// Notícias Agrícolas: não tem RSS; lê as páginas de lista de cada assunto.
const NOTICIAS_AGRICOLAS = [
  { path: "soja", tema: "Soja" },
  { path: "milho", tema: "Milho" },
  { path: "boi", tema: "Boi" },
  { path: "politica-economia", tema: "Dólar", filtro: REGEX_DOLAR },
];

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" }, body: JSON.stringify(body) };
}
function limpa(str) {
  return String(str || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tag(bloco, nome) {
  const m = bloco.match(new RegExp(`<${nome}[^>]*>([\\s\\S]*?)<\\/${nome}>`, "i"));
  return m ? m[1] : "";
}
function imagemRss(bloco) {
  const m = bloco.match(/<media:content[^>]*url="([^"]+)"/i)
    || bloco.match(/<media:thumbnail[^>]*url="([^"]+)"/i)
    || bloco.match(/<enclosure[^>]*url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i)
    || bloco.match(/<img[^>]*src=["']([^"']+)["']/i);
  const url = m ? m[1].replace(/&amp;/g, "&") : "";
  return /^https?:\/\//.test(url) ? url : "";
}
function semCredito(txt) {
  return txt.replace(/^Foto:\s*[^/]*\/(?:Canal Rural|\S+)\s*/i, "");
}
async function baixa(url, ms = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

async function canalRural() {
  const partes = await Promise.allSettled(CANAL_RURAL.map(async (f) => {
    const xml = await baixa(f.url);
    return (xml.match(/<item[\s>][\s\S]*?<\/item>/g) || []).map((b) => ({
      titulo: limpa(tag(b, "title")), link: limpa(tag(b, "link")), data: limpa(tag(b, "pubDate")),
      resumo: semCredito(limpa(tag(b, "description"))).slice(0, 220), imagem: imagemRss(b), fonte: "Canal Rural", tema: f.tema,
    })).filter((it) => it.titulo && it.link && (!f.filtro || f.filtro.test(it.titulo)));
  }));
  return partes.filter((p) => p.status === "fulfilled").flatMap((p) => p.value);
}

// "14/10/2026 - 07:32" ou só "07:32" (hoje) → ISO, horário de Brasília.
function dataNA(txt) {
  const m = String(txt).match(/(?:(\d{2})\/(\d{2})\/(\d{4})\s*-\s*)?(\d{2}):(\d{2})/);
  if (!m) return "";
  const hoje = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
  const dia = m[1] ? `${m[3]}-${m[2]}-${m[1]}` : hoje;
  return `${dia}T${m[4]}:${m[5]}:00-03:00`;
}

async function noticiasAgricolas() {
  const partes = await Promise.allSettled(NOTICIAS_AGRICOLAS.map(async (f) => {
    const html = await baixa(`https://www.noticiasagricolas.com.br/noticias/${f.path}/`);
    const vistos = new Set();
    const itens = [];
    for (const m of html.matchAll(/<a[^>]+href="(\/noticias\/[a-z0-9-]+\/\d+[^"]*\.html)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const link = `https://www.noticiasagricolas.com.br${m[1]}`;
      if (vistos.has(link)) continue;
      const titulo = limpa((m[2].match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1]);
      if (!titulo) continue;
      vistos.add(link);
      const hora = limpa((m[2].match(/<span class="hora">([\s\S]*?)<\/span>/) || [])[1]);
      const img = (m[2].match(/<img[^>]+src="([^"]+)"/) || [])[1] || "";
      itens.push({ titulo, link, data: dataNA(hora), resumo: "", imagem: img, fonte: "Notícias Agrícolas", tema: f.tema });
    }
    return itens.filter((it) => !f.filtro || f.filtro.test(it.titulo)).slice(0, 8);
  }));
  const todos = partes.filter((p) => p.status === "fulfilled").flatMap((p) => p.value);
  // Foto e resumo vêm da página de cada notícia (só das mais recentes).
  const recentes = [...todos].sort((a, b) => (b.data || "").localeCompare(a.data || "")).slice(0, 10);
  await Promise.allSettled(recentes.map(async (it) => {
    try {
      const html = await baixa(it.link, 6000);
      const meta = (attr, nome) => (html.match(new RegExp(`<meta ${attr}="${nome}" content="([^"]*)"`, "i")) || [])[1] || "";
      if (!it.imagem) it.imagem = meta("property", "og:image");
      it.resumo = limpa(meta("property", "og:description") || meta("name", "description")).slice(0, 220);
    } catch {}
  }));
  return todos;
}

const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export const handler = async () => {
  const [cr, na] = await Promise.all([canalRural().catch(() => []), noticiasAgricolas().catch(() => [])]);
  const todos = [...cr, ...na];
  if (!todos.length) return json({ itens: [], erro: "Nenhuma fonte respondeu." });
  const vistos = new Set();
  const unicos = todos
    .filter((it) => { const k = norm(it.titulo); if (vistos.has(k)) return false; vistos.add(k); return true; })
    .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
  // Até 5 por tema, pra nenhum assunto tomar a tela inteira.
  const porTema = {};
  const itens = unicos.filter((it) => (porTema[it.tema] = (porTema[it.tema] || 0) + 1) <= 5).slice(0, 18);
  return json({ itens, atualizadoEm: new Date().toISOString() });
};
