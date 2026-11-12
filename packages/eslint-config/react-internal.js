import { defineConfig } from "eslint/config"

import { config as baseConfig } from "./base.js"
import { reactRules } from "./react.js"

/**
 * ESLint config for internal React libraries (@toth/ui, form, table).
 */
export const config = defineConfig([baseConfig, reactRules])
