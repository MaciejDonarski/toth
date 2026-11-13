// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

/**
 * Guard: user-facing text belongs in src/i18n/messages, the code only holds
 * message keys. Flags, outside tests and generated code:
 *  - Polish letters anywhere (they only belong in the message catalog),
 *  - text written directly as JSX children,
 *  - literal strings in user-facing props (label, title, placeholder, …).
 * Heuristic by design: if a match is legitimately not UI text, rewrite the
 * code rather than weakening the rules.
 */
const SRC = fileURLToPath(new URL("..", import.meta.url))
const SKIP = [/\.test\.tsx?$/, /^generated\//, /^i18n\/messages\//]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

const POLISH = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/
/** `<h1>Users</h1>`, `<span>Log out</span>`: letters right before a closing tag. */
const JSX_TEXT = />\s*[A-Za-z][A-Za-z ,.!?:;'-]*<\//
/** A line that is nothing but words, as prettier lays out long JSX text. */
const JSX_TEXT_LINE = /^[A-Z][a-z]+(?: [a-zA-Z]+)+[.!?]?$/
const UI_PROP =
  /\b(?:label|title|placeholder|description|aria-label|alt|tooltip)=\s*"[^"]*[A-Za-z][^"]*"/
const UI_KEY = /\b(?:label|title|placeholder|description):\s*"[^"]*[A-Za-z]/

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
}

describe("no hard-coded UI text", () => {
  const files = sourceFiles(SRC)
    .map((path) => [relative(SRC, path), path] as const)
    .filter(([name]) => !SKIP.some((pattern) => pattern.test(name)))

  it("scans the app sources", () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it.each(files)("%s", (name, path) => {
    const lines = stripComments(readFileSync(path, "utf8")).split("\n")
    const isTsx = name.endsWith(".tsx")
    const offenders = lines
      .map((line, index) => ({ line: line.trim(), number: index + 1 }))
      .filter(({ line }) => {
        if (POLISH.test(line)) return true
        if (!isTsx) return UI_KEY.test(line)
        return (
          JSX_TEXT.test(line) ||
          JSX_TEXT_LINE.test(line) ||
          UI_PROP.test(line) ||
          UI_KEY.test(line)
        )
      })
      .map(({ line, number }) => `${number}: ${line}`)

    expect(offenders).toEqual([])
  })
})
