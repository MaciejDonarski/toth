import { hexagonalBoundaries, nextJsConfig } from "@toth/eslint-config/next-js"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["src/generated/**"]),
  nextJsConfig,
  hexagonalBoundaries,
])
