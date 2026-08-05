import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Faltam as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Confira o arquivo .env (veja .env.example)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
