# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Product spec: `prd.md` (business + technical). Implementation follows its milestones (section 12).

## Commands

- `pnpm check` — lint + typecheck + unit/content/API tests. Run before every commit.
- `pnpm typecheck` runs `next typegen` first (generates `PageProps`/`LayoutProps` and `next/root-params` types).
- `pnpm test` (Vitest) · single test: `pnpm vitest run tests/unit/scoring.test.ts -t "name"`
- `pnpm test:e2e` (Playwright) · `pnpm build` validates Cache Components rules — run it after touching routes.

## Next.js 16 gotchas (this is not Next 15)

- `src/proxy.ts` replaces `middleware.ts` (next-intl locale redirect).
- `cacheComponents` is ON: reading `params`, `searchParams`, `cookies()`, `headers()` or uncached data outside `<Suspense>` fails the build. Push dynamic reads into a child wrapped in `<Suspense>`. Client components using `usePathname`/`useParams`/`useSearchParams` also need a `<Suspense>` parent.
- No `export const runtime` / `dynamic` / `dynamicParams` segment configs (unsupported with cacheComponents).
- The root layout is `src/app/[locale]/layout.tsx` (no `app/layout.tsx`). Get the locale with `next/root-params` (`locale()`), not by reading next-intl's request header; don't use `setRequestLocale`.

## Architecture rules

- **The answer key never reaches the client.** `src/content/questions.json` and `src/lib/questions.ts` are server-only; `/api/quiz/start` returns statements without `answer`/`explanation`. Score and duration are computed on the server only.
- Business rules live in `src/lib/quiz-service.ts` (pure, tested with the memory store); route handlers in `src/app/api` are thin wrappers. Put new rules in the service, not the routes.
- Each round has a secret token (only its hash is stored); submit and publish require it, so shared result links can't be claimed by others.
- Production serves only `reviewed: true` questions unless `QUIZ_INCLUDE_UNREVIEWED=true`; each level needs ≥ 10 playable questions or start returns 503.
- Only the next-intl namespaces listed in `CLIENT_NAMESPACES` (`src/app/[locale]/layout.tsx`) reach the browser. A Client Component using a new namespace must be added there.
- Persistence goes through the `QuizStore` interface (`src/lib/store`): `DATA_STORE=memory` for dev/tests, `supabase` in production. Never call Supabase directly from routes/components, and never expose `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_`).
- All UI strings live in `src/i18n/messages/{pt,en}.json`; both files must keep identical keys (enforced by a test).
- Colors come from CSS variable tokens in `src/app/globals.css` (Tailwind classes like `bg-accent`, `text-muted`); dark mode is class-based via next-themes.

## Conventions

- Code, identifiers and commit messages in English; Conventional Commits (`feat:`, `fix:`, `chore:`...).
- Use pnpm (not npm/yarn).
