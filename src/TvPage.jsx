// Página /tv — painel da TV corporativa da Semear. Abre em tela cheia, sem login
// (usa o link privado ?k=...), atualiza sozinha e alterna as telas a cada 20 s.
// Não mostra nada de financeiro.
import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polygon, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const SCENES = [
  { id: "painel", title: "Painel geral" },
  { id: "agenda", title: "Agenda e visitas" },
  { id: "mapa", title: "Mapa dos talhões" },
  { id: "tempo", title: "Previsão do tempo · 15 dias" },
];
const SCENE_MS = 20000;
const REFRESH_MS = 5 * 60 * 1000;
const WEATHER_MS = 30 * 60 * 1000;
const C = {
  bg: "#F4F2E9", card: "#FFFFFF", border: "#E3E0D4", ink: "#1C231D", soft: "#4A5448", dim: "#7A8176",
  green: "#2F7A2F", greenDark: "#1E4A20", greenSoft: "#E3F3D9", gold: "#B9851B", goldSoft: "#F7EAC9",
  red: "#C24B42", redSoft: "#FBE1DE", blue: "#2F6FB0",
};
const CULTURE_COLOR = { Soja: "#3E8E2F", Milho: "#D6A93A" };

const pad2 = (n) => String(n).padStart(2, "0");
const isoLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
function fieldAreaHa(f) {
  const manual = Number(f?.area);
  if (manual > 0) return manual;
  const mapped = Number(f?.fieldMap?.areaHa);
  return mapped > 0 ? mapped : 0;
}
const fmtHa = (n) => `${Math.round(n).toLocaleString("pt-BR")} ha`;
const firstName = (n) => String(n || "").trim().split(/\s+/).slice(0, 2).join(" ");
function daysBetween(aIso, bIso) {
  return Math.round((Date.parse(`${aIso}T00:00:00`) - Date.parse(`${bIso}T00:00:00`)) / 86400000);
}
const WMO_ICON = (c) => {
  if (c === 0) return "☀️";
  if (c <= 2) return "🌤️";
  if (c === 3) return "☁️";
  if (c <= 48) return "🌫️";
  if (c <= 67) return "🌧️";
  if (c <= 82) return "🌦️";
  return "⛈️";
};
const WMO = (c) => {
  if (c === 0) return "Céu limpo";
  if (c <= 3) return "Parcialmente nublado";
  if (c <= 48) return "Neblina";
  if (c <= 57) return "Garoa";
  if (c <= 67) return "Chuva";
  if (c <= 77) return "Neve";
  if (c <= 82) return "Pancadas de chuva";
  return "Tempestade";
};

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function Card({ title, children, style }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "0.9em", padding: "0.9em 1.1em", display: "flex", flexDirection: "column", minHeight: 0, ...style }}>
      {title && <div style={{ fontSize: "0.72em", fontWeight: 700, letterSpacing: ".06em", color: C.dim, marginBottom: "0.6em" }}>{title}</div>}
      {children}
    </div>
  );
}

function Kpi({ label, value, sub, color }) {
  return (
    <Card>
      <div style={{ fontSize: "0.72em", fontWeight: 700, letterSpacing: ".06em", color: C.dim }}>{label}</div>
      <div style={{ fontSize: "2.5em", fontWeight: 800, lineHeight: 1.1, color: color || C.ink }}>{value}</div>
      {sub && <div style={{ fontSize: "0.75em", color: C.dim }}>{sub}</div>}
    </Card>
  );
}

function Avatar({ name, url, size = "2em" }) {
  const initials = String(name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return url ? (
    <img src={url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.greenSoft, color: C.greenDark, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8em", fontWeight: 700, flexShrink: 0 }}>{initials}</div>
  );
}

function ScenePainel({ m }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1.2fr 1fr", gap: "1em", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1em", minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1em" }}>
          <Kpi label="CLIENTES" value={m.clients} />
          <Kpi label="SAFRAS ATIVAS" value={m.activeHarvests} color={C.green} />
          <Kpi label="TALHÕES" value={m.fields} />
          <Kpi label="PROPRIEDADES" value={m.properties} />
        </div>
        <Card title="ÁREA ATENDIDA" style={{ flex: 1 }}>
          <div style={{ fontSize: "2.2em", fontWeight: 800, lineHeight: 1.1 }}>{fmtHa(m.areaTotal)}</div>
          <div style={{ fontSize: "0.8em", color: C.dim, marginBottom: "0.7em" }}>{fmtHa(m.areaPlanted)} plantados agora</div>
          <div style={{ height: "0.6em", borderRadius: 99, background: C.border, overflow: "hidden", display: "flex" }}>
            {Object.entries(m.areaByCulture).map(([cult, ha]) => (
              <div key={cult} style={{ width: `${m.areaTotal ? (ha / m.areaTotal) * 100 : 0}%`, background: CULTURE_COLOR[cult] || C.blue }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "1.2em", marginTop: "0.7em", fontSize: "0.8em", color: C.soft, flexWrap: "wrap" }}>
            {Object.entries(m.areaByCulture).map(([cult, ha]) => (
              <span key={cult}><span style={{ color: CULTURE_COLOR[cult] || C.blue }}>●</span> {cult} {fmtHa(ha)}</span>
            ))}
          </div>
        </Card>
      </div>

      <Card title="VISITAS DA SEMANA POR GESTOR" style={{ minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9em" }}>
          {m.byGestor.map((g) => (
            <div key={g.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.7em", marginBottom: "0.3em" }}>
                <Avatar name={g.name} url={g.avatar} />
                <div style={{ flex: 1, fontWeight: 700, fontSize: "1em" }}>{firstName(g.name)}</div>
                <div style={{ fontSize: "0.9em", color: C.soft }}>{g.ok} de {g.total}</div>
              </div>
              <div style={{ height: "0.55em", borderRadius: 99, background: C.border, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${g.total ? (g.ok / g.total) * 100 : 0}%`, background: g.ok === g.total ? C.green : C.gold }} />
              </div>
            </div>
          ))}
          {m.byGestor.length === 0 && <div style={{ color: C.dim }}>Sem gestores com clientes mapeados.</div>}
        </div>
      </Card>

      <Card title="ATENÇÃO — VISITAS ATRASADAS" style={{ minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5em" }}>
          {m.late.slice(0, 7).map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6em", fontSize: "0.9em", paddingBottom: "0.4em", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <span style={{ background: c.days === null || c.days > 14 ? C.redSoft : C.goldSoft, color: c.days === null || c.days > 14 ? C.red : C.gold, borderRadius: 99, padding: "0.1em 0.7em", fontSize: "0.85em", fontWeight: 700, whiteSpace: "nowrap" }}>
                {c.days === null ? "sem visitas" : `${c.days} dias`}
              </span>
            </div>
          ))}
          {m.late.length === 0 && <div style={{ color: C.green, fontWeight: 700 }}>Todas as visitas em dia 🎉</div>}
          {m.late.length > 7 && <div style={{ fontSize: "0.8em", color: C.dim }}>+ {m.late.length - 7} clientes</div>}
        </div>
      </Card>
    </div>
  );
}

function SceneAgenda({ m }) {
  const days = m.weekDays;
  const labels = days.map((d, i) => (i === 0 ? "Hoje" : d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1em", height: "100%", minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.7em", flex: 1, minHeight: 0 }}>
        {days.map((d, i) => {
          const iso = isoLocal(d);
          const isToday = iso === m.todayIso;
          const items = m.tasksByDay[iso] || [];
          return (
            <div key={iso} style={{ background: C.card, border: `${isToday ? 2 : 1}px solid ${isToday ? C.green : C.border}`, borderRadius: "0.9em", padding: "0.7em", overflow: "hidden", display: "flex", flexDirection: "column", gap: "0.5em" }}>
              <div>
                <div style={{ fontSize: "0.7em", fontWeight: 700, letterSpacing: ".05em", color: isToday ? C.green : C.dim }}>{labels[i].toUpperCase()}</div>
                <div style={{ fontSize: "1.4em", fontWeight: 800 }}>{d.getDate()}</div>
              </div>
              {items.slice(0, 5).map((t) => (
                <div key={t.id} style={{ background: C.bg, borderRadius: "0.5em", padding: "0.4em 0.5em", fontSize: "0.75em", opacity: t.done ? 0.55 : 1 }}>
                  <div style={{ color: t.type === "visita" ? C.green : C.soft, fontWeight: 700, fontSize: "0.85em" }}>{t.type === "visita" ? "VISITA" : "TAREFA"}</div>
                  <div style={{ fontWeight: 600, lineHeight: 1.25 }}>{t.title}</div>
                  {(t.clientName || t.assigneeName) && <div style={{ color: C.dim, marginTop: "0.15em" }}>{[t.clientName, t.assigneeName && firstName(t.assigneeName)].filter(Boolean).join(" · ")}</div>}
                </div>
              ))}
              {items.length > 5 && <div style={{ fontSize: "0.7em", color: C.dim }}>+ {items.length - 5}</div>}
              {items.length === 0 && <div style={{ fontSize: "0.8em", color: C.dim }}>—</div>}
            </div>
          );
        })}
      </div>
      <Card title="ÚLTIMAS VISITAS" style={{ flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5em 1.2em" }}>
          {m.recentVisits.slice(0, 6).map((v) => (
            <div key={v.id} style={{ fontSize: "0.85em", display: "flex", gap: "0.6em", alignItems: "baseline" }}>
              <span style={{ color: C.dim, fontVariantNumeric: "tabular-nums" }}>{v.date.slice(8, 10)}/{v.date.slice(5, 7)}</span>
              <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.clientName}</span>
              <span style={{ color: C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.fieldName}</span>
            </div>
          ))}
          {m.recentVisits.length === 0 && <div style={{ color: C.dim }}>Nenhuma visita registrada ainda.</div>}
        </div>
      </Card>
    </div>
  );
}


function SceneTempo({ weather }) {
  if (!weather?.days) return <Card><div style={{ color: C.dim }}>Carregando previsão…</div></Card>;
  const totalMm = Math.round(weather.days.reduce((s, d) => s + d.mm, 0));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.8em", height: "100%", minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: "0.7em", flex: 1, minHeight: 0 }}>
        {weather.days.map((d, i) => {
          const dt = new Date(`${d.date}T12:00:00`);
          const label = i === 0 ? "Hoje" : dt.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
          const wet = d.prob >= 60 || d.mm >= 5;
          return (
            <div key={d.date} style={{ background: C.card, border: `${i === 0 ? 2 : 1}px solid ${i === 0 ? C.green : C.border}`, borderRadius: "0.8em", padding: "0.5em 0.7em", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5em", minHeight: 0 }}>
              <div>
                <div style={{ fontSize: "0.7em", fontWeight: 700, letterSpacing: ".05em", color: i === 0 ? C.green : C.dim }}>{label.toUpperCase()} · {d.date.slice(8, 10)}/{d.date.slice(5, 7)}</div>
                <div style={{ fontSize: "1.3em", fontWeight: 800, lineHeight: 1.15 }}>{d.max}° <span style={{ color: C.dim, fontWeight: 600, fontSize: "0.75em" }}>{d.min}°</span></div>
                <div style={{ fontSize: "0.72em", color: wet ? C.blue : C.dim, fontWeight: wet ? 700 : 500 }}>chuva {d.prob}%{d.mm > 0 ? ` · ${d.mm} mm` : ""}</div>
              </div>
              <div style={{ fontSize: "2em" }}>{WMO_ICON(d.code)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: "0.85em", color: C.soft }}>
        Chuva prevista nos próximos 15 dias: <strong>{totalMm} mm</strong> · fonte Open-Meteo · São Gabriel do Oeste, MS
      </div>
    </div>
  );
}

function SceneMapa({ m }) {
  const all = m.geoFields.flatMap((f) => f.positions);
  if (all.length === 0) return <Card><div style={{ color: C.dim }}>Nenhum talhão com mapa (KML) cadastrado ainda.</div></Card>;
  // Enquadra o grupo principal de talhões; um talhão isolado e distante não deve afastar o zoom.
  const centers = m.geoFields.map((f) => ({
    f, lat: f.positions.reduce((s, p) => s + p[0], 0) / f.positions.length, lng: f.positions.reduce((s, p) => s + p[1], 0) / f.positions.length,
  }));
  const med = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  const mLat = med(centers.map((c) => c.lat)); const mLng = med(centers.map((c) => c.lng));
  const near = centers.filter((c) => Math.abs(c.lat - mLat) < 0.6 && Math.abs(c.lng - mLng) < 0.6);
  const pts = (near.length ? near : centers).flatMap((c) => c.f.positions);
  const lats = pts.map((p) => p[0]); const lngs = pts.map((p) => p[1]);
  const bounds = [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
  return (
    <div style={{ position: "relative", height: "100%", borderRadius: "0.9em", overflow: "hidden", border: `1px solid ${C.border}` }}>
      <MapContainer bounds={bounds} boundsOptions={{ padding: [30, 30] }} style={{ height: "100%", width: "100%" }}
        zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} keyboard={false} attributionControl={false}>
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
        {m.geoFields.map((f) => (
          <Polygon key={f.id} positions={f.positions} pathOptions={{ color: "#FFFFFF", weight: 1.5, fillColor: f.color, fillOpacity: 0.65 }} />
        ))}
        {centers.map((c) => (
          <CircleMarker key={`c-${c.f.id}`} center={[c.lat, c.lng]} radius={7} pathOptions={{ color: "#FFFFFF", weight: 2, fillColor: c.f.color, fillOpacity: 1 }} />
        ))}
      </MapContainer>
      <div style={{ position: "absolute", left: "1em", bottom: "1em", zIndex: 1000, background: "rgba(255,255,255,.92)", borderRadius: "0.7em", padding: "0.6em 0.9em", fontSize: "0.85em", display: "flex", gap: "1.1em" }}>
        <span><span style={{ color: CULTURE_COLOR.Soja }}>●</span> Soja</span>
        <span><span style={{ color: CULTURE_COLOR.Milho }}>●</span> Milho</span>
        <span><span style={{ color: "#5F6B5A" }}>●</span> Sem safra ativa</span>
        <span style={{ color: C.dim }}>{m.geoFields.length} talhões mapeados</span>
      </div>
    </div>
  );
}

export default function TvPage() {
  const key = useMemo(() => new URLSearchParams(window.location.search).get("k") || "", []);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [scene, setScene] = useState(0);
  const [avisoIdx, setAvisoIdx] = useState(0);
  const [weather, setWeather] = useState(null);
  const now = useNow();

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch(`/.netlify/functions/tv-data${key ? `?k=${encodeURIComponent(key)}` : ""}`, { cache: "no-store" });
        const body = await r.json();
        if (!alive) return;
        if (!r.ok) { setError(body?.error || "Não foi possível carregar a TV."); return; }
        setError(""); setOffline(false); setData(body);
      } catch {
        if (alive) setOffline(true);
      }
    }
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, [key]);

  // Recarrega a página de madrugada pra pegar versões novas do app.
  useEffect(() => {
    const t = setInterval(() => { const n = new Date(); if (n.getHours() === 4 && n.getMinutes() === 0 && n.getSeconds() < 5) window.location.reload(); }, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setAvisoIdx((i) => i + 1), 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadWeather() {
      try {
        const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-19.39&longitude=-54.56&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=America%2FCampo_Grande&forecast_days=16");
        const w = await r.json();
        if (alive && w?.current) {
          setWeather({
            temp: Math.round(w.current.temperature_2m), text: WMO(w.current.weather_code),
            max: Math.round(w.daily.temperature_2m_max[0]), min: Math.round(w.daily.temperature_2m_min[0]),
            rain: w.daily.precipitation_probability_max?.[0],
            days: w.daily.time.slice(0, 15).map((t, i) => ({
              date: t, code: w.daily.weather_code[i], max: Math.round(w.daily.temperature_2m_max[i]), min: Math.round(w.daily.temperature_2m_min[i]),
              prob: w.daily.precipitation_probability_max?.[i] ?? 0, mm: Math.round((w.daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
              wind: Math.round(w.daily.wind_speed_10m_max?.[i] ?? 0),
            })),
          });
        }
      } catch {}
    }
    loadWeather();
    const t = setInterval(loadWeather, WEATHER_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const m = useMemo(() => {
    if (!data) return null;
    const today = new Date();
    const todayIso = isoLocal(today);
    const weekAgo = isoLocal(addDays(today, -7));
    const { clients, properties, fields, harvests, visits, tasks, team } = data;
    const propById = new Map(properties.map((p) => [p.id, p]));
    const fieldById = new Map(fields.map((f) => [f.id, f]));
    const clientById = new Map(clients.map((c) => [c.id, c]));
    const teamById = new Map(team.map((t) => [t.id, t]));
    const harvestById = new Map(harvests.map((h) => [h.id, h]));

    const active = harvests.filter((h) => !(h.harvestDate && h.harvestDate <= todayIso));
    const activeByField = new Map();
    active.forEach((h) => { if (!activeByField.has(h.fieldId)) activeByField.set(h.fieldId, h); });

    const areaByCulture = {};
    let areaPlanted = 0;
    active.forEach((h) => {
      const f = fieldById.get(h.fieldId);
      const a = f ? fieldAreaHa(f) : 0;
      areaPlanted += a;
      areaByCulture[h.culture] = (areaByCulture[h.culture] || 0) + a;
    });
    const areaTotal = fields.reduce((s, f) => s + fieldAreaHa(f), 0);

    // visitas por cliente
    const fieldClient = (fid) => { const f = fieldById.get(fid); const p = f && propById.get(f.propertyId); return p ? clientById.get(p.clientId) : null; };
    const lastVisitByClient = {};
    visits.forEach((v) => {
      const h = harvestById.get(v.harvestId); const c = h ? fieldClient(h.fieldId) : null;
      if (c && (!lastVisitByClient[c.id] || v.date > lastVisitByClient[c.id])) lastVisitByClient[c.id] = v.date;
    });
    const clientHasKml = {};
    fields.forEach((f) => {
      const p = propById.get(f.propertyId);
      if (p && f.fieldMap?.mode === "kml" && f.fieldMap.points?.length >= 3) clientHasKml[p.clientId] = true;
    });
    const tracked = clients.filter((c) => clientHasKml[c.id]);
    const byGestorMap = new Map();
    tracked.forEach((c) => {
      const g = teamById.get(c.gestorId);
      if (!g) return;
      const e = byGestorMap.get(g.id) || { id: g.id, name: g.name, avatar: g.avatar, total: 0, ok: 0 };
      e.total += 1;
      if ((lastVisitByClient[c.id] || "") >= weekAgo) e.ok += 1;
      byGestorMap.set(g.id, e);
    });
    const late = tracked
      .filter((c) => (lastVisitByClient[c.id] || "") < weekAgo)
      .map((c) => ({ id: c.id, name: c.name, days: lastVisitByClient[c.id] ? daysBetween(todayIso, lastVisitByClient[c.id]) : null }))
      .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999));

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    const tasksByDay = {};
    tasks.forEach((t) => {
      if (!t.date) return;
      (tasksByDay[t.date] = tasksByDay[t.date] || []).push({
        ...t, clientName: t.clientId ? firstName(clientById.get(t.clientId)?.name) : "", assigneeName: teamById.get(t.assigneeId)?.name || "",
      });
    });
    Object.values(tasksByDay).forEach((arr) => arr.sort((a, b) => Number(a.done) - Number(b.done)));

    const recentVisits = [...visits].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((v) => {
      const h = harvestById.get(v.harvestId); const f = h && fieldById.get(h.fieldId); const c = h ? fieldClient(h.fieldId) : null;
      return { id: v.id, date: v.date, clientName: c?.name || "—", fieldName: f?.name || "" };
    });

    const geoFields = fields
      .filter((f) => f.fieldMap?.points?.length >= 3)
      .map((f) => {
        const h = activeByField.get(f.id);
        return { id: f.id, positions: f.fieldMap.points.map(([lat, lng]) => [lat, lng]), color: h ? CULTURE_COLOR[h.culture] || C.blue : "#5F6B5A" };
      });

    return {
      clients: clients.length, properties: properties.length, fields: fields.length, activeHarvests: active.length,
      areaTotal, areaPlanted, areaByCulture, byGestor: [...byGestorMap.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      late, weekDays, tasksByDay, recentVisits, geoFields, todayIso,
    };
  }, [data, now.getMinutes()]); // eslint-disable-line react-hooks/exhaustive-deps

  const avisos = data?.avisos?.length ? data.avisos : [];
  const aviso = avisos.length ? avisos[avisoIdx % avisos.length] : "";
  const dateRaw = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const dateLabel = dateRaw.charAt(0).toUpperCase() + dateRaw.slice(1);

  if (error) {
    return (
      <div style={{ position: "fixed", inset: 0, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", color: C.soft, fontSize: 22 }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, color: C.ink, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: "min(0.95vw, 1.7vh)", display: "flex", flexDirection: "column", overflow: "hidden", cursor: "none" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');"}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.7em 1.6em", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <img src="/logo-semear.png" alt="Semear Consultoria Agropecuária" style={{ height: "3.4em", width: "auto" }} />
        <div style={{ fontSize: "1.5em", fontWeight: 700, color: C.greenDark }}>{SCENES[scene].title}</div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "2.2em", fontWeight: 800, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{pad2(now.getHours())}:{pad2(now.getMinutes())}</div>
          <div style={{ fontSize: "0.85em", color: C.dim }}>{dateLabel}</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: "1.1em 1.6em" }}>
        {SCENES[scene].id === "tempo" ? (
          <SceneTempo weather={weather} />
        ) : !m ? (
          <div style={{ color: C.dim, fontSize: "1.2em" }}>Carregando…</div>
        ) : (
          <>
            {SCENES[scene].id === "painel" && <ScenePainel m={m} />}
            {SCENES[scene].id === "agenda" && <SceneAgenda m={m} />}
            {SCENES[scene].id === "mapa" && <SceneMapa key={`map-${scene}`} m={m} />}
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.6em", padding: "0.6em 1.6em", background: C.greenDark, color: "#EDEBE0", fontSize: "0.95em" }}>
        {weather && (
          <span style={{ whiteSpace: "nowrap" }}>
            São Gabriel do Oeste · <strong>{weather.temp}°C</strong> {weather.text} · {weather.min}°–{weather.max}°{weather.rain != null ? ` · chuva ${weather.rain}%` : ""}
          </span>
        )}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#FAC775" }}>{aviso}</span>
        {offline && <span style={{ color: "#F09595", whiteSpace: "nowrap" }}>sem conexão — mostrando últimos dados</span>}
        <span style={{ display: "flex", gap: "0.5em" }}>
          {SCENES.map((s, i) => (
            <span key={s.id} style={{ width: "0.7em", height: "0.7em", borderRadius: "50%", background: i === scene ? "#7BC142" : "rgba(255,255,255,.3)" }} />
          ))}
        </span>
      </div>
    </div>
  );
}
