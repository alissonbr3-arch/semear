// Netlify Function: sentinel-ndvi
//
// Busca uma imagem NDVI (Sentinel-2, via Copernicus Data Space Ecosystem) pra
// um talhão. Usa OAuth2 client_credentials — mais simples que a integração
// com o Banco do Brasil, não precisa de certificado mTLS, só Client ID/Secret.
//
// Variáveis de ambiente necessárias (Site settings > Environment variables):
//   SENTINELHUB_CLIENT_ID     - Client ID do OAuth client criado no Sentinel Hub
//   SENTINELHUB_CLIENT_SECRET - Client Secret do mesmo OAuth client
//
// A imagem volta como PNG em escala de cinza (0 = NDVI -1, 255 = NDVI +1),
// com o canal alfa marcando pixels sem dado válido (nuvem/fora da cena) —
// o frontend decodifica isso de volta pra valores de NDVI.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const PROCESS_URL = "https://sh.dataspace.copernicus.eu/process/v1";

const EVALSCRIPT = `
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "dataMask"] }],
    output: { bands: 4, sampleType: "UINT8" }
  };
}
function evaluatePixel(sample) {
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 0.0001);
  let gray = Math.max(0, Math.min(255, Math.round((ndvi + 1) * 127.5)));
  return [gray, gray, gray, sample.dataMask * 255];
}
`;

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function getAccessToken() {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.SENTINELHUB_CLIENT_ID,
    client_secret: process.env.SENTINELHUB_CLIENT_SECRET,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.access_token) {
    throw new Error(`Falha ao autenticar no Copernicus (HTTP ${res.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ error: "Método não permitido." }, 405);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Configuração do servidor incompleta (variáveis do Supabase ausentes)." }, 500);
  }
  const missing = ["SENTINELHUB_CLIENT_ID", "SENTINELHUB_CLIENT_SECRET"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return json({ error: `Configuração do servidor incompleta. Faltando: ${missing.join(", ")}.` }, 500);
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return json({ error: "Não autenticado." }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Sessão inválida." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: callerProfile } = await adminClient.from("profiles").select("role").eq("id", caller.id).single();
  if (!callerProfile || callerProfile.role === "cliente") {
    return json({ error: "Sem permissão pra buscar imagem de satélite." }, 403);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const { bbox, days } = body;
  if (!Array.isArray(bbox) || bbox.length !== 4 || bbox.some((n) => typeof n !== "number")) {
    return json({ error: "bbox inválido — esperado [minLng, minLat, maxLng, maxLat]." }, 400);
  }
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const widthDeg = Math.max(maxLng - minLng, 1e-6);
  const heightDeg = Math.max(maxLat - minLat, 1e-6);
  const maxDim = 512;
  let width, height;
  if (widthDeg >= heightDeg) {
    width = maxDim;
    height = Math.max(32, Math.round(maxDim * (heightDeg / widthDeg)));
  } else {
    height = maxDim;
    width = Math.max(32, Math.round(maxDim * (widthDeg / heightDeg)));
  }

  const to = new Date();
  const from = new Date(to.getTime() - (Number(days) || 45) * 86400000);

  try {
    const token = await getAccessToken();

    const requestBody = {
      input: {
        bounds: {
          bbox: [minLng, minLat, maxLng, maxLat],
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
        },
        data: [
          {
            type: "sentinel-2-l2a",
            dataFilter: {
              timeRange: { from: from.toISOString(), to: to.toISOString() },
              maxCloudCoverage: 30,
              mosaickingOrder: "leastCC",
            },
          },
        ],
      },
      output: {
        width,
        height,
        responses: [{ identifier: "default", format: { type: "image/png" } }],
      },
      evalscript: EVALSCRIPT,
    };

    const res = await fetch(PROCESS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Falha ao buscar imagem NDVI (HTTP ${res.status}): ${errText.slice(0, 400)}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return json({
      image: `data:image/png;base64,${base64}`,
      bounds: [[minLat, minLng], [maxLat, maxLng]],
      width,
      height,
      dateRange: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    });
  } catch (e) {
    return json({ error: e?.message || "Falha ao buscar NDVI." }, 502);
  }
};
