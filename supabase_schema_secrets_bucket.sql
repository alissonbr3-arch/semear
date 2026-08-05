-- Rode este script no SQL Editor do Supabase (Project > SQL Editor > New query).
-- Cria um espaço de armazenamento PRIVADO chamado "secrets", usado hoje só
-- para guardar o certificado .pfx da integração com o Banco do Brasil.
--
-- Diferente do bucket "documents" (público, pra anexos de cliente), este
-- bucket não tem NENHUMA policy de leitura/escrita — isso significa que só
-- a service_role key (usada pelas Netlify Functions, nunca pelo navegador)
-- consegue ler os arquivos daqui. Fazer upload pelo painel do Supabase
-- (Storage > secrets > upload) funciona normalmente, porque o painel usa
-- suas credenciais de dono do projeto, não fica sujeito a essas policies.

insert into storage.buckets (id, name, public)
values ('secrets', 'secrets', false)
on conflict (id) do nothing;
