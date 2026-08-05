-- Rode este script no SQL Editor do Supabase (Project > SQL Editor > New query).
-- Este script é ADICIONAL aos anteriores. Ele só libera o papel
-- "administrador" na tabela profiles — alguém que, como o master, vê os
-- dados financeiros (honorários e comissões), mas não é o master da conta.
-- Colaboradores "técnico" continuam sem acesso ao financeiro.

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('master', 'colaborador', 'administrador', 'cliente'));

-- A função is_staff() (criada no script anterior) já trata qualquer papel
-- diferente de "cliente" como equipe — administrador continua enxergando
-- agrotrack_data e a lista de perfis normalmente, sem precisar mexer nas
-- policies de novo.
