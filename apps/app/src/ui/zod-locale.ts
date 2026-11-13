import { z } from "zod"

/**
 * Schemas return message KEYS (translated by the UI and server actions).
 * Checks without their own message fall back to a generic key per issue
 * code, e.g. `validation.generic.too_small`. Imported by the root layout
 * (server: RSC and server actions) and by AppFormDefaults (client bundle).
 */
z.config({
  customError: (issue) => `validation.generic.${issue.code}`,
})
