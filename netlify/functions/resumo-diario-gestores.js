// Netlify Scheduled Function: resumo-diario-gestores
//
// De segunda a sábado às 6h30 (MS), cada gestor recebe no WhatsApp: agenda
// do dia, itens atrasados, clientes sem visita há mais de N dias e projetos
// com prazo nos próximos 7 dias ou parados. Quem não tem nada não recebe.
// Controlado no Painel dos Gestores (settings.whatsappResumoDiario: off | teste | ativa).
import { createClient } from "@supabase/supabase-js";
import { enviarResumoDiario } from "../lib/cobrancaGestores.js";

export const config = { schedule: "30 10 * * 1-6" }; // 10:30 UTC = 06:30 em MS (UTC-4)

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
  const modo = settings?.whatsappResumoDiario || "off";
  if (modo !== "teste" && modo !== "ativa") return { statusCode: 200, body: "Resumo diário desligado." };
  return { statusCode: 200, body: JSON.stringify(await enviarResumoDiario(adminClient, getBlob, modo)) };
};
