-- Rode isto UMA VEZ, depois de:
--   1) rodar supabase_schema_auth.sql
--   2) criar seu próprio usuário em Authentication > Users > Add user
--      (marque "Auto Confirm User")
--
-- Troque o e-mail abaixo pelo e-mail exato que você usou para criar o
-- usuário no passo 2, e troque também o nome se quiser.
insert into public.profiles (id, role, name, email)
select id, 'master', 'Álisson', email
from auth.users
where email = 'SEU-EMAIL-DE-LOGIN@exemplo.com'
on conflict (id) do update set role = 'master';
