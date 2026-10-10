// Netlify Scheduled Function: cobranca-gestores-semanal
//
// Toda segunda de manhã manda pra cada gestor, no WhatsApp, a lista dos
// projetos em aberto no nome dele (ver netlify/lib/cobrancaGestores.js).
//
// Controlado em Serviços (settings.whatsappGestores):
//   "off"   (padrão) não envia nada
//   "teste" manda tudo só pro número de teste da Semear, com aviso de quem seria o destinatário
//   "ativa" manda pros gestores de verdade
import { createClient } from "@supabase/supabase-js";
import { enviarCobrancaGestores } from "../lib/cobrancaGestores.js";

export const config = { schedule: "0 11 * * 1" }; // segunda 11:00 UTC = 07:00 em Mato Grosso do Sul (UTC-4)

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getBlob(adminClient, key, fallback) {
  const { data } = await adminClient.from("agrotrack_data").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}

export const handler = async () => {
  if (!supabaseUrl || !serviceRoleKey) return { statusCode: 500, body: "Configuração incompleta." };
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const settings = await getBlob(adminClient, "settings", {});
  const modo = settings?.whatsappGestores || "off";
  if (modo !== "teste" && modo !== "ativa") return { statusCode: 200, body: "Cobrança dos gestores desligada." };
  const r = await enviarCobrancaGestores(adminClient, getBlob, modo);
  return { statusCode: 200, body: JSON.stringify(r) };
};
