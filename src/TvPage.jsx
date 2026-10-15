// Página /tv — painel da TV corporativa da Semear. Abre em tela cheia, sem login
// (usa o link privado ?k=...), atualiza sozinha e alterna as telas a cada 20 s.
// Não mostra nada de financeiro.
import React, { useEffect, useMemo, useState } from "react";

const SCENES = [
  { id: "painel", title: "Painel geral" },
  { id: "cotacoes", title: "Cotações" },
  { id: "agenda", title: "Agenda e visitas" },
  { id: "mapa", title: "Mapa das fazendas" },
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
              <span style={{ display: "flex", alignItems: "center", gap: "0.55em", minWidth: 0 }}>
                {c.gestorName && <Avatar name={c.gestorName} url={c.gestorAvatar} size="1.9em" />}
                <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              </span>
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
                  {t.clientName && <div style={{ color: C.dim, marginTop: "0.15em" }}>{t.clientName}</div>}
                  {t.assigneeName && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4em", marginTop: "0.35em" }}>
                      <Avatar name={t.assigneeName} url={t.assigneeAvatar} size="1.8em" />
                      <span style={{ color: C.soft, fontWeight: 600 }}>{firstName(t.assigneeName)}</span>
                    </div>
                  )}
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
            <div key={v.id} style={{ fontSize: "0.85em", display: "flex", gap: "0.6em", alignItems: "center" }}>
              {v.personName && <Avatar name={v.personName} url={v.personAvatar} size="1.9em" />}
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



const fmtBRL = (n, d = 2) => (n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }));
function Variation({ pct, big }) {
  if (pct == null || Number.isNaN(pct)) return null;
  const up = pct >= 0;
  return (
    <span style={{ color: up ? C.green : C.red, fontWeight: 700, fontSize: big ? "1.1em" : "0.9em" }}>
      {up ? "▲" : "▼"} {Math.abs(pct).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
    </span>
  );
}
function QuoteCard({ title, sub, value, unit, line2, pct }) {
  return (
    <Card style={{ justifyContent: "space-between", gap: "2.2em", padding: "1.4em 1.4em" }}>
      <div>
        <div style={{ fontSize: "0.8em", fontWeight: 700, letterSpacing: ".06em", color: C.dim }}>{title}</div>
        <div style={{ fontSize: "0.8em", color: C.dim }}>{sub}</div>
      </div>
      <div>
        <div style={{ fontSize: "3.2em", fontWeight: 800, lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
          {value} <span style={{ fontSize: "0.3em", color: C.dim, fontWeight: 600 }}>{unit}</span>
        </div>
        <div style={{ marginTop: "0.3em" }}><Variation pct={pct} big /></div>
      </div>
      <div style={{ fontSize: "0.85em", color: C.soft }}>{line2}</div>
    </Card>
  );
}
function SceneCotacoes({ q }) {
  if (!q) return <Card><div style={{ color: C.dim }}>Cotações indisponíveis no momento.</div></Card>;
  const { sojaNov, sojaMar, milhoB3, dolar } = q;
  const pctDolar = dolar?.anterior ? ((dolar.atual - dolar.anterior) / dolar.anterior) * 100 : null;
  const upd = [sojaNov?.updatedAt, dolar?.updatedAt].filter(Boolean).sort().pop();
  const hora = upd ? new Date(upd).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.8em", height: "100%", minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1em", flex: 1, minHeight: 0, alignItems: "center" }}>
        {sojaNov && <QuoteCard title="SOJA · NOVEMBRO" sub="CBOT · Chicago" value={fmtBRL(sojaNov.ultima / 100)} unit="US$/bu" pct={sojaNov.pct} line2={`≈ R$ ${fmtBRL(sojaNov.sacaBrl)} por saca de 60 kg`} />}
        {sojaMar && <QuoteCard title="SOJA · MARÇO" sub="CBOT · Chicago" value={fmtBRL(sojaMar.ultima / 100)} unit="US$/bu" pct={sojaMar.pct} line2={`≈ R$ ${fmtBRL(sojaMar.sacaBrl)} por saca de 60 kg`} />}
        {milhoB3 && <QuoteCard title="MILHO · B3" sub={milhoB3.mes} value={`R$ ${fmtBRL(milhoB3.ultima)}`} unit="/saca 60 kg" pct={milhoB3.pct} line2="Fechamento do último pregão" />}
        {dolar && <QuoteCard title="DÓLAR · HOJE" sub="USD/BRL à vista" value={`R$ ${fmtBRL(dolar.atual, 4)}`} unit="" pct={pctDolar} line2={dolar.ptax ? `PTAX ${fmtBRL(dolar.ptax, 4)} (${String(dolar.ptaxData || "").split("-").reverse().slice(0, 2).join("/")})` : ""} />}
      </div>
      <div style={{ fontSize: "0.8em", color: C.dim }}>
        Soja CBOT e dólar via mercado (podem ter atraso de alguns minutos) · Milho B3: fechamento do pregão anterior{hora ? ` · atualizado às ${hora}` : ""}
      </div>
    </div>
  );
}

// Cor do card do dia: azul mais forte quanto mais chuva; amarelo nos dias de sol; cinza nos nublados secos.
function tintDoDia(d) {
  if (d.mm >= 15) return { bg: "#B9D6F3", border: "#5B9BD5" };
  if (d.mm >= 8 || (d.prob >= 85 && d.mm >= 4)) return { bg: "#CCE1F6", border: "#7DB0E0" };
  if (d.mm >= 3 || d.prob >= 70) return { bg: "#DDEBF9", border: "#9CC3EA" };
  if (d.mm >= 0.5 || d.prob >= 40) return { bg: "#EDF4FB", border: "#BFD7F0" };
  if (d.code <= 1) return { bg: "#FFF1B8", border: "#F2D45C" };
  if (d.code === 2) return { bg: "#FFF8DA", border: "#EFDFA0" };
  return { bg: "#EEF0EA", border: "#D6D9D0" };
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
            <div key={d.date} style={{ background: tintDoDia(d).bg, border: `${i === 0 ? 3 : 1}px solid ${i === 0 ? C.green : tintDoDia(d).border}`, borderRadius: "0.8em", padding: "0.5em 0.7em", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5em", minHeight: 0 }}>
              <div>
                <div style={{ fontSize: "0.7em", fontWeight: 700, letterSpacing: ".05em", color: i === 0 ? C.green : C.dim }}>{label.toUpperCase()} · {d.date.slice(8, 10)}/{d.date.slice(5, 7)}</div>
                <div style={{ fontSize: "1.3em", fontWeight: 800, lineHeight: 1.15 }}>{d.max}° <span style={{ color: C.dim, fontWeight: 600, fontSize: "0.75em" }}>{d.min}°</span></div>
                <div style={{ fontSize: "0.72em", color: wet ? "#1F5F9E" : C.soft, fontWeight: wet ? 700 : 500 }}>chuva {d.prob}%{d.mm > 0 ? ` · ${d.mm.toLocaleString("pt-BR")} mm` : ""}</div>
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

const MAP_OVERVIEW_S = 5;
const MAP_FIELD_S = 3.75;
const MAP_FIELDS_PER_ROUND = 4;

// Sorteia algumas fazendas a cada passagem (a tela inteira dura ~20 s); dá preferência às com safra ativa.
function pickFocusFields(m) {
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const active = shuffle(m.geoProps.filter((p) => p.active));
  const rest = shuffle(m.geoProps.filter((p) => !p.active));
  return [...active, ...rest].slice(0, MAP_FIELDS_PER_ROUND);
}

// --- Mapa por imagem única -------------------------------------------------------------
// Em vez de um mapa com dezenas de "tiles" (que travava em TVs lentas), cada visão é UMA imagem
// de satélite pedida ao serviço de imagens da Esri, com os contornos desenhados por cima em SVG.
const EXPORT_URL = "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export";
const IMG_W = 1600;

function merc(lat, lng) {
  const x = (lng * 20037508.34) / 180;
  const y = (Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180)) * 20037508.34 / 180;
  return [x, y];
}

function boundsOfPositions(pos) {
  const lats = pos.map((p) => p[0]); const lngs = pos.map((p) => p[1]);
  return [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
}

// Enquadra o grupo principal de talhões; um talhão isolado e distante não deve afastar o zoom.
function overviewBoundsOf(m) {
  const centers = m.geoFields.map((f) => ({
    f, lat: f.positions.reduce((s, p) => s + p[0], 0) / f.positions.length, lng: f.positions.reduce((s, p) => s + p[1], 0) / f.positions.length,
  }));
  const med = (arr) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];
  const mLat = med(centers.map((c) => c.lat)); const mLng = med(centers.map((c) => c.lng));
  const near = centers.filter((c) => Math.abs(c.lat - mLat) < 0.6 && Math.abs(c.lng - mLng) < 0.6);
  const pts = (near.length ? near : centers).flatMap((c) => c.f.positions);
  return { centers, overview: boundsOfPositions(pts) };
}

// Caixa (em metros, Web Mercator) com a proporção da tela e uma folga em volta.
function viewBox(bounds, aspect, padFrac, minWidthM) {
  const [x0, y0] = merc(bounds[0][0], bounds[0][1]);
  const [x1, y1] = merc(bounds[1][0], bounds[1][1]);
  let w = Math.max(x1 - x0, minWidthM) * (1 + padFrac * 2);
  let h = Math.max(y1 - y0, minWidthM / aspect) * (1 + padFrac * 2);
  if (w / h < aspect) w = h * aspect; else h = w / aspect;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const box = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
  const H = Math.round(IMG_W / aspect);
  const url = `${EXPORT_URL}?bbox=${box.map((v) => v.toFixed(1)).join(",")}&bboxSR=3857&imageSR=3857&size=${IMG_W},${H}&format=jpg&f=image`;
  return { box, url, W: IMG_W, H };
}

function mapAspect() {
  // Área útil do mapa: tela menos cabeçalho, rodapé e margens.
  const w = Math.max(600, window.innerWidth - 56);
  const h = Math.max(300, window.innerHeight - 0.2 * window.innerHeight - 40);
  return Math.max(1.4, Math.min(2.4, w / h));
}

// Todas as visões da rodada: regional + fazendas sorteadas.
function mapViews(m, picks) {
  const aspect = mapAspect();
  const { centers, overview } = overviewBoundsOf(m);
  return {
    centers,
    overview: viewBox(overview, aspect, 0.06, 4000),
    fazendas: (picks || []).map((f) => ({ f, ...viewBox(boundsOfPositions(f.positions), aspect, 0.18, 1800) })),
  };
}

const prefetchCache = [];
function prefetchMapViews(m, picks) {
  try {
    const v = mapViews(m, picks);
    prefetchCache.length = 0;
    [v.overview, ...v.fazendas].forEach((x, i) => setTimeout(() => {
      const img = new Image();
      img.src = x.url;
      prefetchCache.push(img);
    }, i * 500));
  } catch {}
}


function SceneMapa({ m, picks }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const views = useMemo(() => (m.geoFields.length ? mapViews(m, picks) : null), []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!views) return <Card><div style={{ color: C.dim }}>Nenhum talhão com mapa (KML) cadastrado ainda.</div></Card>;
  const focus = views.fazendas;
  // Primeiro a visão regional; depois zoom rápido em algumas fazendas sorteadas.
  const step = tick < MAP_OVERVIEW_S ? -1 : Math.min(focus.length - 1, Math.floor((tick - MAP_OVERVIEW_S) / MAP_FIELD_S));
  const currentView = step >= 0 ? focus[step] : null;
  const current = currentView?.f || null;
  const view = currentView || views.overview;

  const toPx = (lat, lng) => {
    const [x, y] = merc(lat, lng);
    return [((x - view.box[0]) / (view.box[2] - view.box[0])) * view.W, ((view.box[3] - y) / (view.box[3] - view.box[1])) * view.H];
  };

  return (
    <div style={{ position: "relative", height: "100%", borderRadius: "0.9em", overflow: "hidden", border: `1px solid ${C.border}`, background: "#31402a" }}>
      {[views.overview, ...focus].map((v, i) => {
        const ativa = (i === 0 && !currentView) || (i > 0 && currentView === v);
        return <img key={i} src={v.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: ativa ? 1 : 0, transition: "opacity .5s" }} />;
      })}
      <svg viewBox={`0 0 ${view.W} ${view.H}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {m.geoFields.map((f) => {
          const emFoco = !!current && current.fieldIds.includes(f.id);
          const pts = f.positions.map(([lat, lng]) => toPx(lat, lng));
          if (pts.every(([x, y]) => x < -50 || x > view.W + 50 || y < -50 || y > view.H + 50)) return null;
          return (
            <polygon key={f.id} points={pts.map((p) => p.join(",")).join(" ")}
              fill={f.color} fillOpacity={emFoco ? 0.12 : f.active ? 0.5 : 0.25}
              stroke={emFoco ? "#FFE082" : "#FFFFFF"} strokeWidth={emFoco ? 4 : 1.6} strokeLinejoin="round" />
          );
        })}
        {!current && views.centers.map((c) => {
          const [x, y] = toPx(c.lat, c.lng);
          return <circle key={`c-${c.f.id}`} cx={x} cy={y} r={9} fill={c.f.color} stroke="#FFFFFF" strokeWidth={2.5} />;
        })}
      </svg>
      {current ? (
        <div style={{ position: "absolute", left: "1em", bottom: "1em", zIndex: 5, background: "rgba(255,255,255,.95)", borderRadius: "0.8em", padding: "0.7em 1.1em", minWidth: "18em" }}>
          <div style={{ fontSize: "0.7em", fontWeight: 700, letterSpacing: ".06em", color: C.dim }}>
            FAZENDA · {current.nFields} {current.nFields === 1 ? "TALHÃO" : "TALHÕES"}{current.areaHa ? ` · ${fmtHa(current.areaHa)}` : ""}
          </div>
          <div style={{ fontSize: "1.3em", fontWeight: 800, lineHeight: 1.15 }}>{current.name}</div>
          <div style={{ fontSize: "0.85em", color: C.soft }}>{[current.clientName, current.cultures.join(" · ")].filter(Boolean).join(" · ")}</div>
        </div>
      ) : (
        <div style={{ position: "absolute", left: "1em", bottom: "1em", zIndex: 5, background: "rgba(255,255,255,.92)", borderRadius: "0.7em", padding: "0.6em 0.9em", fontSize: "0.85em", display: "flex", gap: "1.1em" }}>
          <span><span style={{ color: CULTURE_COLOR.Soja }}>●</span> Soja</span>
          <span><span style={{ color: CULTURE_COLOR.Milho }}>●</span> Milho</span>
          <span><span style={{ color: "#5F6B5A" }}>●</span> Sem safra ativa</span>
          <span style={{ color: C.dim }}>{m.geoFields.length} talhões mapeados</span>
        </div>
      )}
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
  const [soundOn, setSoundOn] = useState(() => { try { return localStorage.getItem("semear_tv_som") !== "off"; } catch { return true; } });
  const [needsClick, setNeedsClick] = useState(false);
  const audioRef = React.useRef(null);
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
      .map((c) => ({ id: c.id, name: c.name, gestorName: teamById.get(c.gestorId)?.name || "", gestorAvatar: teamById.get(c.gestorId)?.avatar || null, days: lastVisitByClient[c.id] ? daysBetween(todayIso, lastVisitByClient[c.id]) : null }))
      .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999));

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    const tasksByDay = {};
    tasks.forEach((t) => {
      if (!t.date) return;
      (tasksByDay[t.date] = tasksByDay[t.date] || []).push({
        ...t, clientName: t.clientId ? firstName(clientById.get(t.clientId)?.name) : "", assigneeName: teamById.get(t.assigneeId)?.name || "", assigneeAvatar: teamById.get(t.assigneeId)?.avatar || null,
      });
    });
    Object.values(tasksByDay).forEach((arr) => arr.sort((a, b) => Number(a.done) - Number(b.done)));

    const recentVisits = [...visits].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((v) => {
      const h = harvestById.get(v.harvestId); const f = h && fieldById.get(h.fieldId); const c = h ? fieldClient(h.fieldId) : null;
      const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const tech = norm(v.technician);
      const person = team.find((t) => tech && (norm(t.name) === tech || norm(t.name).startsWith(tech) || tech.startsWith(norm(t.name).split(" ")[0]))) || teamById.get(c?.gestorId) || null;
      return { id: v.id, date: v.date, clientName: c?.name || "—", fieldName: f?.name || "", personName: person?.name || v.technician || "", personAvatar: person?.avatar || null };
    });

    const geoFields = fields
      .filter((f) => f.fieldMap?.points?.length >= 3)
      .map((f) => {
        const h = activeByField.get(f.id);
        const p = propById.get(f.propertyId); const c = p ? clientById.get(p.clientId) : null;
        return {
          id: f.id, propertyId: f.propertyId, positions: f.fieldMap.points.map(([lat, lng]) => [lat, lng]), color: h ? CULTURE_COLOR[h.culture] || C.blue : "#5F6B5A",
          active: !!h, culture: h?.culture || "", fieldName: f.name, clientName: c?.name || "", propertyName: p?.name || "", areaHa: fieldAreaHa(f),
        };
      });

    const propMap = new Map();
    geoFields.forEach((g) => {
      const p = propById.get(g.propertyId); const c = p ? clientById.get(p.clientId) : null;
      const e = propMap.get(g.propertyId) || { id: g.propertyId, name: p?.name || "Fazenda", clientName: c?.name || "", positions: [], fieldIds: [], nFields: 0, areaHa: 0, cultures: new Set(), active: false };
      e.positions.push(...g.positions); e.fieldIds.push(g.id); e.nFields += 1; e.areaHa += g.areaHa || 0;
      if (g.culture) e.cultures.add(g.culture);
      if (g.active) e.active = true;
      propMap.set(g.propertyId, e);
    });
    const geoProps = [...propMap.values()].map((e) => ({ ...e, cultures: [...e.cultures] }));

    return {
      geoProps,
      clients: clients.length, properties: properties.length, fields: fields.length, activeHarvests: active.length,
      areaTotal, areaPlanted, areaByCulture, byGestor: [...byGestorMap.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      late, weekDays, tasksByDay, recentVisits, geoFields, todayIso,
    };
  }, [data, now.getMinutes()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const dur = SCENE_MS;
    const t = setTimeout(() => setScene((s) => (s + 1) % SCENES.length), dur);
    return () => clearTimeout(t);
  }, [scene, !!m]); // eslint-disable-line react-hooks/exhaustive-deps

  // Música de fundo: o navegador só libera som depois do primeiro clique/tecla na página
  // (regra de autoplay). Tenta tocar sozinho e, se bloquear, o primeiro toque liga.
  const radioUrl = data?.radio?.url || "";
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !radioUrl) return;
    if (!soundOn) { a.pause(); return; }
    a.volume = 0.5;
    a.play().then(() => setNeedsClick(false)).catch(() => setNeedsClick(true));
  }, [radioUrl, soundOn]);
  useEffect(() => {
    if (!needsClick || !soundOn) return undefined;
    const kick = () => audioRef.current?.play().then(() => setNeedsClick(false)).catch(() => {});
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return () => { window.removeEventListener("pointerdown", kick); window.removeEventListener("keydown", kick); };
  }, [needsClick, soundOn]);
  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem("semear_tv_som", next ? "on" : "off"); } catch {}
  }

  // Sorteia as fazendas do mapa e baixa as imagens uma tela antes, pra a TV não esperar na hora.
  const [mapPicks, setMapPicks] = useState(null);
  useEffect(() => {
    if (!m || m.geoFields.length === 0) return;
    const mapIdx = SCENES.findIndex((x) => x.id === "mapa");
    const antes = (mapIdx - 1 + SCENES.length) % SCENES.length;
    if (mapPicks === null || scene === antes) {
      const picks = pickFocusFields(m);
      setMapPicks(picks);
      prefetchMapViews(m, picks);
    }
  }, [scene, !!m]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div style={{ position: "fixed", inset: 0, background: C.bg, color: C.ink, fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", fontSize: "min(0.95vw, 1.7vh)", display: "flex", flexDirection: "column", overflow: "hidden", cursor: "pointer" }} onClick={() => setScene((x) => (x + 1) % SCENES.length)}>
      {radioUrl && <audio ref={audioRef} src={radioUrl} preload="none" />}
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
        ) : SCENES[scene].id === "cotacoes" ? (
          <SceneCotacoes q={data?.cotacoes} />
        ) : !m ? (
          <div style={{ color: C.dim, fontSize: "1.2em" }}>Carregando…</div>
        ) : (
          <>
            {SCENES[scene].id === "painel" && <ScenePainel m={m} />}
            {SCENES[scene].id === "agenda" && <SceneAgenda m={m} />}
            {SCENES[scene].id === "mapa" && <SceneMapa key={`map-${scene}`} m={m} picks={mapPicks} />}
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
        {radioUrl && (
          <button onClick={(e) => { e.stopPropagation(); toggleSound(); }} style={{ background: "rgba(255,255,255,.12)", border: "none", color: "#EDEBE0", borderRadius: 99, padding: "0.2em 0.9em", fontSize: "0.85em", fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" }}>
            {!soundOn ? "🔇 Música desligada" : needsClick ? "🔈 Toque para ativar a música" : `🎵 ${data.radio.name}`}
          </button>
        )}
        <span style={{ display: "flex", gap: "0.5em" }}>
          {SCENES.map((s, i) => (
            <span key={s.id} style={{ width: "0.7em", height: "0.7em", borderRadius: "50%", background: i === scene ? "#7BC142" : "rgba(255,255,255,.3)" }} />
          ))}
        </span>
      </div>
    </div>
  );
}
