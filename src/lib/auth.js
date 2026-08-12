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

async function callNetlifyFunction(path, options) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { error: "Sessão inválida." };
  try {
    const res = await fetch(`/.netlify/functions/${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options?.headers || {}) },
    });
    const body = await res.json();
    if (!res.ok) return { error: body?.error || "Falha na requisição." };
    return { data: body };
  } catch (e) {
    return { error: e?.message || "Falha na requisição." };
  }
}

export async function createClientAccess({ name, email, phone, password, clientId }) {
  return callNetlifyFunction("manage-client-access", {
    method: "POST",
    body: JSON.stringify({ action: "create", name, email, phone, password, clientId }),
  });
}

export async function updateClientAccess({ id, name, phone }) {
  return callNetlifyFunction("manage-client-access", {
    method: "POST",
    body: JSON.stringify({ action: "update", id, name, phone }),
  });
}

export async function deleteClientAccess(id) {
  return callNetlifyFunction("manage-client-access", {
    method: "POST",
    body: JSON.stringify({ action: "delete", id }),
  });
}

export async function fetchClientPortalData() {
  return callNetlifyFunction("client-portal-data", { method: "GET" });
}

export async function setTeamRole({ id, role }) {
  return callNetlifyFunction("manage-team-role", {
    method: "POST",
    body: JSON.stringify({ id, role }),
  });
}

export async function fetchBBExtrato({ dataInicio, dataFim } = {}) {
  const params = new URLSearchParams();
  if (dataInicio) params.set("dataInicio", dataInicio);
  if (dataFim) params.set("dataFim", dataFim);
  const qs = params.toString();
  return callNetlifyFunction(`bb-extrato${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function fetchNdvi({ bbox, dateFrom, dateTo } = {}) {
  return callNetlifyFunction("sentinel-ndvi", {
    method: "POST",
    body: JSON.stringify({ bbox, dateFrom, dateTo }),
  });
}
