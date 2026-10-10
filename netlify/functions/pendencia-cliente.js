// Netlify Scheduled Function: pendencia-cliente
//
// De segunda a sexta às 8h (MS): cobra no WhatsApp o produtor dos projetos
// parados numa etapa que depende dele (ex.: "Documentos do cliente") e com
// "O que falta" preenchido no serviço — no máximo 1x a cada 7 dias por projeto.
// Controlado no Painel dos Gestores (settings.whatsappPendenciaCliente: off | teste | ativa).
import { createClient } from "@supabase/supabase-js";
import { enviarPendenciaCliente } from "../lib/cobrancaGestores.js";

export const config = { schedule: "0 12 * * 1-5" }; // 12:00 UTC = 08:00 em MS (UTC-4)

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function getBlob(adminClient, key, fallback) {
  const { data } = await adminClient.from("agrotrack_data").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}
async function setBlob(adminClient, key, value) {
  await adminClient.from("agrotrack_data").upsert({ key, value, updated_at: new Date().toISOString() });
}

export const handler = async () => {
  if (!supabaseUrl || !serviceRoleKey) return { statusCode: 500, body: "Configuração incompleta." };
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const settings = await getBlob(adminClient, "settings", {});
  const modo = settings?.whatsappPendenciaCliente || "off";
  if (modo !== "teste" && modo !== "ativa") return { statusCode: 200, body: "Cobrança de pendência do cliente desligada." };
  return { statusCode: 200, body: JSON.stringify(await enviarPendenciaCliente(adminClient, getBlob, setBlob, modo)) };
};
