// Netlify Function: client-portal-data
//
// Chamada pelo app quando quem está logado tem role "cliente". Usa a
// service_role key do Supabase (SUPABASE_SERVICE_ROLE_KEY, configurada em
// Site settings > Environment variables) para ler os dados de todos os
// clientes e devolver só a fatia (propriedades/talhões/safras/visitas/
// documentos) que pertence ao cliente vinculado a esse login — nunca a
// base inteira. As policies do banco já bloqueiam esse papel de ler
// agrotrack_data direto; esta função é o único jeito de um login de
// cliente enxergar seus próprios dados.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const handler = async (event) => {
  if (event.httpMethod !== "GET") return json({ error: "Método não permitido." }, 405);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Configuração do servidor incompleta (variáveis do Supabase ausentes)." }, 500);
  }

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return json({ error: "Não autenticado." }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser();
  if (callerError || !caller) return json({ error: "Sessão inválida." }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, client_id, name")
    .eq("id", caller.id)
    .single();

  if (profileError || !profile || profile.role !== "cliente" || !profile.client_id) {
    return json({ error: "Este login não está vinculado a um cliente." }, 403);
  }

  async function getBlob(key, fallback) {
    const { data } = await adminClient.from("agrotrack_data").select("value").eq("key", key).maybeSingle();
    return data?.value ?? fallback;
  }

  const [clients, properties, fields, harvests, visits, documents, teamAvatars] = await Promise.all([
    getBlob("clients", []),
    getBlob("properties", []),
    getBlob("fields", []),
    getBlob("harvests", []),
    getBlob("visits", []),
    getBlob("documents", []),
    getBlob("teamAvatars", {}),
  ]);

  const client = clients.find((c) => c.id === profile.client_id);
  if (!client) return json({ error: "Cliente não encontrado." }, 404);

  let gestor = null;
  if (client.gestorId) {
    const { data: gestorProfile } = await adminClient
      .from("profiles")
      .select("id, name, title, phone")
      .eq("id", client.gestorId)
      .maybeSingle();
    if (gestorProfile) {
      gestor = { ...gestorProfile, avatar: teamAvatars[gestorProfile.id] || null };
    }
  }

  const myProperties = properties.filter((p) => p.clientId === client.id);
  const myPropertyIds = myProperties.map((p) => p.id);
  const myFields = fields.filter((f) => myPropertyIds.includes(f.propertyId));
  const myFieldIds = myFields.map((f) => f.id);
  const myHarvests = harvests.filter((h) => myFieldIds.includes(h.fieldId));
  const myHarvestIds = myHarvests.map((h) => h.id);
  const myVisits = visits.filter((v) => myHarvestIds.includes(v.harvestId));
  const myDocuments = documents.filter((d) => d.clientId === client.id);

  return json({
    client: { id: client.id, name: client.name, phone: client.phone || null, city: client.city || null },
    gestor,
    properties: myProperties,
    fields: myFields,
    harvests: myHarvests,
    visits: myVisits,
    documents: myDocuments,
  });
};
