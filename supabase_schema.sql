-- Rode este script no SQL Editor do Supabase (Project > SQL Editor > New query)

create table if not exists agrotrack_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Habilita Row Level Security (recomendado pelo Supabase por padrão)
alter table agrotrack_data enable row level security;

-- Política simples: qualquer pessoa com a chave anônima (anon key) do projeto
-- pode ler e escrever. Isso é equivalente ao comportamento atual do app
-- (link compartilhado = acesso compartilhado, sem login individual).
--
-- Se no futuro você quiser exigir login por usuário, troque esta política
-- por uma que exija auth.uid() e adicione Supabase Auth ao app.
create policy "Acesso compartilhado via anon key"
  on agrotrack_data
  for all
  using (true)
  with check (true);
