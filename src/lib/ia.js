import { supabase } from "./supabaseClient";

export async function askConsultorIA({ pergunta, contexto }) {
  const { data, error } = await supabase.functions.invoke("consultor-ia", {
    body: { pergunta, contexto },
  });
  if (error) return { error: error.message || "Falha ao consultar a IA." };
  if (data?.error) return { error: data.error };
  return { resposta: data.resposta };
}
