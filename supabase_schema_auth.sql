-- Rode este script no SQL Editor do Supabase (Project > SQL Editor > New query).
-- Este script é ADICIONAL ao supabase_schema.sql que você já rodou antes — não
-- mexe na tabela agrotrack_data em si, só adiciona login por pessoa.

-- 1) Tabela de perfis: um perfil por usuário de login (auth.users), guardando
--    nome/cargo/telefone/e-mail pra exibir na tela "Equipe", e o papel de
--    permissão de cada um (master ou colaborador).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'colaborador' check (role in ('master','colaborador')),
  name text not null,
  title text,
  phone text,
  email text not null,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Qualquer pessoa logada pode LER a lista de perfis (mesmo comportamento de
-- hoje: todo mundo vê o diretório da equipe).
drop policy if exists "Perfis visíveis para autenticados" on profiles;
create policy "Perfis visíveis para autenticados"
  on profiles
  for select
  using (auth.role() = 'authenticated');

-- Nenhuma policy de insert/update/delete é criada de propósito: ninguém grava
-- em profiles direto pelo navegador (nem master, nem colaborador). Toda
-- escrita passa pela Edge Function "manage-colaborador", que roda no servidor
-- com a chave service_role e por isso ignora RLS. Isso impede que alguém com a
-- chave anônima crie um "master" falso direto no banco.

-- 2) Atualiza a política de agrotrack_data: antes, qualquer pessoa com a
--    chave anônima podia ler/escrever (link compartilhado, sem login). Agora
--    só quem estiver logado pode acessar.
drop policy if exists "Acesso compartilhado via anon key" on agrotrack_data;
drop policy if exists "Acesso somente para usuários autenticados" on agrotrack_data;
create policy "Acesso somente para usuários autenticados"
  on agrotrack_data
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
