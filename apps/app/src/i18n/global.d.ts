import type { AppLocale } from "./config"
import type { Messages } from "./messages"

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale
    /** Typed keys: `t("auth.login.title")` is checked against pl.json. */
    Messages: Messages
  }
}
