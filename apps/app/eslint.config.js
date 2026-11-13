import { hexagonalBoundaries, nextJsConfig } from "@toth/eslint-config/next-js"
import { defineConfig } from "eslint/config"

export default defineConfig([nextJsConfig, hexagonalBoundaries])
