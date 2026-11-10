# PRD — Quiz Web "Verdadeiro ou Falso: Claude Code"

> **Documento destinado ao Claude Code.** Este PRD descreve o produto (visão de negócio) e a implementação (visão técnica) de forma que o projeto possa ser construído do zero, seguindo os marcos da seção 12. Onde houver ambiguidade, siga as **Decisões** (seção 3) e os **Critérios de Aceite** (seção 11).

---

## 1. Visão geral

### 1.1 Problema
O Claude Code cresceu rápido (CLI, IDE, desktop, web, hooks, MCP, skills, subagents, SDK...). Muita gente usa só o básico e não sabe o que sabe — ou o que não sabe. Falta uma forma leve, divertida e compartilhável de testar e aprender sobre a ferramenta.

### 1.2 Solução
Um quiz web público, bilíngue (PT-BR / EN), de perguntas **Verdadeiro ou Falso** sobre Claude Code, com três níveis de dificuldade (Iniciante → Avançado), revisão completa com explicações ao final, **ranking global único** e **compartilhamento do resultado** em redes sociais.

### 1.3 Objetivos de negócio
| Objetivo | Métrica (KPI) | Meta inicial (90 dias) |
|---|---|---|
| Engajar a comunidade | Rodadas completadas | 1.000 rodadas |
| Viralizar organicamente | Taxa de compartilhamento (shares / rodadas concluídas) | ≥ 10% |
| Ensinar | % de usuários que abrem ao menos 1 link de documentação na revisão | ≥ 20% |
| Retenção leve | % de jogadores que jogam > 1 nível | ≥ 30% |
| Competição saudável | % de rodadas enviadas ao ranking | ≥ 40% |

### 1.4 Fora de escopo (MVP)
- Login/contas de usuário (identidade é apenas um apelido).
- Painel administrativo de perguntas (conteúdo vive em arquivos JSON no repositório).
- Modos com cronômetro / contra o relógio.
- Certificados, badges, histórico local de partidas.
- Outros tipos de pergunta além de Verdadeiro/Falso.

---

## 2. Público-alvo e personas

| Persona | Perfil | O que busca |
|---|---|---|
| **Gestora curiosa** (Iniciante) | Gestores, PMs, pessoas de negócio que ouviram falar de Claude Code | Entender o que é, para quem é, onde roda, como é cobrado |
| **Dev usuário** (Intermediário) | Desenvolvedor que usa Claude Code no dia a dia | Validar conhecimento de comandos, atalhos, CLAUDE.md, permissões, plan mode |
| **Power user** (Avançado) | Dev/DevOps que estende e automatiza o Claude Code | Testar conhecimento de hooks, MCP, skills, plugins, subagents, SDK, headless, CI |

Público **aberto**, acesso anônimo, desktop e mobile.

---

## 3. Decisões tomadas no brainstorm

| Tema | Decisão |
|---|---|
| Propósito | Quiz público / comunidade |
| Formato | Verdadeiro ou Falso |
| Níveis | **Escolha livre** pelo jogador: Iniciante, Intermediário, Avançado |
| Rodada | **10 perguntas** sorteadas do nível escolhido, **sem limite de tempo** |
| Feedback | **Somente ao final**: tela de resultado + revisão de todas as respostas com explicação e link para documentação oficial |
| Idioma | **PT-BR + Inglês**, com seletor de idioma (padrão detectado pelo navegador; fallback PT-BR) |
| Engajamento | **Ranking global** + **compartilhar resultado** |
| Ranking | **Único e geral** (todos os níveis na mesma tabela), sem recortes por período |
| Pontuação | Peso por nível: Iniciante **10**, Intermediário **20**, Avançado **30** pontos por acerto. **Desempate pelo menor tempo total** da rodada |
| Identidade | **Apelido livre, sem login** (com filtro de palavrões e anti-abuso) |
| Conteúdo | **~60 perguntas** (20 por nível) geradas pelo Claude Code a partir da documentação oficial, revisadas por humano |
| Temas | Negócio e conceitos; Uso no dia a dia; Configuração e extensão; Avançado/automação |
| Stack | **Next.js (App Router) + TypeScript + Tailwind CSS** |
| Backend do ranking | **Supabase (Postgres)** acessado apenas pelo servidor (Route Handlers) |
| Visual | **Clean / moderno** |
| Deploy | **Vercel** |

---

## 4. Jornada do usuário

```
[Home] → escolhe idioma (opcional) → escolhe nível → [Quiz: 10 perguntas V/F]
   → [Resultado: pontuação + revisão com explicações]
   → (opcional) informa apelido e envia ao ranking → vê sua posição
   → (opcional) compartilha resultado / joga outro nível / vê ranking
```

### 4.1 Telas

1. **Home (`/[locale]`)**
   - Título, subtítulo curto ("Quanto você sabe sobre Claude Code?").
   - 3 cards de nível com nome, descrição curta, pontos por acerto e pontuação máxima (100 / 200 / 300).
   - Link para o Ranking. Seletor de idioma no header.

2. **Quiz (`/[locale]/quiz/[level]`)**
   - Indicador de progresso ("Pergunta 3 de 10" + barra).
   - Enunciado da afirmação em destaque.
   - Dois botões grandes: **Verdadeiro** / **Falso** (atalhos de teclado `V`/`T` e `F`, além de setas ←/→).
   - Ao responder, avança automaticamente para a próxima (sem revelar se acertou).
   - Botão "Voltar" para revisar/alterar a resposta anterior antes de finalizar (opcional, mas desejável).
   - Na última pergunta, botão **"Ver resultado"**.
   - Se o usuário recarregar a página no meio, a rodada em andamento é restaurada (estado em `sessionStorage`).

3. **Resultado (`/[locale]/result/[sessionId]`)**
   - Pontuação (ex.: "160 pts"), acertos ("8/10"), tempo total, nível.
   - Mensagem por faixa de desempenho (0–4, 5–7, 8–9, 10 acertos).
   - **Revisão**: lista das 10 perguntas com resposta do jogador, resposta correta, ✓/✗, explicação curta e link "Saiba mais" para a documentação oficial.
   - Formulário "Entrar no ranking": campo de apelido + botão enviar. Após enviar, mostra a posição ("Você está em #42 de 1.230").
   - Botões de compartilhamento.
   - Ações: "Jogar novamente", "Tentar outro nível", "Ver ranking".

4. **Ranking (`/[locale]/leaderboard`)**
   - Top 100: posição, apelido, pontuação, nível, acertos, tempo, data.
   - Destaque da linha do jogador atual (se acabou de enviar).
   - Paginação simples ou "carregar mais".

5. **Sobre (`/[locale]/about`)** — breve explicação do projeto, aviso de que **não é um produto oficial da Anthropic**, e links para a documentação oficial.

### 4.2 Estados de erro e vazio
- Ranking vazio: "Seja o primeiro a entrar no ranking!".
- Falha de rede ao enviar ao ranking: mensagem e botão "Tentar novamente" (não perder o resultado).
- Sessão de quiz expirada/inválida: mensagem e botão para voltar à Home.
- Apelido rejeitado: mensagem específica (tamanho, caracteres, palavra imprópria).

---

## 5. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| RF01 | Exibir os 3 níveis e permitir escolha livre | Must |
| RF02 | Sortear 10 perguntas aleatórias e distintas do nível escolhido, a cada rodada | Must |
| RF03 | Não revelar correção durante a rodada; o cliente **não recebe o gabarito** antes de finalizar | Must |
| RF04 | Calcular pontuação **no servidor** (peso por nível) e medir tempo total no servidor | Must |
| RF05 | Exibir resultado + revisão com explicação e link de doc para cada pergunta | Must |
| RF06 | Interface e conteúdo das perguntas em PT-BR e EN, com seletor de idioma | Must |
| RF07 | Enviar resultado ao ranking com apelido (uma vez por sessão de quiz) | Must |
| RF08 | Exibir ranking global único ordenado por pontuação desc, tempo asc, data asc | Must |
| RF09 | Compartilhar resultado: Web Share API (mobile), LinkedIn, X/Twitter, copiar texto | Must |
| RF10 | Imagem Open Graph dinâmica do resultado (preview bonito no link compartilhado) | Should |
| RF11 | Restaurar rodada em andamento após recarregar a página | Should |
| RF12 | Voltar e alterar resposta anterior durante a rodada | Could |
| RF13 | Embaralhar a ordem das perguntas e evitar repetir as da rodada anterior do mesmo nível (quando possível) | Could |

## 6. Requisitos não funcionais

- **Performance:** LCP < 2,5s em 4G; Lighthouse ≥ 90 em Performance, Acessibilidade, Boas práticas e SEO.
- **Responsivo:** mobile-first; funcional de 360px a 1920px.
- **Acessibilidade:** WCAG 2.1 AA — navegação por teclado, foco visível, `aria-live` para progresso, contraste adequado, `prefers-reduced-motion` respeitado.
- **Tema:** claro e escuro (segue o sistema, com toggle).
- **Segurança/anti-trapaça:** gabarito apenas no servidor; pontuação e tempo calculados no servidor; rate limiting; validação com Zod em todas as rotas.
- **Privacidade:** nenhum dado pessoal coletado além do apelido; IP usado apenas em hash para rate limit (não armazenar IP em claro). Sem cookies de rastreamento.
- **Custo:** caber nos planos gratuitos de Vercel e Supabase.
- **Disclaimer:** rodapé com "Projeto da comunidade, não afiliado à Anthropic."

---

## 7. Conteúdo: banco de perguntas

### 7.1 Distribuição
- **60 perguntas**: 20 por nível.
- Dentro de cada nível, equilíbrio aproximado de **50% verdadeiras / 50% falsas**.
- Cobertura de temas por nível:

| Nível | Temas predominantes |
|---|---|
| Iniciante (negócio) | O que é o Claude Code, para quem é, superfícies onde roda (terminal, IDEs, desktop, web), planos/assinatura vs. API, casos de uso, segurança em alto nível, diferença entre Claude (chat) e Claude Code |
| Intermediário (uso diário) | Comandos slash (`/help`, `/clear`, `/compact`, `/init`...), `CLAUDE.md` e memória, modos de permissão, plan mode, atalhos de teclado, `!` para comandos shell, referência a arquivos com `@`, retomada de sessões, git/commits |
| Avançado (extensão e automação) | `settings.json` e hierarquia de configurações, hooks (eventos e uso), MCP servers, skills, plugins, subagents, modo headless (`-p`), saída JSON, GitHub Actions/CI, git worktrees, Agent SDK, permissões e sandbox |

### 7.2 Regras de qualidade das perguntas
1. Cada pergunta é uma **afirmação** clara e inequívoca, verificável na **documentação oficial** (https://code.claude.com/docs e/ou https://docs.claude.com).
2. Evitar pegadinhas de redação, negações duplas e afirmações dependentes de versão muito específica ou de preço exato que muda com frequência.
3. Afirmações falsas devem ser **plausíveis** (erros comuns), não absurdas.
4. Explicação de 1–3 frases dizendo **por que** é verdadeira/falsa.
5. Todo item tem `sourceUrl` apontando para a página da documentação que o comprova.
6. Todo item tem campo `reviewed` (boolean). **Somente perguntas com `reviewed: true` entram em produção**; em desenvolvimento, todas são usadas. Ao gerar as perguntas, o Claude Code deve criá-las com `reviewed: false` e listar ao final quais afirmações tem menor confiança, para revisão humana.
7. Textos PT-BR e EN devem ter o mesmo sentido (tradução fiel, não literal).
8. Ao gerar, consultar a documentação oficial atual (não confiar apenas em conhecimento prévio), pois funcionalidades mudam.

### 7.3 Formato (arquivo `src/content/questions.json`, **importado apenas no servidor**)

```json
[
  {
    "id": "beg-001",
    "level": "beginner",
    "topic": "business",
    "answer": true,
    "statement": {
      "pt": "O Claude Code pode ser usado diretamente no terminal.",
      "en": "Claude Code can be used directly in the terminal."
    },
    "explanation": {
      "pt": "O Claude Code nasceu como uma ferramenta de linha de comando e também está disponível em IDEs, app desktop e web.",
      "en": "Claude Code started as a command-line tool and is also available in IDEs, the desktop app and the web."
    },
    "sourceUrl": "https://code.claude.com/docs/en/overview",
    "reviewed": false
  }
]
```

- `level`: `"beginner" | "intermediate" | "advanced"`
- `topic`: `"business" | "daily-use" | "configuration" | "automation"`
- IDs: `beg-NNN`, `int-NNN`, `adv-NNN`, únicos e estáveis (nunca reutilizar um ID removido).

### 7.4 Exemplos de afirmações (referência de tom/dificuldade — validar na doc antes de usar)
- *Iniciante (V):* "O Claude Code consegue ler e editar arquivos do seu projeto."
- *Iniciante (F):* "O Claude Code só funciona dentro do navegador."
- *Intermediário (V):* "O arquivo CLAUDE.md é usado para dar instruções persistentes ao Claude Code sobre o projeto."
- *Intermediário (F):* "O comando /clear apaga os arquivos modificados na sessão."
- *Avançado (V):* "Hooks permitem executar comandos automaticamente em eventos como antes ou depois do uso de uma ferramenta."
- *Avançado (F):* "Servidores MCP só podem ser configurados por meio da interface web."

---

## 8. Arquitetura técnica

### 8.1 Stack
| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Route Handlers) |
| Linguagem | TypeScript (strict) |
| Estilo | Tailwind CSS + componentes próprios (opcional: shadcn/ui) |
| i18n | `next-intl` com rotas `/pt` e `/en` |
| Validação | Zod |
| Banco | Supabase (Postgres) via `@supabase/supabase-js`, **somente no servidor** com service role key |
| OG Image | `next/og` (`ImageResponse`) |
| Filtro de palavrões | lista própria PT+EN (+ opcional `leo-profanity`/`bad-words`) com normalização (minúsculas, sem acentos, leetspeak básico) |
| Rate limit | Tabela no Postgres (hash do IP + janela) ou `@upstash/ratelimit` se disponível |
| Testes | Vitest (unit) + Playwright (E2E) |
| Qualidade | ESLint, Prettier, `tsc --noEmit` |
| Gerenciador | pnpm (ou npm, se pnpm indisponível) |
| Deploy | Vercel (preview por PR, produção na `main`) |

### 8.2 Fluxo anti-trapaça (essencial)

```
Cliente                                   Servidor (Route Handlers)                 Supabase
  | POST /api/quiz/start {level, locale}      |                                        |
  |------------------------------------------>| sorteia 10 IDs do nível                |
  |                                           | cria quiz_session (ids, started_at) --->|
  |<------------------------------------------| {sessionId, questions:[{id,statement}]} |
  |   (sem answer/explanation!)               |                                        |
  | ... usuário responde ...                  |                                        |
  | POST /api/quiz/submit {sessionId, answers}|                                        |
  |------------------------------------------>| valida sessão (não finalizada, < 2h)   |
  |                                           | corrige, calcula score e duração       |
  |                                           | grava finished_at, score, answers ---->|
  |<------------------------------------------| {score, correct, durationMs, review[]}  |
  | POST /api/leaderboard {sessionId,nickname}|                                        |
  |------------------------------------------>| valida apelido, sessão finalizada,     |
  |                                           | ainda não publicada → insere entry --->|
  |<------------------------------------------| {rank, total}                           |
```

Regras:
- O **cliente nunca envia pontuação nem tempo**; apenas respostas. Score e duração = `finished_at - started_at`, calculados no servidor.
- Uma sessão só pode ser submetida **uma vez** e publicada no ranking **uma vez**.
- `answers` deve conter exatamente os 10 IDs da sessão, cada um com boolean.
- Sessões não finalizadas expiram após 2 horas.
- Duração mínima plausível: se `durationMs < 10 s` para 10 perguntas, aceitar o resultado mas **não permitir publicação no ranking** (anti-bot).

### 8.3 Pontuação
```
pontosPorAcerto = { beginner: 10, intermediate: 20, advanced: 30 }
score = acertos * pontosPorAcerto[level]        // máx: 100 / 200 / 300
ordem do ranking: score DESC, duration_ms ASC, created_at ASC
```

### 8.4 Modelo de dados (Supabase / Postgres)

```sql
-- supabase/migrations/0001_init.sql
create extension if not exists "pgcrypto";

create type quiz_level as enum ('beginner', 'intermediate', 'advanced');

create table quiz_sessions (
  id            uuid primary key default gen_random_uuid(),
  level         quiz_level not null,
  locale        text not null check (locale in ('pt', 'en')),
  question_ids  text[] not null check (array_length(question_ids, 1) = 10),
  answers       jsonb,                          -- {"beg-001": true, ...}
  correct_count smallint check (correct_count between 0 and 10),
  score         smallint check (score between 0 and 300),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  duration_ms   integer,
  ip_hash       text,                           -- sha256(ip + salt), nunca IP em claro
  published     boolean not null default false
);

create table leaderboard_entries (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null unique references quiz_sessions(id) on delete cascade,
  nickname      text not null check (char_length(nickname) between 3 and 20),
  level         quiz_level not null,
  score         smallint not null,
  correct_count smallint not null,
  duration_ms   integer not null,
  created_at    timestamptz not null default now()
);

create index leaderboard_order_idx
  on leaderboard_entries (score desc, duration_ms asc, created_at asc);

-- RLS: bloqueia acesso direto do cliente; só o servidor (service role) acessa.
alter table quiz_sessions enable row level security;
alter table leaderboard_entries enable row level security;
-- (sem policies para anon = nenhum acesso público)
```

Posição do jogador: `count(*) + 1` de entradas com ordenação estritamente melhor que a dele.

### 8.5 API (Route Handlers em `src/app/api`)

| Método | Rota | Entrada (Zod) | Saída |
|---|---|---|---|
| POST | `/api/quiz/start` | `{ level, locale }` | `{ sessionId, level, questions: [{ id, statement }] }` (statement no idioma pedido) |
| POST | `/api/quiz/submit` | `{ sessionId, answers: Record<id, boolean> }` | `{ score, correctCount, durationMs, level, canPublish, review: [{ id, statement, userAnswer, correctAnswer, isCorrect, explanation, sourceUrl }] }` |
| GET | `/api/quiz/result/[sessionId]?locale=` | — | Mesmo payload do submit (para recarregar/compartilhar a página de resultado) |
| POST | `/api/leaderboard` | `{ sessionId, nickname }` | `{ rank, total }` |
| GET | `/api/leaderboard?limit=100&offset=0` | — | `{ entries: [...], total }` |
| GET | `/api/og/result/[sessionId]` | — | PNG 1200×630 (score, nível, acertos) |

Códigos de erro padronizados: `400` validação, `404` sessão inexistente, `409` já submetida/publicada, `422` apelido inválido, `429` rate limit. Corpo: `{ error: { code, message } }` com `code` traduzível no cliente.

Rate limits sugeridos (por hash de IP): `start` 30/10min, `submit` 30/10min, `leaderboard POST` 10/10min.

### 8.6 Validação de apelido
- 3–20 caracteres; permitidos: letras (com acentos), números, espaço, `_`, `-`, `.`.
- `trim` e colapsar espaços múltiplos.
- Rejeitar palavrões (PT/EN) após normalização (minúsculas, sem acentos, `0→o`, `1→i`, `3→e`, `4→a`, `5→s`, `@→a`).
- Rejeitar termos que imitem marcas/oficiais ("anthropic", "claude official", "admin", "moderator").
- Apelidos **não** precisam ser únicos.

### 8.7 Compartilhamento
- Texto: PT — "Fiz {score} pts ({correct}/10) no nível {nível} do Quiz Verdadeiro ou Falso sobre Claude Code! Consegue me superar? {url}"; EN equivalente.
- `url` = `/[locale]/result/[sessionId]` com metadados OG apontando para `/api/og/result/[sessionId]`.
- Botões: Web Share API (quando `navigator.share` existir), LinkedIn (`https://www.linkedin.com/sharing/share-offsite/?url=`), X (`https://x.com/intent/post?text=`), copiar para área de transferência (com toast de confirmação).
- A página pública de resultado mostra pontuação e nível; a revisão detalhada (com gabarito) fica visível a todos — aceitável, pois o banco é estático e o objetivo é educativo.

### 8.8 Estrutura de pastas

```
.
├── prd.md
├── CLAUDE.md                      # gerado no marco 1 (convenções do projeto)
├── README.md
├── .env.example
├── supabase/migrations/0001_init.sql
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                       # Home
│   │   │   ├── quiz/[level]/page.tsx
│   │   │   ├── result/[sessionId]/page.tsx
│   │   │   ├── leaderboard/page.tsx
│   │   │   └── about/page.tsx
│   │   └── api/
│   │       ├── quiz/start/route.ts
│   │       ├── quiz/submit/route.ts
│   │       ├── quiz/result/[sessionId]/route.ts
│   │       ├── leaderboard/route.ts
│   │       └── og/result/[sessionId]/route.tsx
│   ├── components/                # LevelCard, QuestionCard, ProgressBar, ResultSummary,
│   │                              # ReviewList, NicknameForm, ShareButtons, LeaderboardTable,
│   │                              # LocaleSwitcher, ThemeToggle
│   ├── content/questions.json     # server-only
│   ├── i18n/                      # config next-intl + messages/pt.json, messages/en.json
│   ├── lib/
│   │   ├── questions.ts           # server-only: carregar, filtrar reviewed, sortear
│   │   ├── scoring.ts             # cálculo de score (puro, testável)
│   │   ├── nickname.ts            # validação/normalização/palavrões
│   │   ├── rate-limit.ts
│   │   ├── supabase-server.ts     # client com service role (import 'server-only')
│   │   └── schemas.ts             # Zod
│   └── types/
└── tests/
    ├── unit/                      # scoring, nickname, questions (sorteio), schemas
    ├── content/                   # validação do banco de perguntas
    └── e2e/                       # Playwright
```

### 8.9 Variáveis de ambiente (`.env.example`)
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=     # apenas servidor; nunca prefixar com NEXT_PUBLIC_
IP_HASH_SALT=                  # string aleatória longa
```

---

## 9. Design / UI (Clean / moderno)

- **Estilo:** cards com cantos arredondados (`rounded-2xl`), sombras suaves, bastante espaço em branco, tipografia sans-serif (Inter ou Geist via `next/font`).
- **Cores:** base neutra (cinzas), cor de destaque **laranja-terracota** (ex.: `#D97757`) para CTAs e progresso; verde/vermelho suaves **apenas na revisão** (sempre acompanhados de ícone ✓/✗, nunca só cor). Definir tokens via CSS variables para tema claro e escuro.
- **Botões V/F:** grandes (mín. 48px de altura, ideal ≥ 64px no mobile), lado a lado no desktop, empilhados ou lado a lado no mobile.
- **Animações:** transições sutis entre perguntas (fade/slide ≤ 200ms), desativadas com `prefers-reduced-motion`.
- **Não** usar logotipos ou identidade visual oficial da Anthropic/Claude; usar nome descritivo do projeto e o disclaimer de não afiliação.

---

## 10. Qualidade e testes

- **Unitários (Vitest):** `scoring` (todos os níveis, 0–10 acertos), `nickname` (válidos, inválidos, palavrões com leetspeak), sorteio (10 únicas, mesmo nível, apenas `reviewed` em produção), schemas Zod.
- **Validação de conteúdo (teste automatizado):** `questions.json` tem 20 perguntas por nível, IDs únicos, campos PT e EN não vazios, `sourceUrl` válida (https), balanço V/F entre 35% e 65% por nível.
- **API (Vitest com Supabase mockado ou local):** submit duplo → 409; respostas incompletas → 400; publicar sessão não finalizada → 409; tempo < 10s → `canPublish: false`.
- **E2E (Playwright):** jogar uma rodada completa em PT e em EN; ver revisão; enviar ao ranking; ver posição no ranking; trocar idioma; navegação apenas por teclado.
- **CI:** GitHub Actions rodando lint, typecheck, testes unitários/conteúdo e build em cada PR.

---

## 11. Critérios de aceite (Definition of Done do MVP)

1. Usuário escolhe qualquer nível e responde 10 perguntas V/F sem ver correção até o final.
2. O payload de `/api/quiz/start` **não contém** `answer` nem `explanation` (verificável no DevTools e em teste).
3. Resultado mostra pontuação correta segundo os pesos 10/20/30, acertos, tempo e revisão com explicação + link.
4. Toda a interface e as 60 perguntas funcionam em PT-BR e EN; o seletor de idioma preserva a página atual.
5. Envio ao ranking com apelido válido retorna a posição; o ranking ordena por score ↓, tempo ↑, data ↑.
6. Não é possível publicar a mesma sessão duas vezes nem forjar pontuação via requisição manual.
7. Apelidos impróprios são rejeitados com mensagem clara.
8. Compartilhamento funciona (LinkedIn, X, copiar; Web Share no mobile) e o link exibe imagem OG do resultado.
9. Lighthouse ≥ 90 nas 4 categorias na Home e no Quiz (mobile).
10. Todos os testes passam e o projeto faz deploy na Vercel com Supabase configurado.

---

## 12. Plano de implementação (marcos para o Claude Code)

Execute em ordem; ao fim de cada marco, rode lint, typecheck e testes, e faça um commit.

1. **Fundação:** criar projeto Next.js + TS + Tailwind + ESLint/Prettier; configurar `next-intl` (`/pt`, `/en`); layout base com header (logo textual, seletor de idioma, toggle de tema) e footer com disclaimer; gerar `CLAUDE.md` com comandos e convenções; `.env.example`.
2. **Conteúdo:** consultar a documentação oficial do Claude Code e gerar `src/content/questions.json` com 60 perguntas seguindo a seção 7 (`reviewed: false`); criar teste de validação de conteúdo; produzir ao final uma lista das afirmações com menor confiança para revisão humana.
3. **Domínio:** `lib/questions.ts`, `lib/scoring.ts`, `lib/nickname.ts`, `lib/schemas.ts` com testes unitários.
4. **Banco e API:** migration Supabase, `supabase-server.ts`, rate limit, Route Handlers `quiz/start`, `quiz/submit`, `quiz/result`, `leaderboard` (GET/POST) com testes.
5. **UI do quiz:** Home com cards de nível, tela do quiz (progresso, V/F, teclado, restauração via `sessionStorage`), tela de resultado com revisão.
6. **Ranking e compartilhamento:** formulário de apelido, página de ranking, botões de share, imagem OG dinâmica, metadados por página.
7. **Polimento:** acessibilidade, tema escuro, estados de erro/vazio, Lighthouse, página Sobre.
8. **Entrega:** testes E2E com Playwright, workflow de CI, README com setup (Supabase + Vercel) e instruções de deploy.

---

## 13. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Perguntas desatualizadas ou incorretas (o Claude Code evolui rápido) | `sourceUrl` obrigatório, flag `reviewed`, revisão humana antes de produção, evitar detalhes voláteis (preços exatos, números de versão) |
| Trapaça no ranking | Gabarito e pontuação apenas no servidor, sessão única, tempo mínimo, rate limit |
| Apelidos ofensivos | Filtro com normalização; possibilidade de remover entradas manualmente via painel do Supabase |
| Banco pequeno → repetição de perguntas | Sorteio evitando a rodada anterior; roadmap para ampliar o banco |
| Confusão com produto oficial | Nome descritivo, disclaimer visível, sem uso de marca/logotipo oficial |
| Limites dos planos gratuitos | Índices adequados, payloads pequenos, cache curto (`revalidate: 30`) no GET do ranking |

---

## 14. Roadmap pós-MVP (ideias)
- Ranking por período (semanal/mensal) e por nível.
- Badges/certificado ao atingir 10/10 em um nível.
- Histórico local de partidas.
- Modo desafio com cronômetro.
- Banco ampliado (100+ por nível) e mais idiomas.
- Painel admin para revisar/editar perguntas e moderar ranking.
- Analytics de privacidade (ex.: Vercel Analytics) para medir os KPIs da seção 1.3, incluindo "perguntas com maior taxa de erro".
