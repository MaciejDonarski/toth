# toth

pnpm + Turborepo monorepo: React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), Vitest, Storybook 10.

## Workspaces

| Package                   | Path                         | What it is                                                                   |
| ------------------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `@toth/app`               | `apps/app`                   | Next.js 16 app (App Router) in hexagonal architecture                        |
| `@toth/ui`                | `packages/ui`                | All shadcn/ui components, styled with preset `bgmJ1SHMW` (style `base-vega`) |
| `@toth/utils`             | `packages/utils`             | Shared utilities (`cn`)                                                      |
| `@toth/form`              | `packages/form`              | Form tooling (react-hook-form + zod) on top of `@toth/ui`, empty for now     |
| `@toth/table`             | `packages/table`             | Data table on top of `@toth/ui` and `@toth/form`, empty for now              |
| `@toth/eslint-config`     | `packages/eslint-config`     | Shared ESLint flat configs                                                   |
| `@toth/typescript-config` | `packages/typescript-config` | Shared tsconfigs                                                             |

Packages are **source-only (JIT)**: they export `.ts`/`.tsx` directly, with no build step.
Next.js transpiles them via `transpilePackages`. Vite powers Vitest and Storybook.

## Commands

```bash
pnpm install
pnpm dev               # Next.js app on :3000
pnpm storybook         # ui :6006, form :6007, table :6008
pnpm test              # Vitest in every workspace
pnpm lint
pnpm typecheck
pnpm build             # Next.js production build
pnpm build-storybook
pnpm format            # Prettier (with tailwind class sorting)
```

Filter to one workspace with `pnpm --filter @toth/ui test`, and so on.

## Local stack (database + mail)

`compose.yaml` runs Postgres 17 (same major as Supabase) and [Mailpit](https://mailpit.axllent.org)
(catches all outgoing mail). Host ports are non-default so they do not clash with other stacks.

```bash
pnpm stack:up                                   # Postgres :5433, SMTP :1026, Mailpit UI http://localhost:8026
cp apps/app/.env.example apps/app/.env          # then fill AUTH_SECRET
pnpm --filter @toth/app db:migrate              # prisma migrate dev
pnpm --filter @toth/app db:studio               # Prisma Studio
pnpm stack:down                                 # stack:reset also drops the DB volume
```

Override ports with `TOTH_DB_PORT`, `TOTH_SMTP_PORT`, `TOTH_MAIL_UI_PORT`, and update `apps/app/.env` to match.

| Concern  | Local                           | Production                                                |
| -------- | ------------------------------- | --------------------------------------------------------- |
| Database | compose `db` (one URL)          | Supabase: `DATABASE_URL` = pooler :6543 `?pgbouncer=true` |
|          |                                 | `DIRECT_URL` = :5432 (Prisma CLI / migrations)            |
| Migrate  | `db:migrate`                    | `db:deploy` (`prisma migrate deploy`) in CI/build         |
| Mail     | `MAIL_TRANSPORT=smtp` → Mailpit | `MAIL_TRANSPORT=resend` + `RESEND_API_KEY`                |
| Hosting  | `pnpm dev`                      | Vercel (`postinstall` runs `prisma generate`)             |

A pre-commit hook (husky + lint-staged) runs `eslint --fix` and Prettier on staged files.

## Adding shadcn components

Run the CLI from the app, as in the shadcn monorepo docs:

```bash
cd apps/app
pnpm dlx shadcn@latest add <component>
```

Components land in `packages/ui/src/components`. After adding one:

1. Point the `cn` import at `@toth/ui/lib/utils` (the CLI writes `from "cn"`).
2. If the CLI puts hooks/lib files into `apps/app`, move them to `packages/ui/src/{hooks,lib}`.
3. Add `<name>.stories.tsx` and `<name>.test.tsx` next to the component.

Vendored shadcn files are kept as upstream ships them. The lint rules that upstream code
intentionally breaks are relaxed only for those files (see `packages/ui/eslint.config.js`).

## App architecture (`apps/app/src`)

```
core/<feature>/domain/            entities and value objects (pure TS)
core/<feature>/application/       use cases
core/<feature>/application/ports/ driven ports (interfaces)
infrastructure/<feature>/         driven adapters implementing the ports
composition-root.ts               wires ports to adapters (server-only)
app/                              Next.js routes = driving adapters
ui/                               app-level React components
```

ESLint enforces the boundaries. `core/` cannot import adapters, Next or React, and
`infrastructure/` cannot import driving adapters.
