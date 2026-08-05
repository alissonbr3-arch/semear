import { supabase } from "./supabaseClient";

// Mesma assinatura usada no resto do app (safeGet/safeSet), só que agora
// gravando de verdade no Supabase em vez do armazenamento do Claude.
// Cada "tabela" do app (clients, properties, fields, harvests, visits,
// varieties, pesticides, fertilizers, pests, diseases, weeds, team) vira
// uma linha na tabela agrotrack_data, guardada como JSON em `value`.

export async function safeGet(key) {
  try {
    const { data, error } = await supabase
      .from("agrotrack_data")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    return data.value;
  } catch (e) {
    console.error("safeGet failed for key:", key, e);
    return null;
  }
}

export async function safeSet(key, value) {
  try {
    const { error } = await supabase
      .from("agrotrack_data")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      console.error("safeSet failed for key:", key, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("safeSet failed for key:", key, e);
    return false;
  }
}
