// Netlify Scheduled Function: bb-reconcile-daily
//
// Roda sozinha todo dia (agendamento no export "config" abaixo) e concilia
// automaticamente entradas/saídas do extrato do Banco do Brasil com
// honorários e despesas "Pendente" que batem no valor — o mesmo que o botão
// "Buscar automaticamente" da tela de Conciliação já faz manualmente, só que
// sem precisar abrir o app. Só confirma pagamento quando o valor é idêntico
// a um lançamento pendente já cadastrado; nunca cria uma despesa nova
// sozinha (isso continua exigindo revisão humana na tela de Conciliação, já
// que exigiria adivinhar categoria/descrição sem confirmação de ninguém).
//
// Usa o mesmo certificado (cert.pem/key.pem no bucket "secrets" do Supabase)
// e as mesmas variáveis de ambiente já configuradas pra função bb-extrato —
// nada novo pra cadastrar. Como quem chama essa função é o próprio agendador
// do Netlify (não um usuário logado), ela usa a service_role key direto, sem
// checar sessão/Authorization.
import https from "node:https";
import tls from "node:tls";
import { createClient } from "@supabase/supabase-js";

export const config = { schedule: "0 10 * * *" }; // 10:00 UTC = 06:00 em Mato Grosso do Sul (UTC-4)

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BB_OAUTH_URL = process.env.BB_OAUTH_URL || "https://oauth.bb.com.br/oauth/token";
const BB_API_BASE_URL = process.env.BB_API_BASE_URL || "https://extratos.mtls.api.bb.com.br/v2";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function downloadSecret(adminClient, fileName) {
  const { data: blob, error } = await adminClient.storage.from("secrets").download(fileName);
  if (error || !blob) return null;
  return Buffer.from(await blob.arrayBuffer());
}

async function getMtlsAgent(adminClient) {
  const [cert, key] = await Promise.all([
    downloadSecret(adminClient, "cert.pem"),
    downloadSecret(adminClient, "key.pem"),
  ]);
  if (!cert || !key) return null;
  tls.createSecureContext({ cert, key });
  return new https.Agent({ cert, key });
}

function httpsRequestJson(url, { method = "GET", headers = {}, body = null, agent }) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers, agent }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function ddmmyyyy(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}${m}${y}`;
}

async function getAccessToken(agent) {
  const basic = Buffer.from(`${process.env.BB_CLIENT_ID}:${process.env.BB_CLIENT_SECRET}`).toString("base64");
  const body = "grant_type=client_credentials&scope=extrato-info";
  const res = await httpsRequestJson(BB_OAUTH_URL, {
    method: "POST",
    agent,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basic}`,
      "Content-Length": Buffer.byteLength(body),
    },
    body,
  });
  if (res.statusCode !== 200 || !res.body?.access_token) {
    throw new Error(`Falha ao autenticar no BB (HTTP ${res.statusCode}): ${JSON.stringify(res.body)}`);
  }
  return res.body.access_token;
}

async function fetchExtrato(agent, token, dataInicio, dataFim) {
  const path = `/conta-corrente/agencia/${process.env.BB_AGENCIA}/conta/${process.env.BB_CONTA}`
    + `?gw-dev-app-key=${encodeURIComponent(process.env.BB_APP_KEY)}`
    + `&dataInicioSolicitacao=${ddmmyyyy(dataInicio)}&dataFimSolicitacao=${ddmmyyyy(dataFim)}`;
  const res = await httpsRequestJson(`${BB_API_BASE_URL}${path}`, {
    method: "GET",
    agent,
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (res.statusCode !== 200) {
    throw new Error(`Falha ao buscar extrato (HTTP ${res.statusCode}): ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

function normalizeTransactions(raw) {
  const list = raw?.listaLancamento || raw?.lancamentos || [];
  return list
    .filter((item) => {
      const tipo = String(item.indicadorTipoLancamento ?? "");
      return ["1", "2", "3"].includes(tipo) && item.indicadorSinalLancamento !== "*";
    })
    .map((item) => {
      const amount = Math.abs(Number(item.valorLancamento ?? 0));
      const day = String(item.dataLancamento ?? "").padStart(8, "0");
      const date = day.length === 8 ? `${day.slice(4, 8)}-${day.slice(2, 4)}-${day.slice(0, 2)}` : null;
      return { date, amount, type: item.indicadorSinalLancamento === "C" ? "credit" : "debit" };
    })
    .filter((t) => t.date && t.amount > 0);
}

async function getBlob(adminClient, key, fallback) {
  const { data } = await adminClient.from("agrotrack_data").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}

async function setBlob(adminClient, key, value) {
  await adminClient.from("agrotrack_data").upsert({ key, value, updated_at: new Date().toISOString() });
}

export const handler = async () => {
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("bb-reconcile-daily: configuração incompleta (variáveis do Supabase ausentes).");
    return { statusCode: 200 };
  }
  const missing = ["BB_CLIENT_ID", "BB_CLIENT_SECRET", "BB_APP_KEY", "BB_AGENCIA", "BB_CONTA"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`bb-reconcile-daily: faltando variáveis: ${missing.join(", ")}`);
    return { statusCode: 200 };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const agent = await getMtlsAgent(adminClient);
    if (!agent) {
      console.error('bb-reconcile-daily: certificado mTLS não encontrado (cert.pem/key.pem no bucket "secrets").');
      return { statusCode: 200 };
    }
    const token = await getAccessToken(agent);

    // Busca os últimos 7 dias (não só "hoje") pra não perder nada se o job
    // falhar num dia ou um lançamento demorar a aparecer no extrato.
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    const toISO = (d) => d.toISOString().slice(0, 10);
    const raw = await fetchExtrato(agent, token, toISO(start), toISO(today));
    const transactions = normalizeTransactions(raw);

    const [finances, bills, activityLog, clients] = await Promise.all([
      getBlob(adminClient, "finances", []),
      getBlob(adminClient, "bills", []),
      getBlob(adminClient, "activityLog", []),
      getBlob(adminClient, "clients", []),
    ]);

    const usedCreditTx = new Set();
    const usedDebitTx = new Set();
    const nowIso = new Date().toISOString();
    const newLogEntries = [];
    let matchedCount = 0;

    const nextFinances = finances.map((f) => {
      if (f.status !== "pendente") return f;
      const t = transactions.find((tx) => tx.type === "credit" && !usedCreditTx.has(tx) && Math.abs(Number(f.amount) - tx.amount) < 0.01);
      if (!t) return f;
      usedCreditTx.add(t);
      matchedCount++;
      const client = clients.find((c) => c.id === f.clientId);
      newLogEntries.push({
        id: uid(), at: nowIso, userId: null, userName: "Conciliação automática",
        action: "update", entityType: "finance", entityName: client?.name || "(sem nome)",
        details: `Conciliado via extrato (automático) · R$ ${Number(f.amount).toLocaleString("pt-BR")} em ${t.date}`,
      });
      return { ...f, status: "pago", date: t.date, reconciledBank: true, reconciledAt: nowIso };
    });

    const nextBills = bills.map((b) => {
      if (b.status !== "pendente") return b;
      const t = transactions.find((tx) => tx.type === "debit" && !usedDebitTx.has(tx) && Math.abs(Number(b.amount) - tx.amount) < 0.01);
      if (!t) return b;
      usedDebitTx.add(t);
      matchedCount++;
      newLogEntries.push({
        id: uid(), at: nowIso, userId: null, userName: "Conciliação automática",
        action: "update", entityType: "bill", entityName: b.description || "(sem nome)",
        details: `Conciliado via extrato (automático) · R$ ${Number(b.amount).toLocaleString("pt-BR")} em ${t.date}`,
      });
      return { ...b, status: "pago", date: t.date, reconciledBank: true, reconciledAt: nowIso };
    });

    if (matchedCount > 0) {
      await Promise.all([
        setBlob(adminClient, "finances", nextFinances),
        setBlob(adminClient, "bills", nextBills),
        setBlob(adminClient, "activityLog", [...activityLog, ...newLogEntries]),
      ]);
    }

    console.log(`bb-reconcile-daily: ${transactions.length} lançamento(s) no extrato (últimos 7 dias), ${matchedCount} conciliado(s) automaticamente.`);
    return { statusCode: 200 };
  } catch (e) {
    console.error("bb-reconcile-daily falhou:", e?.message || e);
    return { statusCode: 200 };
  }
};
