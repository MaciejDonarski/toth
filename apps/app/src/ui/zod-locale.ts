import { z } from "zod"

/**
 * Polish zod messages. Imported by the root layout (server: RSC and server
 * actions) and by AppFormDefaults (client bundle), so both sides validate in
 * Polish. Idempotent.
 */
z.config(z.locales.pl())
