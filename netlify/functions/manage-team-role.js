// Netlify Function: manage-team-role
//
// Só o master pode promover um colaborador a "administrador" (vê o módulo
// financeiro) ou rebaixar de volta a "colaborador" (técnico, sem acesso ao
// financeiro). Nunca mexe em quem já é "master" ou "cliente" — só alterna
// entre colaborador/administrador, por segurança.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(body, statusCode = 200) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json({ error: "Método não permitido." }, 405);
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

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (profileError || !callerProfile || callerProfile.role !== "master") {
    return json({ error: "Apenas o usuário master pode alterar o papel de um colaborador." }, 403);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const { id, role } = body;
  if (!id || !["colaborador", "administrador"].includes(role)) {
    return json({ error: "id e role (colaborador ou administrador) são obrigatórios." }, 400);
  }

  const { data: targetProfile, error: targetError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", id)
    .single();
  if (targetError || !targetProfile) return json({ error: "Colaborador não encontrado." }, 404);
  if (!["colaborador", "administrador"].includes(targetProfile.role)) {
    return json({ error: "Só é possível alterar o papel de técnicos/administradores." }, 400);
  }

  const { error } = await adminClient.from("profiles").update({ role }).eq("id", id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
};
