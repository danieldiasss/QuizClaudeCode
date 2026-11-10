# QuizClaudeCode

Quiz web de **Verdadeiro ou Falso sobre Claude Code**, bilíngue (PT-BR / EN), com três níveis de dificuldade, revisão comentada no final, ranking global e compartilhamento do resultado.

> Projeto da comunidade, **não afiliado à Anthropic**. As afirmações foram escritas a partir da [documentação oficial](https://code.claude.com/docs), e cada resposta traz o link para a página que a confirma.

Especificação completa em [`prd.md`](./prd.md).

## Como funciona

- O jogador escolhe um nível e responde **10 afirmações** sorteadas, sem limite de tempo.
- **Pontuação:** 10, 20 ou 30 pontos por acerto (Iniciante, Intermediário, Avançado). No ranking, empates são decididos pelo menor tempo.
- O resultado só aparece no final, com explicação e link da documentação para cada pergunta.
- Para entrar no ranking basta um apelido, sem login.

### Anti-trapaça

- O navegador **nunca recebe o gabarito**: `/api/quiz/start` devolve só os enunciados.
- Pontuação e tempo são calculados **no servidor**. O que o cliente envia é ignorado.
- Cada rodada só pode ser enviada uma vez e publicada uma vez, e expira em 2 h.
- Rodadas com menos de 10 s não entram no ranking.
- Cada rodada tem um **token secreto**, que só quem a iniciou recebe. Quem abre um link de resultado compartilhado vê o resultado, mas não consegue publicá-lo.
- Há rate limit por IP, e o IP nunca é guardado em texto puro (só um hash com salt).
- Apelidos passam por um filtro de palavrões PT/EN e de termos que imitam a equipe oficial.

## Stack

Next.js 16 (App Router, `cacheComponents`) · TypeScript · Tailwind CSS 4 · next-intl · Zod · Supabase (Postgres) · Vitest · Playwright · Vercel.

## Rodando localmente

Requisitos: Node.js 24+ e pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Abra http://localhost:3000. Em desenvolvimento os dados ficam **em memória** (`DATA_STORE=memory`), então não é preciso configurar banco nenhum. Tudo se perde quando o servidor reinicia.

### Scripts

| Comando                     | O que faz                                             |
| --------------------------- | ----------------------------------------------------- |
| `pnpm dev`                  | Servidor de desenvolvimento                           |
| `pnpm build` / `pnpm start` | Build e servidor de produção                          |
| `pnpm check`                | Lint + typecheck + testes (unitários, conteúdo e API) |
| `pnpm test`                 | Vitest                                                |
| `pnpm test:e2e`             | Playwright (faz o build e sobe o servidor sozinho)    |
| `pnpm format`               | Prettier                                              |

Na primeira vez, antes do `pnpm test:e2e`, instale o navegador com `pnpm exec playwright install chromium`.

### Variáveis de ambiente

| Variável                    | Uso                                                                             |
| --------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`      | URL pública, usada nos links de compartilhamento e na imagem OG                 |
| `DATA_STORE`                | `memory` ou `supabase`. **Obrigatória em produção**: não há fallback silencioso |
| `SUPABASE_URL`              | URL do projeto Supabase (só no servidor)                                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (só no servidor; **nunca** use o prefixo `NEXT_PUBLIC_`)     |
| `IP_HASH_SALT`              | Texto aleatório longo, usado no hash dos IPs                                    |
| `QUIZ_INCLUDE_UNREVIEWED`   | `true` para servir também perguntas com `reviewed: false` em produção           |

## Conteúdo: banco de perguntas

As 60 perguntas (20 por nível, metade verdadeiras e metade falsas) ficam em [`src/content/questions.json`](./src/content/questions.json). Esse arquivo só é importado no servidor.

**Em produção, só entram perguntas com `reviewed: true`.** Hoje todas estão com `false`, à espera de revisão humana. O roteiro, com as perguntas de menor confiança no topo, está em [`docs/content-review.md`](./docs/content-review.md).

Cada nível precisa de **pelo menos 10 perguntas revisadas**. Se não tiver, o `/api/quiz/start` devolve 503. Para publicar antes de concluir a revisão, use `QUIZ_INCLUDE_UNREVIEWED=true`.

O teste `tests/content/questions.test.ts` valida o banco: contagem por nível, IDs únicos, textos nos dois idiomas, balanço V/F e links para a documentação oficial.

## Deploy (Supabase + Vercel)

### 1. Supabase

1. Crie um projeto em https://supabase.com (o plano gratuito basta).
2. Em **SQL Editor**, cole e rode o conteúdo de [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
3. Em **Project Settings → API**, copie a **Project URL** e a chave **service_role**.

As tabelas ficam com RLS ativo e **sem policies**, então ninguém acessa direto do navegador. Só o servidor, com a service role, lê e escreve.

### 2. Vercel

1. Importe o repositório do GitHub em https://vercel.com/new.
2. Em **Environment Variables**, configure:
   - `DATA_STORE=supabase`
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, com os valores do passo anterior
   - `IP_HASH_SALT`: gere um valor com `openssl rand -hex 32`
   - `NEXT_PUBLIC_SITE_URL`: a URL final, por exemplo `https://seu-quiz.vercel.app`
   - `QUIZ_INCLUDE_UNREVIEWED=true`, só enquanto a revisão do conteúdo não terminar
3. Faça o deploy. Cada PR ganha um preview, e a branch `main` vai para produção.

### Moderação

Para remover um apelido impróprio do ranking, apague a linha em `leaderboard_entries` pelo painel do Supabase.

## Estrutura

```
src/
  app/[locale]/        páginas (home, quiz, resultado, ranking, sobre)
  app/api/             route handlers (quiz, leaderboard, imagem OG)
  components/          UI
  content/             banco de perguntas (server-only)
  i18n/                next-intl: rotas, request config, mensagens pt/en
  lib/                 domínio: sorteio, pontuação, apelido, serviço, store
  lib/store/           adapters: memória e Supabase
  proxy.ts             redirecionamento de idioma (antigo middleware)
supabase/migrations/   schema SQL
tests/                 unit · content · api · e2e
```

## Observação para Windows + OneDrive

Se o projeto estiver numa pasta sincronizada pelo OneDrive, o build pode falhar com `EPERM: operation not permitted, unlink '.next\...'`. O OneDrive transforma as pastas geradas em reparse points somente leitura. Para contornar, apague a pasta antes de rodar o build de novo:

```powershell
Remove-Item -LiteralPath .next -Recurse -Force
```

A solução definitiva é manter o projeto fora do OneDrive (por exemplo, `C:\dev\QuizClaudeCode`). O código já está versionado no GitHub.
