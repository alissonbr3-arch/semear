import { supabase } from "./supabaseClient";

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getMyProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    console.error("getMyProfile failed:", error);
    return null;
  }
  return data;
}

export async function listProfiles() {
  const { data, error } = await supabase.from("profiles").select("*").order("name");
  if (error) {
    console.error("listProfiles failed:", error);
    return [];
  }
  return data;
}

export async function createColaborador({ name, email, phone, title, password }) {
  const { data, error } = await supabase.functions.invoke("manage-colaborador", {
    body: { action: "create", name, email, phone, title, password },
  });
  if (error) return { error: error.message || "Falha ao criar colaborador." };
  if (data?.error) return { error: data.error };
  return { data };
}

export async function updateColaborador({ id, name, phone, title }) {
  const { data, error } = await supabase.functions.invoke("manage-colaborador", {
    body: { action: "update", id, name, phone, title },
  });
  if (error) return { error: error.message || "Falha ao editar colaborador." };
  if (data?.error) return { error: data.error };
  return { data };
}

export async function deleteColaborador(id) {
  const { data, error } = await supabase.functions.invoke("manage-colaborador", {
    body: { action: "delete", id },
  });
  if (error) return { error: error.message || "Falha ao remover colaborador." };
  if (data?.error) return { error: data.error };
  return { ok: true };
}
