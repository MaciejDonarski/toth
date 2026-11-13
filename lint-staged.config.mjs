/**
 * Runs on `git commit` (via .husky/pre-commit).
 * ESLint is executed from each file's workspace so the right flat config applies.
 */
import path from "node:path"

const workspaces = [
  "apps/app",
  "packages/ui",
  "packages/utils",
  "packages/form",
  "packages/table",
]

function eslintByWorkspace(files) {
  const groups = new Map()
  for (const file of files) {
    const rel = path.relative(process.cwd(), file)
    const ws = workspaces.find((w) => rel.startsWith(`${w}/`))
    if (!ws) continue
    groups.set(ws, [...(groups.get(ws) ?? []), path.relative(ws, rel)])
  }
  return [...groups].map(
    ([ws, wsFiles]) =>
      `pnpm --dir ${ws} exec eslint --fix --max-warnings=0 --no-warn-ignored ${wsFiles.map((f) => JSON.stringify(f)).join(" ")}`
  )
}

export default {
  "*.{ts,tsx,js,mjs}": (files) => [
    ...eslintByWorkspace(files),
    `prettier --write ${files.map((f) => JSON.stringify(f)).join(" ")}`,
  ],
  "*.{json,md,css,yml,yaml}": "prettier --write",
}
