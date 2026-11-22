# ZooTerm — Site institucional (versão 1.0)

Site estático para GitHub Pages, com página institucional, cadastro, login, confirmação de e-mail e recuperação de senha pelo Supabase Auth.

## Publicação

1. Envie **o conteúdo desta pasta** para a raiz da branch `main` do repositório `Alan-Prestes/zooterm-site` (não envie a pasta externa como subpasta).
2. Em `Settings → Pages`, configure `Deploy from a branch`, `main`, `/(root)`.
3. Abra `https://alan-prestes.github.io/zooterm-site/` após a publicação.

## Configuração do Supabase

Em `js/config.js`, substitua `COLE_AQUI_A_CHAVE_PUBLICAVEL` pela **publishable key** (`sb_publishable_...`) ou pela chave pública `anon` do seu projeto. A URL do projeto já está preenchida; confirme se está correta.

**Nunca publique `service_role`, `sb_secret_...`, senhas, tokens administrativos ou arquivos `.env` com segredos.**

Em `Supabase → Authentication → URL Configuration`, adicione, durante os testes:

`https://alan-prestes.github.io/zooterm-site/auth/callback/`

Depois de publicar o domínio próprio e implementar a página de callback no mesmo endereço, autorize:

`https://zooterm.com.br/auth/callback/`

A configuração `Site URL` pode permanecer `https://zooterm.com.br` se o domínio estiver planejado; os links de cadastro usam `emailRedirectTo` explícito. Confirme que a confirmação de e-mail está habilitada e que os modelos de e-mail aceitam o redirecionamento configurado.

Para testes locais, sirva o site por HTTP, não por `file://`, por exemplo `python -m http.server 5500` na pasta do projeto. O redirect correspondente deve estar autorizado no Supabase.

## Limitação de segurança importante

**O GitHub Pages não protege o Shiny.** A sessão do Supabase validada no navegador **não equivale** a autenticação no Posit Connect Cloud. O endereço direto do Shiny continua acessível conforme as permissões do Connect. Não disponibilize o dashboard publicamente até implementar e testar controle de acesso **no servidor**, ou por um gateway confiável, e verificar as capacidades do plano de hospedagem.

O site não oferece link direto ao Shiny nesta versão, intencionalmente.

## Equipe

As fotografias estão representadas por placeholders. Substitua por fotos autorizadas quando disponíveis.

## Arquivos

- `index.html`: página institucional
- `login.html`: login e recuperação de senha
- `cadastro.html`: cadastro
- `auth/callback/index.html`: confirmação e redefinição de senha
- `css/style.css`: visual responsivo
- `js/config.js`: configuração pública do Supabase
- `js/auth.js`: lógica de autenticação no navegador
- `assets/`: logotipo e imagens
