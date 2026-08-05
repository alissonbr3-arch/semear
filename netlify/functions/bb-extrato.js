// Netlify Function: bb-extrato
//
// Busca o extrato da conta corrente do Banco do Brasil (API Extratos v2) de
// forma automática, usando OAuth2 (client_credentials) + mTLS (certificado
// do CNPJ). Só quem é master/administrador pode chamar.
//
// O certificado NÃO fica em variável de ambiente — o Lambda usado pelo
// Netlify limita o total de variáveis de ambiente a 4KB, bem menos que um
// certificado. Em vez disso, fica guardado no Supabase Storage, num bucket
// privado chamado "secrets" (só a service_role consegue ler, nunca o
// navegador).
//
// Importante: NÃO subimos o .pfx original aqui. Certificados e-CNPJ antigos
// costumam usar uma cifra legada (RC2-40) dentro do PKCS12 que o OpenSSL 3
// (usado pelo Node 18+) recusa abrir por padrão ("Unsupported PKCS12 PFX
// data"), mesmo com o arquivo íntegro. Pra contornar isso, extraia certificado
// e chave como dois arquivos .pem separados (usando a flag -legacy do
// openssl, que ainda sabe abrir a cifra antiga) e suba os DOIS pro bucket
// "secrets" com esses nomes exatos:
//
//   openssl pkcs12 -in zanella.pfx -clcerts -nokeys -legacy -out cert.pem
//   openssl pkcs12 -in zanella.pfx -nocerts -nodes   -legacy -out key.pem
//
// Variáveis de ambiente necessárias (Site settings > Environment variables,
// nunca no código):
//   BB_CLIENT_ID       - Client ID de Produção (portal Developers BB)
//   BB_CLIENT_SECRET   - Client Secret de Produção
//   BB_APP_KEY         - App Key / Developer Application Key
//   BB_AGENCIA         - agência da conta corrente
//   BB_CONTA           - número da conta corrente (com dígito, se houver)
// Opcionais (só se o host padrão abaixo não funcionar, ajustar sem precisar mexer no código):
//   BB_OAUTH_URL       - default: https://oauth.bb.com.br/oauth/token
//   BB_API_BASE_URL    - default: https://api-extratos.bb.com.br
import https from "node:https";
import tls from "node:tls";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BB_OAUTH_URL = process.env.BB_OAUTH_URL || "https://oauth.bb.com.br/oauth/token";
const BB_API_BASE_URL = process.env.BB_API_BASE_URL || "https://api-extratos.bb.com.br";

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function downloadSecret(adminClient, fileName) {
  const { data: blob, error: downloadError } = await adminClient.storage.from("secrets").download(fileName);
  if (downloadError) return null;
  if (!blob) return null;
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function getMtlsAgent(adminClient) {
  const [cert, key] = await Promise.all([
    downloadSecret(adminClient, "cert.pem"),
    downloadSecret(adminClient, "key.pem"),
  ]);
  if (!cert || !key) return null;
  try {
    // tls.createSecureContext valida/decodifica o certificado na hora (o
    // https.Agent, sozinho, só guarda os bytes e só tentaria abrir o
    // certificado depois, na primeira conexão — escondendo o erro real).
    tls.createSecureContext({ cert, key });
    return new https.Agent({ cert, key });
  } catch (e) {
    throw new Error(`Certificado/chave inválidos (cert.pem: ${cert.length} bytes, key.pem: ${key.length} bytes): ${e.message}`);
  }
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

  const missing = ["BB_CLIENT_ID", "BB_CLIENT_SECRET", "BB_APP_KEY", "BB_AGENCIA", "BB_CONTA"]
    .filter((k) => !process.env[k]);
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
    const agent = await getMtlsAgent(adminClient);
    if (!agent) return json({ error: 'Certificado mTLS não encontrado. Suba "cert.pem" e "key.pem" no Supabase (Storage > bucket "secrets").' }, 500);
    const token = await getAccessToken(agent);
    const raw = await fetchExtrato(agent, token, dataInicio, dataFim);
    const transactions = normalizeTransactions(raw);
    return json({ transactions });
  } catch (e) {
    return json({ error: e?.message || "Falha ao buscar extrato do BB." }, 502);
  }
};
