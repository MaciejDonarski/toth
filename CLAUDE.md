# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

@README.md

# Project notes

## Running a subset of tests

- One workspace: `pnpm --filter @toth/ui test` (or `test:watch`).
- One file / one test: `pnpm --filter @toth/ui exec vitest run src/components/button.test.tsx -t "name"`.
- Tests must match `src/**/*.test.{ts,tsx}` (jsdom, Vitest globals, `css: false`). Add `// @vitest-environment node` for native/Node-only code (e.g. argon2).
- Integration tests are `src/**/*.int.test.ts`. Run them with `pnpm --filter @toth/app test:integration`. They use a real Postgres `toth_test` database on the compose stack (created and migrated by `test/integration/global-setup.ts`) plus Mailpit, and `pnpm test` excludes them.

## Monorepo wiring

- `@toth/ui` exports by path pattern: `components/*` → `.tsx`, `hooks/*` and `lib/*` → `.ts` (`lib/highlighter` is the one `.tsx` exception). A new `.tsx` file in `lib/` or `hooks/` needs its own `exports` entry in `packages/ui/package.json`.
- When you add a workspace, also add it to the `workspaces` list in `lint-staged.config.mjs`. The pre-commit hook runs ESLint per workspace with `--max-warnings=0`, and it skips files outside the listed workspaces.
- `apps/app/src/composition-root.ts` is `server-only`. In Vitest, `server-only` is aliased to `apps/app/test/server-only-stub.ts`.

## Database (Prisma 7)

- Schema: `apps/app/prisma/schema.prisma`. CLI config: `apps/app/prisma.config.ts` (uses `DIRECT_URL`). The runtime client is in `src/infrastructure/db/prisma-client.ts` (`@prisma/adapter-pg`, `DATABASE_URL`).
- Get the client with `getPrisma()` (lazy). The composition root also builds env-dependent adapters lazily (`getAuthInfrastructure()`), so importing it needs no env.
- The client is generated into `apps/app/src/generated/prisma` (gitignored, created on `postinstall`). Import it as `@/generated/prisma/client`, and only from `src/infrastructure/`. ESLint enforces this.
- Local stack is `compose.yaml` (`pnpm stack:up`). Ports are 5433/1026/8026, because the defaults clash with other local projects.

## shadcn / @toth/ui gotchas

- The preset `bgmJ1SHMW` resolves to style `base-vega`, so components use **Base UI** (`@base-ui/react`), not Radix. Use the `render` prop instead of `asChild`.
- Run `shadcn add` from `apps/app`. After each add:
  - the CLI writes `import { cn } from "cn"`. Change it to `@toth/ui/lib/utils`, which re-exports `@toth/utils`.
  - the CLI may put hooks/lib files into `apps/app`. Move them to `packages/ui/src/{hooks,lib}`.
  - add `<name>.stories.tsx` and `<name>.test.tsx` next to the component.
- Keep vendored shadcn files as upstream ships them, apart from the `cn` import. Relax lint rules for them in `packages/ui/eslint.config.js` instead of editing the code.
- There is no `sonner`. Notifications use `toast` / `Toaster` from `@toth/ui/components/toast` (Base UI Toast).
- Known upstream a11y issue: `PaginationLink` renders `<a role="button">`, because Base UI `Button` uses `nativeButton={false}`. It is left as is.
- `packages/ui/src/styles/globals.css` `@source` paths are relative to that file. Scaffolding wrote them wrong once (`packages/apps`). Re-check after `shadcn init`.

## Testing quirks (jsdom + Base UI)

- Slider thumbs are `visibility: hidden` until measured, so queries need `{ hidden: true }`.
- The toast close button is `aria-hidden` until the stack expands. Query it by `[data-slot=toast-close]`.
- jsdom polyfills (ResizeObserver, matchMedia, pointer capture…) live in `packages/ui/test/setup.ts`.

## Tooling

- ESLint 10: use `@eslint-react/eslint-plugin` and `eslint-plugin-jsx-a11y-x`. `eslint-plugin-react` and `eslint-plugin-jsx-a11y` do not support ESLint 10.
- Library tsconfig uses `moduleResolution: Bundler`, because packages are source-only (JIT).
- `apps/app` lint enforces hexagonal boundaries (`hexagonalBoundaries` in `@toth/eslint-config/next-js`).
