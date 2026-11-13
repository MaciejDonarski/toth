"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useWatch } from "react-hook-form"

import {
  Form,
  FormActions,
  FormItem,
  FormSection,
  type SubmitResult,
} from "@toth/form"
import { Alert, AlertDescription } from "@toth/ui/components/alert"

import {
  profileSchema,
  type ProfileInput,
} from "@/core/users/application/schemas"
import { WEEKDAYS, type Weekday } from "@/core/users/domain/profile"

export type ProfileFormProps = {
  defaultValues: ProfileInput
  onSave: (
    values: ProfileInput
  ) => Promise<(SubmitResult<ProfileInput> & { saved?: boolean }) | void>
}

/** One weekday: "works" checkbox, and from/to times enabled only if ticked. */
function WorkingDayRow({
  index,
  weekday,
}: {
  index: number
  weekday: Weekday
}) {
  const t = useTranslations("profile")
  const enabled = useWatch({ name: `days.${index}.enabled` }) === true
  const day = t(`weekdays.${weekday}`)

  return (
    <div
      className="grid grid-cols-[minmax(9rem,1fr)_minmax(6rem,8rem)_minmax(6rem,8rem)] items-start gap-3"
      data-testid={`day-${weekday}`}
      data-enabled={enabled}
    >
      <FormItem type="checkbox" name={`days.${index}.enabled`} label={day} />
      <FormItem
        type="time"
        name={`days.${index}.start`}
        label={t("fromFor", { day })}
        className="[&_[data-slot=field-label]]:sr-only"
        step={300}
        disabled={!enabled}
      />
      <FormItem
        type="time"
        name={`days.${index}.end`}
        label={t("toFor", { day })}
        className="[&_[data-slot=field-label]]:sr-only"
        step={300}
        disabled={!enabled}
      />
    </div>
  )
}

export function ProfileForm({ defaultValues, onSave }: ProfileFormProps) {
  const t = useTranslations("profile")
  const tCommon = useTranslations("common")
  const [saved, setSaved] = useState(false)

  return (
    <Form
      schema={profileSchema}
      defaultValues={defaultValues}
      onSubmit={async (values) => {
        setSaved(false)
        const result = await onSave(values)
        if (result?.saved) setSaved(true)
        return result
      }}
    >
      <FormSection title={t("detailsHeading")}>
        <FormItem
          type="text"
          name="name"
          label={tCommon("name")}
          autoComplete="name"
          required
          colSpan={{ base: 12, md: 6 }}
        />
        <FormItem
          type="tel"
          name="phone"
          label={t("phone")}
          placeholder={t("phonePlaceholder")}
          description={t("phoneDescription")}
          autoComplete="tel"
          colSpan={{ base: 12, md: 6 }}
        />
      </FormSection>

      <FormSection
        title={t("hoursHeading")}
        description={t("hoursDescription")}
      >
        <div className="col-span-12 flex flex-col gap-3">
          <div
            aria-hidden="true"
            className="grid grid-cols-[minmax(9rem,1fr)_minmax(6rem,8rem)_minmax(6rem,8rem)] gap-3 text-sm text-muted-foreground"
          >
            <span />
            <span>{t("from")}</span>
            <span>{t("to")}</span>
          </div>
          {WEEKDAYS.map((weekday, index) => (
            <WorkingDayRow key={weekday} index={index} weekday={weekday} />
          ))}
        </div>
      </FormSection>

      <div aria-live="polite">
        {saved && (
          <Alert>
            <AlertDescription>{t("saved")}</AlertDescription>
          </Alert>
        )}
      </div>
      <FormActions actions={[{ kind: "submit", label: t("save") }]} />
    </Form>
  )
}
