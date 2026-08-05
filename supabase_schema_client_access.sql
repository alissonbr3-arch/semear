-- Rode este script no SQL Editor do Supabase (Project > SQL Editor > New query).
-- Este script é ADICIONAL aos anteriores (supabase_schema.sql e
-- supabase_schema_auth.sql, que você já rodou). Ele:
--   1) permite que um perfil tenha o papel "cliente", vinculado a um cliente
--      específico (client_id);
--   2) tranca o acesso desse papel aos dados de TODOS os clientes — quem é
--      "cliente" nunca lê agrotrack_data nem a lista de perfis diretamente;
--      os dados dele só chegam filtrados, por uma função no servidor (Netlify);
--   3) cria o espaço de armazenamento ("documents") para os arquivos
--      (laudos, contratos, fotos) anexados a cada cliente.

-- 1) Perfis: novo papel "cliente" + vínculo com o cliente correspondente.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('master', 'colaborador', 'cliente'));

alter table profiles add column if not exists client_id text;

-- 2) Função auxiliar "sou da equipe?" — roda como SECURITY DEFINER, ou seja,
--    ignora as próprias regras de acesso da tabela profiles ao consultá-la.
--    Isso é necessário: se as políticas abaixo consultassem "profiles"
--    diretamente dentro de si mesmas, o Postgres entraria em recursão
--    infinita (a política precisaria se avaliar para se avaliar). Com a
--    função, essa consulta interna roda sem RLS, quebrando o ciclo.
create or replace function public.is_staff(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = uid and role <> 'cliente'
  );
$$;

grant execute on function public.is_staff(uuid) to authenticated;

-- 3) Perfis só ficam visíveis para master/colaborador — um login de cliente
--    nunca consegue listar quem mais tem acesso ao sistema.
drop policy if exists "Perfis visíveis para autenticados" on profiles;
drop policy if exists "Perfis visíveis para quem não é cliente" on profiles;
create policy "Perfis visíveis para quem não é cliente"
  on profiles
  for select
  using (auth.role() = 'authenticated' and public.is_staff(auth.uid()));

-- 4) agrotrack_data (clientes, propriedades, talhões, safras, visitas etc.)
--    deixa de ser acessível para logins de cliente — só master/colaborador.
--    Quem é "cliente" recebe os dados filtrados por uma função no Netlify,
--    que usa a chave de serviço (nunca passa pelas policies abaixo).
drop policy if exists "Acesso somente para usuários autenticados" on agrotrack_data;
drop policy if exists "Acesso somente para quem não é cliente" on agrotrack_data;
create policy "Acesso somente para quem não é cliente"
  on agrotrack_data
  for all
  using (auth.role() = 'authenticated' and public.is_staff(auth.uid()))
  with check (auth.role() = 'authenticated' and public.is_staff(auth.uid()));

-- 5) Espaço de armazenamento para documentos dos clientes (laudos, contratos,
--    fotos). Público para leitura (os links são difíceis de adivinhar e só
--    aparecem para quem tem acesso ao cliente certo), mas só master/
--    colaborador podem enviar ou remover arquivos.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "Documentos públicos para leitura" on storage.objects;
create policy "Documentos públicos para leitura"
  on storage.objects
  for select
  using (bucket_id = 'documents');

drop policy if exists "Equipe pode enviar documentos" on storage.objects;
create policy "Equipe pode enviar documentos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'documents' and public.is_staff(auth.uid()));

drop policy if exists "Equipe pode remover documentos" on storage.objects;
create policy "Equipe pode remover documentos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'documents' and public.is_staff(auth.uid()));
