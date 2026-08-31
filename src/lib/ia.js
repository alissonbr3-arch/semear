import { supabase } from "./supabaseClient";

export async function askConsultorIA({ pergunta, contexto }) {
  const { data, error } = await supabase.functions.invoke("consultor-ia", {
    body: { pergunta, contexto },
  });
  if (error) {
    // supabase-js só traz uma mensagem genérica em error.message quando a
    // função responde com status != 2xx — o corpo de erro de verdade (o que
    // a função retornou em json({ error: ... })) vem em error.context, que
    // é a Response crua e precisa ser lida à parte.
    if (error.context && typeof error.context.json === "function") {
      try {
        const body = await error.context.json();
        if (body?.error) return { error: body.error };
      } catch {
        // corpo não era JSON — cai no fallback abaixo
      }
    }
    return { error: error.message || "Falha ao consultar a IA." };
  }
  if (data?.error) return { error: data.error };
  return { resposta: data.resposta };
}
