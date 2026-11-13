import { getTranslations } from "next-intl/server"

import { requirePermission } from "@/auth/dal"
import { profile } from "@/composition-root"
import { toTenantContext } from "@/core/auth/application/validate-session"
import type { ProfileInput } from "@/core/users/application/schemas"
import {
  formatPhone,
  formatTime,
  WEEKDAYS,
  type WeeklySchedule,
} from "@/core/users/domain/profile"
import { translatedMetadata } from "@/i18n/metadata"
import { ChangePasswordForm } from "@/ui/profile/change-password-form"
import { ProfileForm } from "@/ui/profile/profile-form"

import { changePasswordAction, updateProfileAction } from "./actions"

export const generateMetadata = translatedMetadata("profile")

/** Ticking a day off pre-fills a typical shift. */
const DEFAULT_SHIFT = { start: 8 * 60, end: 16 * 60 }

function toFormDays(schedule: WeeklySchedule): ProfileInput["days"] {
  return WEEKDAYS.map((weekday) => {
    const range = schedule[weekday]
    return {
      weekday,
      enabled: !!range,
      start: formatTime((range ?? DEFAULT_SHIFT).start),
      end: formatTime((range ?? DEFAULT_SHIFT).end),
    }
  })
}

export default async function Page() {
  const user = await requirePermission("profile.edit-own")
  const own = await profile.get(toTenantContext(user))
  const t = await getTranslations()

  return (
    <div className="flex max-w-3xl flex-1 flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">
          {t("profile.title")}
        </h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{t("profile.email")}</dt>
          <dd>{own.email}</dd>
          <dt className="text-muted-foreground">{t("profile.role")}</dt>
          <dd>{t(`roles.${own.role}`)}</dd>
        </dl>
      </div>
      <ProfileForm
        defaultValues={{
          name: own.name ?? "",
          phone: own.phone ? formatPhone(own.phone) : "",
          days: toFormDays(own.schedule),
        }}
        onSave={updateProfileAction}
      />
      <ChangePasswordForm onChange={changePasswordAction} />
    </div>
  )
}
