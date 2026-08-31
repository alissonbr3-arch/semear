// Edge Function: consultor-ia
//
// Roda no servidor do Supabase (não no navegador). Recebe uma pergunta de
// manejo agrícola ligada a uma visita técnica, consulta a Claude (Anthropic)
// no estilo de consultoria da Semear e devolve a resposta. A chave da
// Anthropic fica só aqui — variável de ambiente ANTHROPIC_API_KEY, configurada
// em Project Settings > Edge Functions > Secrets — nunca é exposta no
// navegador. Só quem estiver logado no app pode chamar esta função.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.32.1";

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

// Estilo de consultoria da Semear/Alisson. Ajuste este texto livremente para
// deixar as respostas mais parecidas com o seu jeito de orientar — não exige
// nenhum passo técnico além de editar e reimplantar esta função.
const SYSTEM_PROMPT = `Você é o consultor técnico da Semear Consultoria Agropecuária, respondendo como o Alisson responderia a uma pergunta de manejo de um cliente ou de um colaborador da equipe, direto no registro de uma visita técnica (soja e milho).

Estilo de resposta:
- Direto e prático, sem enrolação — quem pergunta está no campo ou vai visitar em breve.
- Linguagem técnica de agronomia (estádio fenológico, nome de pragas/doenças/plantas daninhas, ingrediente ativo quando fizer sentido), mas sem jargão desnecessário.
- Quando houver mais de uma recomendação, organize em tópicos curtos.
- Sempre que a situação pedir, termine com um prazo de reavaliação (ex: "reavaliar em 5-7 dias").
- Não recomende marca comercial de defensivo — fale do ingrediente ativo ou classe do produto, e lembre de confirmar dose/registro no receituário agronômico.
- Se a pergunta não tiver relação com manejo agrícola/agropecuário, responda educadamente que você só ajuda com esse assunto.
- Responda sempre em português do Brasil, em texto corrido (sem markdown).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return json(
        { error: "A chave ANTHROPIC_API_KEY ainda não foi configurada nos segredos do projeto (Edge Functions > Secrets)." },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();
    if (callerError || !caller) return json({ error: "Sessão inválida." }, 401);

    const body = await req.json();
    const pergunta = String(body.pergunta || "").trim();
    if (!pergunta) return json({ error: "Digite uma pergunta." }, 400);

    const contexto = body.contexto || {};
    const contextLines = [
      contexto.clientName && `Cliente: ${contexto.clientName}`,
      contexto.propertyName && `Propriedade: ${contexto.propertyName}`,
      contexto.fieldName && `Talhão: ${contexto.fieldName}`,
      contexto.culture && `Cultura: ${contexto.culture}${contexto.variety ? " (cultivar " + contexto.variety + ")" : ""}`,
      contexto.stage && `Estádio fenológico atual: ${contexto.stage}`,
      contexto.pests && `Pragas/doenças observadas nesta visita: ${contexto.pests}`,
      Array.isArray(contexto.previousQA) && contexto.previousQA.length > 0 &&
        `Consultas recentes sobre esta safra:\n${
          contexto.previousQA
            .map((qa: { question: string; answer: string }) => `P: ${qa.question}\nR: ${qa.answer}`)
            .join("\n\n")
        }`,
    ].filter(Boolean).join("\n");

    const userMessage = contextLines ? `Contexto da safra:\n${contextLines}\n\nPergunta: ${pergunta}` : pergunta;

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 1500,
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const resposta = (textBlock && "text" in textBlock ? textBlock.text : "").trim();
    if (!resposta) return json({ error: "A IA não retornou uma resposta." }, 502);

    return json({ resposta });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return json({ error: "Chave ANTHROPIC_API_KEY inválida ou sem crédito." }, 500);
    }
    if (e instanceof Anthropic.RateLimitError) {
      return json({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }, 429);
    }
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
