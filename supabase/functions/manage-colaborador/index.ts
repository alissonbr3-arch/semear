// Edge Function: manage-colaborador
//
// Roda no servidor do Supabase (não no navegador). Só quem já está logado E
// tem role "master" em profiles pode criar, editar ou remover contas de
// colaborador. Usa a service_role key, que é injetada automaticamente pelo
// Supabase nesta função — nunca precisa ser copiada/colada em lugar nenhum.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    // Cliente com o token de quem chamou — só serve pra descobrir quem é.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();
    if (callerError || !caller) return json({ error: "Sessão inválida." }, 401);

    // Cliente admin (service role) — ignora RLS. Usado pra checar o papel do
    // chamador e pra todas as escritas.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== "master") {
      return json({ error: "Apenas o usuário master pode gerenciar a equipe." }, 403);
    }

    const body = await req.json();

    if (body.action === "create") {
      const { name, email, phone, title, password } = body;
      if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
        return json({ error: "Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios." }, 400);
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
        role: "colaborador",
        name: name.trim(),
        title: title?.trim() || null,
        phone: phone?.trim() || null,
        email: email.trim(),
      });
      if (insertError) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        return json({ error: "Falha ao salvar perfil: " + insertError.message }, 400);
      }
      return json({ id: created.user.id, name, email, phone: phone || null, title: title || null });
    }

    if (body.action === "update") {
      const { id, name, phone, title } = body;
      if (!id || !name?.trim()) return json({ error: "id e nome são obrigatórios." }, 400);
      const { error } = await adminClient
        .from("profiles")
        .update({ name: name.trim(), phone: phone?.trim() || null, title: title?.trim() || null })
        .eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.action === "delete") {
      const { id } = body;
      if (!id) return json({ error: "id é obrigatório." }, 400);
      if (id === caller.id) return json({ error: "Você não pode remover a si mesmo." }, 400);
      const { error } = await adminClient.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
