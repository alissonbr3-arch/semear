// Netlify Function: tv-noticias
//
// Manchetes do agronegócio pra tela "Semear News" da TV. Lê os feeds RSS públicos
// (Agrolink, G1 Agro, Canal Rural) e devolve as mais recentes, sem repetir.
// Não usa login nem dados do Semear.
const FEEDS = [
  { url: "https://www.agrolink.com.br/rss/noticias.xml", fonte: "Agrolink", filtrar: false },
  { url: "https://g1.globo.com/rss/g1/economia/agronegocios/", fonte: "G1 Agro", filtrar: false },
  { url: "https://www.canalrural.com.br/feed/", fonte: "Canal Rural", filtrar: true },
];
const PALAVRAS = ["soja", "milho", "sorgo", "grão", "grãos", "commodit", "cotação", "cotações", "dólar", "cbot", "exporta", "safra", "preço", "mercado", "agro", "cepea", "porto", "frete", "clima", "chuva", "plantio", "colheita", "pecuária", "boi", "algodão", "fertiliz"];

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
function imagem(bloco) {
  const m = bloco.match(/<media:content[^>]*url="([^"]+)"/i)
    || bloco.match(/<media:thumbnail[^>]*url="([^"]+)"/i)
    || bloco.match(/<enclosure[^>]*url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i)
    || bloco.match(/<img[^>]*src=["']([^"']+)["']/i);
  const url = m ? m[1].replace(/&amp;/g, "&") : "";
  return /^https?:\/\//.test(url) ? url : "";
}
function parse(xml, fonte) {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/g) || []).map((b) => ({
    titulo: limpa(tag(b, "title")),
    link: limpa(tag(b, "link")),
    data: limpa(tag(b, "pubDate")),
    resumo: limpa(tag(b, "description")).replace(/^Foto:\s*[^/]*\/(?:Canal Rural|G1|Agrolink|\S+)\s*/i, "").slice(0, 220),
    imagem: imagem(b),
    fonte,
  })).filter((it) => it.titulo && it.link);
}
const norm = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export const handler = async () => {
  const resp = await Promise.allSettled(FEEDS.map(async (f) => {
    const r = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SemearTV/1.0)" } });
    if (!r.ok) throw new Error(`${f.fonte} ${r.status}`);
    let itens = parse(await r.text(), f.fonte);
    if (f.filtrar) itens = itens.filter((it) => PALAVRAS.some((p) => it.titulo.toLowerCase().includes(p)));
    return itens;
  }));
  const todos = resp.filter((r) => r.status === "fulfilled").flatMap((r) => r.value);
  if (!todos.length) return json({ itens: [], erro: "Nenhuma fonte respondeu." });
  const vistos = new Set();
  const itens = todos
    .filter((it) => { const k = norm(it.titulo); if (vistos.has(k)) return false; vistos.add(k); return true; })
    .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))
    .slice(0, 18);
  return json({ itens, atualizadoEm: new Date().toISOString() });
};
