// Netlify Function: bb-extrato
//
// Busca o extrato da conta corrente do Banco do Brasil (API Extratos v2) de
// forma automática, usando OAuth2 (client_credentials) + mTLS (certificado
// do CNPJ). Só quem é master/administrador pode chamar.
//
// Variáveis de ambiente necessárias (Site settings > Environment variables,
// nunca no código):
//   BB_CLIENT_ID          - Client ID de Produção (portal Developers BB)
//   BB_CLIENT_SECRET       - Client Secret de Produção
//   BB_APP_KEY              - App Key / Developer Application Key
//   BB_CERT_PFX_BASE64      - certificado .pfx (A1) convertido pra base64
//   BB_CERT_PASSPHRASE      - senha do certificado .pfx
//   BB_AGENCIA               - agência da conta corrente
//   BB_CONTA                  - número da conta corrente (com dígito, se houver)
// Opcionais (só se o host padrão abaixo não funcionar, ajustar sem precisar mexer no código):
//   BB_OAUTH_URL             - default: https://oauth.bb.com.br/oauth/token
//   BB_API_BASE_URL          - default: https://api-extratos.bb.com.br
import https from "node:https";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BB_OAUTH_URL = process.env.BB_OAUTH_URL || "https://oauth.bb.com.br/oauth/token";
const BB_API_BASE_URL = process.env.BB_API_BASE_URL || "https://api-extratos.bb.com.br";

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function getPfxBase64() {
  // Netlify limita cada variável a 5000 caracteres, então o certificado pode
  // vir inteiro em BB_CERT_PFX_BASE64 (se couber) ou dividido em
  // BB_CERT_PFX_BASE64_1, BB_CERT_PFX_BASE64_2, ... (nessa ordem).
  if (process.env.BB_CERT_PFX_BASE64) return process.env.BB_CERT_PFX_BASE64;
  const parts = [];
  let i = 1;
  while (process.env[`BB_CERT_PFX_BASE64_${i}`]) {
    parts.push(process.env[`BB_CERT_PFX_BASE64_${i}`]);
    i++;
  }
  return parts.length > 0 ? parts.join("") : null;
}

function getMtlsAgent() {
  const pfxBase64 = getPfxBase64();
  const passphrase = process.env.BB_CERT_PASSPHRASE;
  if (!pfxBase64 || !passphrase) return null;
  return new https.Agent({ pfx: Buffer.from(pfxBase64, "base64"), passphrase });
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
  const clientId = process.env.BB_CLIENT_ID;
  const clientSecret = process.env.BB_CLIENT_SECRET;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
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
  const agencia = process.env.BB_AGENCIA;
  const conta = process.env.BB_CONTA;
  const appKey = process.env.BB_APP_KEY;
  const path = `/extratos/v2/conta-corrente/agencia/${agencia}/conta/${conta}`
    + `?gw-dev-app-key=${encodeURIComponent(appKey)}`
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
  return list.map((item) => {
    const amount = Number(item.valorLancamento ?? item.valor ?? 0);
    const isCredit = (item.indicadorSinalLancamento || item.tipoLancamento) === "C" || amount > 0;
    const day = String(item.data ?? item.dataLancamento ?? "").padStart(8, "0");
    const date = day.length === 8 ? `${day.slice(4, 8)}-${day.slice(2, 4)}-${day.slice(0, 2)}` : null;
    return {
      date,
      amount: Math.abs(amount),
      description: item.textoDescricaoHistorico || item.descricao || "",
      type: isCredit ? "credit" : "debit",
    };
  }).filter((t) => t.date);
}

export const handler = async (event) => {
  if (event.httpMethod !== "GET") return json({ error: "Método não permitido." }, 405);

  const missing = ["BB_CLIENT_ID", "BB_CLIENT_SECRET", "BB_APP_KEY", "BB_CERT_PASSPHRASE", "BB_AGENCIA", "BB_CONTA"]
    .filter((k) => !process.env[k]);
  if (!getPfxBase64()) missing.push("BB_CERT_PFX_BASE64 (ou BB_CERT_PFX_BASE64_1, _2, ...)");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || missing.length > 0) {
    return json({ error: `Configuração do servidor incompleta. Faltando: ${missing.join(", ") || "variáveis do Supabase"}.` }, 500);
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return json({ error: "Não autenticado." }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Sessão inválida." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerProfile } = await adminClient.from("profiles").select("role").eq("id", caller.id).single();
  if (!callerProfile || (callerProfile.role !== "master" && callerProfile.role !== "administrador")) {
    return json({ error: "Sem permissão para acessar o financeiro." }, 403);
  }

  const params = event.queryStringParameters || {};
  const today = new Date().toISOString().slice(0, 10);
  const dataInicio = params.dataInicio || today.slice(0, 8) + "01";
  const dataFim = params.dataFim || today;

  try {
    const agent = getMtlsAgent();
    if (!agent) return json({ error: "Certificado mTLS não configurado no servidor." }, 500);
    const token = await getAccessToken(agent);
    const raw = await fetchExtrato(agent, token, dataInicio, dataFim);
    const transactions = normalizeTransactions(raw);
    return json({ transactions });
  } catch (e) {
    return json({ error: e?.message || "Falha ao buscar extrato do BB." }, 502);
  }
};
