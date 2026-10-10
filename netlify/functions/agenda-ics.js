// Netlify Function: agenda-ics
//
// Agenda de cada gestor no formato de calendário (iCalendar/.ics), pra assinar
// no Google Agenda ("Outras agendas" → "Do URL"). Endereço:
//   https://painel.semearconsultoriam.../agenda/<token>.ics
// O token é sorteado no app (Agenda → Google Agenda) e fica guardado em
// agrotrack_data "agendaIcsTokens" = { [userId]: token }. Gerar um link novo
// invalida o antigo. Entram os itens da Agenda em que a pessoa é responsável.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getBlob(adminClient, key, fallback) {
  const { data } = await adminClient.from("agrotrack_data").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}

// Texto no formato iCalendar: escapa \ ; , e quebra de linha, e dobra linhas
// longas (máx. 75 octetos) como pede a RFC 5545.
function esc(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function fold(line) {
  const out = [];
  let cur = "";
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch, "utf8") > 74) { out.push(cur); cur = " " + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}
const ymd = (iso) => String(iso).slice(0, 10).replace(/-/g, "");
function nextDay(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export const handler = async (event) => {
  if (!supabaseUrl || !serviceRoleKey) return { statusCode: 500, body: "Configuração incompleta." };
  // Vem como ?t=<token> (chamada direta) ou no caminho /agenda/<token>.ics
  // (o redirect do netlify.toml não repassa o token como parâmetro).
  const doCaminho = String(event.rawUrl || event.path || "").split("?")[0].split("/").pop();
  const token = String(event.queryStringParameters?.t || doCaminho || "").replace(/\.ics$/i, "").trim();
  if (!/^[a-f0-9]{32,}$/.test(token)) return { statusCode: 404, body: "Agenda não encontrada." };

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const tokens = await getBlob(adminClient, "agendaIcsTokens", {});
  const userId = Object.keys(tokens).find((id) => tokens[id] === token);
  if (!userId) return { statusCode: 404, body: "Agenda não encontrada (o link pode ter sido trocado)." };

  const [tasks, clients, profileRes] = await Promise.all([
    getBlob(adminClient, "tasks", []),
    getBlob(adminClient, "clients", []),
    adminClient.from("profiles").select("name").eq("id", userId).maybeSingle(),
  ]);
  const nome = profileRes.data?.name || "Gestor";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Semear Consultoria//Agenda//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`Semear — ${nome}`)}`, "X-WR-TIMEZONE:America/Campo_Grande",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
  ];
  tasks.filter((t) => t.assigneeId === userId && t.date).forEach((t) => {
    const cliente = (clients.find((c) => c.id === t.clientId) || {}).name;
    const tipo = t.type === "visita" ? "Visita" : "Tarefa";
    const titulo = `${t.done ? "✓ " : ""}${t.title || tipo}${cliente ? ` — ${cliente}` : ""}`;
    const desc = [`${tipo}${cliente ? ` · ${cliente}` : ""}`, t.notes || "", t.done ? "Concluída no Semear." : ""].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT", `UID:${t.id}@semear-agenda`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(t.date)}`, `DTEND;VALUE=DATE:${ymd(nextDay(t.date))}`,
      `SUMMARY:${esc(titulo)}`, `DESCRIPTION:${esc(desc)}`, "TRANSP:TRANSPARENT",
      t.done ? "STATUS:CONFIRMED" : "STATUS:TENTATIVE", "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-cache", "Content-Disposition": "inline; filename=semear-agenda.ics" },
    body: lines.map(fold).join("\r\n") + "\r\n",
  };
};
