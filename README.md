# Semear AgroTrack — guia de deploy

Este é o mesmo app que você vinha usando no Claude, adaptado para rodar como
um site de verdade, com banco de dados próprio (Supabase) e domínio próprio.

Nada disso precisa ser feito por mim — são passos que você faz nos sites do
Supabase e da Netlify, usando login/senha sua. Leva uns 20-30 minutos na
primeira vez.

## 1. Criar o banco de dados (Supabase)

1. Vá em **supabase.com** → crie uma conta gratuita → **New project**.
2. Dê um nome (ex: `semear-agrotrack`), escolha uma senha de banco (guarde
   em local seguro) e a região mais perto do Brasil (`South America (São
   Paulo)` se disponível).
3. Espere o projeto terminar de criar (1-2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `supabase_schema.sql` (está nesta mesma pasta), copie todo
   o conteúdo, cole no editor e clique em **Run**.
6. Vá em **Project Settings** (ícone de engrenagem) → **API**. Você vai
   precisar de dois valores:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (uma chave longa)

## 2. Configurar o projeto localmente

1. Instale o [Node.js](https://nodejs.org) no seu computador, se ainda não
   tiver (versão 18 ou mais recente).
2. Descompacte esta pasta em algum lugar do seu computador.
3. Copie o arquivo `.env.example` e renomeie a cópia para `.env`.
4. Abra o `.env` e cole os dois valores que você pegou no Supabase:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```
5. Abra um terminal nessa pasta e rode:
   ```
   npm install
   npm run dev
   ```
6. Abra o endereço que aparecer (geralmente `http://localhost:5173`) — o
   app deve abrir funcionando, salvando os dados no Supabase.

Se tudo funcionar até aqui, o app está pronto para ir ao ar.

## 3. Colocar no ar (Netlify)

1. Vá em **netlify.com** → crie uma conta gratuita (dá pra usar login do
   GitHub, Google, ou e-mail).
2. A forma mais simples pra começar: rode `npm run build` na pasta do
   projeto (isso cria uma pasta `dist`), depois arraste essa pasta `dist`
   direto para a tela inicial da Netlify (**Sites** → arraste e solte).
3. Isso já publica o site com um endereço tipo
   `nome-aleatorio.netlify.app`. Funciona, mas ainda falta uma coisa
   importante: as variáveis de ambiente (`.env`) não vão junto quando você
   arrasta a pasta `dist` — então você precisa configurá-las direto na
   Netlify:
   - No painel do site → **Site configuration** → **Environment
     variables** → adicione `VITE_SUPABASE_URL` e
     `VITE_SUPABASE_ANON_KEY` com os mesmos valores do seu `.env`.
   - Se o portal do cliente estiver habilitado (login próprio para cada
     cliente ver só as fazendas dele), adicione também
     `SUPABASE_SERVICE_ROLE_KEY` — pegue o valor em Supabase → **Project
     Settings** → **API** → chave **service_role** (nunca coloque essa
     chave no `.env` nem no código; ela só deve existir aqui, nas
     variáveis de ambiente do Netlify).
   - Depois, em **Deploys**, clique em **Trigger deploy** → **Deploy site**
     para gerar uma nova versão já com essas variáveis.

### Forma recomendada (atualiza sozinho quando você editar o código)

Em vez de arrastar a pasta manualmente toda vez, o ideal é conectar um
repositório do GitHub:

1. Crie uma conta no **github.com** (se não tiver) e um repositório novo.
2. Suba esta pasta do projeto para esse repositório (o GitHub Desktop é a
   forma mais simples se você não usa linha de comando).
3. Na Netlify: **Add new site** → **Import an existing project** → conecte
   sua conta do GitHub → escolha o repositório.
4. A Netlify já detecta as configurações de build pelo arquivo
   `netlify.toml` que está nesta pasta.
5. Adicione as variáveis de ambiente (mesmo passo do item anterior) antes
   do primeiro deploy.
6. Pronto — a partir daqui, toda vez que você (ou eu, via Claude Code)
   atualizar o código no GitHub, a Netlify publica a nova versão sozinha.

## 4. Domínio próprio

1. Registre o domínio em qualquer registrador (Registro.br para `.com.br`,
   ou GoDaddy/Namecheap para outros).
2. No painel da Netlify: **Domain settings** → **Add a domain** → digite
   seu domínio.
3. A Netlify mostra os registros DNS que você precisa cadastrar no painel
   do seu registrador (geralmente um registro tipo `CNAME` ou `A`). Depois
   de configurado, pode levar algumas horas para propagar.

## Coisas importantes para saber

- **Login por pessoa** — cada colaborador tem seu próprio e-mail/senha
  (Supabase Auth). Só quem tem a conta marcada como "master" pode criar,
  editar ou remover logins de colaboradores, na tela **Equipe** do app. Veja
  `supabase_schema_auth.sql` e `supabase_bootstrap_master.sql` pra detalhes
  de como isso foi configurado.
- **Imagens de satélite (prints enviados no cadastro de talhão)** ficam
  guardadas dentro do banco de dados como estão hoje. Isso funciona, mas
  prints muito grandes vão ocupar espaço rápido no plano gratuito do
  Supabase (500 MB). Se isso virar problema, dá pra mover essas imagens
  para o Supabase Storage depois — me avisa quando chegar nesse ponto.
- **Nunca comite o arquivo `.env`** no GitHub — ele tem a chave do seu
  banco. O `.gitignore` já está configurado pra ignorá-lo.
