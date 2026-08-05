// Netlify Function: manage-client-access
//
// Equivalente à Edge Function "manage-colaborador", só que para logins de
// cliente (role "cliente", vinculado a um client_id). Roda no servidor do
// Netlify (nunca no navegador) e usa a service_role key do Supabase, que
// precisa estar configurada em Site settings > Environment variables como
// SUPABASE_SERVICE_ROLE_KEY. Só quem já está logado E tem role "master" em
// profiles pode criar, editar ou remover um acesso de cliente.
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
    return json({ error: "Apenas o usuário master pode gerenciar acessos de clientes." }, 403);
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  if (body.action === "create") {
    const { name, email, phone, password, clientId } = body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 6 || !clientId) {
      return json({ error: "Nome, e-mail, senha (mín. 6 caracteres) e cliente são obrigatórios." }, 400);
    }
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim() },
    });
    if (createError || !created?.user) {
      return json({ error: createError?.message || "Falha ao criar usuário." }, 400);
    }
    const { error: insertError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      role: "cliente",
      client_id: clientId,
      name: name.trim(),
      title: null,
      phone: phone?.trim() || null,
      email: email.trim(),
    });
    if (insertError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: "Falha ao salvar perfil: " + insertError.message }, 400);
    }
    return json({ id: created.user.id, name, email, phone: phone || null });
  }

  if (body.action === "update") {
    const { id, name, phone } = body;
    if (!id || !name?.trim()) return json({ error: "id e nome são obrigatórios." }, 400);
    const { error } = await adminClient
      .from("profiles")
      .update({ name: name.trim(), phone: phone?.trim() || null })
      .eq("id", id)
      .eq("role", "cliente");
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (body.action === "delete") {
    const { id } = body;
    if (!id) return json({ error: "id é obrigatório." }, 400);
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Ação inválida." }, 400);
};
