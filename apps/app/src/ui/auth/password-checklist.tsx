"use client"

import { CheckIcon, XIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useWatch } from "react-hook-form"

import { cn } from "@toth/ui/lib/utils"

import { PASSWORD_RULES } from "@/core/auth/domain/password-policy"

/**
 * Live list of password rules under a password field. Must be rendered inside
 * a `@toth/form` `<Form>`; reads the field named `name`.
 */
export function PasswordChecklist({ name = "password" }: { name?: string }) {
  const t = useTranslations("passwordRules")
  const value = useWatch({ name }) as string | undefined
  const password = value ?? ""
  // The max-length rule only matters once violated.
  const rules = PASSWORD_RULES.filter(
    (rule) => rule.id !== "maxLength" || !rule.test(password)
  )

  return (
    <ul
      aria-label={t("listLabel")}
      className="-mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs"
    >
      {rules.map((rule) => {
        const met = rule.test(password)
        const Icon = met ? CheckIcon : XIcon
        return (
          <li
            key={rule.id}
            data-met={met}
            className={cn(
              "flex items-center gap-1.5",
              met ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn("size-3.5", met && "text-green-600")}
            />
            <span>
              {t(rule.id, rule.params)}
              <span className="sr-only">{met ? t("met") : t("unmet")}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
