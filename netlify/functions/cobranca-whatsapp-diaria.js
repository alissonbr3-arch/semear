// Netlify Scheduled Function: cobranca-whatsapp-diaria
//
// Todo dia de manhã manda lembrete de WhatsApp (Z-API) dos boletos Asaas que
// ainda não foram pagos: 3 dias antes, no dia, 3 dias e 7 dias depois do
// vencimento. Cada lembrete só é enviado uma vez por boleto.
//
// Controlado em Financeiro > Honorários (settings.whatsappCobranca):
//   "off"   (padrão) não envia nada
//   "teste" manda tudo só pro número de teste da Semear, com aviso de quem seria o destinatário
//   "ativa" manda pros clientes de verdade
import { createClient } from "@supabase/supabase-js";
import { TEST_PHONE, formatarTelefone, enviarTexto, msgLembrete } from "../lib/whatsapp.js";

export const config = { schedule: "0 11 * * *" }; // 11:00 UTC = 07:00 em Mato Grosso do Sul (UTC-4)

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getBlob(adminClient, key, fallback) {
  const { data } = await adminClient.from("agrotrack_data").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}
async function setBlob(adminClient, key, value) {
  await adminClient.from("agrotrack_data").upsert({ key, value, updated_at: new Date().toISOString() });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function diasEntre(hojeIso, dueIso) {
  return Math.round((Date.parse(`${hojeIso}T00:00:00Z`) - Date.parse(`${dueIso}T00:00:00Z`)) / 86400000);
}
const TIPO_POR_DIFERENCA = { "-3": "antes", "0": "hoje", "3": "atraso3", "7": "atraso7" };

export const handler = async () => {
  if (!supabaseUrl || !serviceRoleKey) return { statusCode: 500, body: "Configuração incompleta." };
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const settings = await getBlob(adminClient, "settings", {});
  const modo = settings?.whatsappCobranca || "off";
  if (modo !== "teste" && modo !== "ativa") return { statusCode: 200, body: "Cobrança automática desligada." };

  const [finances, clients] = await Promise.all([getBlob(adminClient, "finances", []), getBlob(adminClient, "clients", [])]);
  // "Hoje" no fuso de Mato Grosso do Sul.
  const hoje = new Date(Date.now() - 4 * 3600000).toISOString().slice(0, 10);

  let enviados = 0;
  const falhas = [];
  const atualizados = new Map();

  for (const f of finances) {
    if (f.status === "pago" || !f.asaasBoletoUrl || !f.asaasDueDate) continue;
    const tipo = TIPO_POR_DIFERENCA[String(diasEntre(hoje, f.asaasDueDate))];
    if (!tipo) continue;
    const chave = `${f.asaasPaymentId || f.id}:${tipo}`;
    if (modo === "ativa" && (f.whatsappLembretes || []).includes(chave)) continue;
    const client = clients.find((c) => c.id === f.clientId);
    if (!client) continue;
    const phone = formatarTelefone(client.phone);
    if (!phone) { falhas.push(`${client.name}: sem telefone válido`); continue; }

    let texto = msgLembrete(tipo, f, client);
    let destino = phone;
    if (modo === "teste") {
      destino = TEST_PHONE;
      texto = `[TESTE — iria para ${client.name} (${phone})]\n\n${texto}`;
    }
    const r = await enviarTexto(destino, texto);
    if (!r.ok) { falhas.push(`${client.name}: ${r.error}`); continue; }
    enviados++;
    if (modo === "ativa") atualizados.set(f.id, [...(f.whatsappLembretes || []), chave]);
    await sleep(1500);
  }

  if (atualizados.size) {
    // Relê antes de gravar, pra não atropelar alterações feitas durante o envio.
    const atuais = await getBlob(adminClient, "finances", []);
    await setBlob(adminClient, "finances", atuais.map((f) => (atualizados.has(f.id) ? { ...f, whatsappLembretes: atualizados.get(f.id) } : f)));
  }
  return { statusCode: 200, body: JSON.stringify({ modo, enviados, falhas }) };
};
