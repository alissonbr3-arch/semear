// Netlify Function: google-agenda-eventos
//
// Lê o Google Agenda de quem está logado pelo "endereço secreto no formato
// iCal" (salvo em semear_google_agenda) e devolve os eventos do período
// pedido, já com as repetições expandidas. Cada pessoa só vê a própria agenda.
//   GET ?from=YYYY-MM-DD&to=YYYY-MM-DD   (to é exclusivo)
import { createClient } from "@supabase/supabase-js";
import ical from "node-ical";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
const isoDia = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

// Evento de dia inteiro vem como data "flutuante" (meia-noite UTC no node-ical):
// devolve só a data, sem hora, pra não escorregar de dia no fuso de MS.
function dataDoDiaInteiro(d) {
  return new Date(d).toISOString().slice(0, 10);
}

export function eventosNoPeriodo(data, from, to) {
  const ini = new Date(`${from}T00:00:00-04:00`);
  const fim = new Date(`${to}T00:00:00-04:00`);
  const out = [];
  for (const ev of Object.values(data)) {
    if (!ev || ev.type !== "VEVENT" || !ev.start) continue;
    if (ev.status === "CANCELLED") continue;
    const allDay = ev.datetype === "date" || ev.start.dateOnly === true;
    const dur = ev.end ? new Date(ev.end) - new Date(ev.start) : allDay ? 86400000 : 3600000;
    let inicios = [];
    if (ev.rrule) {
      // O rrule devolve as ocorrências no horário "de parede" marcado como UTC;
      // o deslocamento entre o início real e o dtstart do rrule corrige o fuso.
      const desloc = new Date(ev.start).getTime() - ev.rrule.options.dtstart.getTime();
      const diaMS = (d) => new Date(new Date(d).getTime() - 4 * 3600000).toISOString().slice(0, 10);
      inicios = ev.rrule
        .between(new Date(ini.getTime() - 2 * 86400000 - desloc), new Date(fim.getTime() + 86400000 - desloc), true)
        .map((d) => new Date(d.getTime() + desloc));
      const excl = new Set(Object.values(ev.exdate || {}).map(allDay ? dataDoDiaInteiro : diaMS));
      const chave = allDay ? dataDoDiaInteiro : diaMS;
      inicios = inicios.filter((d) => !excl.has(chave(d)));
      // Ocorrências alteradas (movidas/renomeadas) vêm em ev.recurrences.
      const alteradas = ev.recurrences ? Object.values(ev.recurrences) : [];
      const chavesAlt = new Set(alteradas.map((r) => chave(r.recurrenceid || r.start)));
      inicios = inicios.filter((d) => !chavesAlt.has(chave(d)));
      alteradas.forEach((r) => {
        if (r.status === "CANCELLED") return;
        const s = new Date(r.start), e = r.end ? new Date(r.end) : new Date(s.getTime() + dur);
        if (allDay ? (dataDoDiaInteiro(s) >= from && dataDoDiaInteiro(s) < to) : (e > ini && s < fim)) out.push(montar(r, s, e, allDay));
      });
    } else {
      inicios = [new Date(ev.start)];
    }
    inicios.forEach((s) => {
      const e = new Date(new Date(s).getTime() + dur);
      if (allDay) {
        const d = dataDoDiaInteiro(s);
        if (d >= from && d < to) out.push(montar(ev, s, e, true));
      } else if (e > ini && s < fim) {
        out.push(montar(ev, s, e, false));
      }
    });
  }
  return out.sort((a, b) => String(a.start).localeCompare(String(b.start)));

  function montar(ev, s, e, diaInteiro) {
    return {
      id: `${ev.uid || ""}:${new Date(s).toISOString()}`,
      title: typeof ev.summary === "object" ? ev.summary.val : ev.summary || "(sem título)",
      location: typeof ev.location === "object" ? ev.location.val : ev.location || "",
      allDay: diaInteiro,
      start: diaInteiro ? dataDoDiaInteiro(s) : new Date(s).toISOString(),
      end: diaInteiro ? dataDoDiaInteiro(e) : new Date(e).toISOString(),
    };
  }
}

export const handler = async (event) => {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Configuração do servidor incompleta." }, 500);
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return json({ error: "Não autenticado." }, 401);
  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await callerClient.auth.getUser();
  if (error || !user) return json({ error: "Sessão inválida." }, 401);

  const { from, to } = event.queryStringParameters || {};
  if (!isoDia(from) || !isoDia(to) || from >= to) return json({ error: "Período inválido." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: row } = await adminClient.from("semear_google_agenda").select("ics_url").eq("user_id", user.id).maybeSingle();
  if (!row?.ics_url) return json({ conectado: false, eventos: [] });

  let texto;
  try {
    const resp = await fetch(row.ics_url, { headers: { "User-Agent": "SemearAgenda/1.0" } });
    if (!resp.ok) return json({ conectado: true, erro: `O Google respondeu ${resp.status}. Confira se o endereço secreto ainda é válido.`, eventos: [] });
    texto = await resp.text();
  } catch (e) {
    return json({ conectado: true, erro: "Não consegui acessar o Google Agenda agora.", eventos: [] });
  }
  try {
    const data = ical.sync.parseICS(texto);
    return json({ conectado: true, eventos: eventosNoPeriodo(data, from, to) });
  } catch (e) {
    return json({ conectado: true, erro: "O endereço não devolveu uma agenda válida (formato iCal).", eventos: [] });
  }
};
