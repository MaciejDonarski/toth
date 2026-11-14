"use client"

import { useTranslations } from "next-intl"
import { useWatch } from "react-hook-form"

import {
  Form,
  FormActions,
  FormItem,
  FormSection,
  type SubmitResult,
} from "@toth/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@toth/ui/components/card"
import { toast } from "@toth/ui/components/toast"

import {
  profileSchema,
  type ProfileInput,
} from "@/core/users/application/schemas"
import { WEEKDAYS, type Weekday } from "@/core/users/domain/profile"
import { USER_COLORS, USER_COLOR_KEYS } from "@/core/users/domain/user-color"

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
      className="col-span-full grid grid-cols-2 items-center gap-x-3 gap-y-2 sm:grid-cols-subgrid"
      data-testid={`day-${weekday}`}
      data-enabled={enabled}
    >
      <FormItem
        type="checkbox"
        name={`days.${index}.enabled`}
        label={day}
        colSpan={{ base: 2, sm: 1 }}
      />
      <FormItem
        type="time"
        name={`days.${index}.start`}
        label={t("fromFor", { day })}
        className="sm:[&_[data-slot=field-label]]:sr-only"
        step={300}
        colSpan={{ base: 1 }}
        disabled={!enabled}
      />
      <FormItem
        type="time"
        name={`days.${index}.end`}
        label={t("toFor", { day })}
        className="sm:[&_[data-slot=field-label]]:sr-only"
        step={300}
        colSpan={{ base: 1 }}
        disabled={!enabled}
      />
    </div>
  )
}

export function ProfileForm({ defaultValues, onSave }: ProfileFormProps) {
  const t = useTranslations("profile")
  const tCommon = useTranslations("common")
  const colorOptions = USER_COLOR_KEYS.map((key) => ({
    value: key,
    label: t(`colors.${key}`),
    color: USER_COLORS[key],
  }))

  return (
    <Form
      schema={profileSchema}
      defaultValues={defaultValues}
      onSubmit={async (values) => {
        const result = await onSave(values)
        if (result?.saved) toast.add({ type: "success", title: t("saved") })
        return result
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{t("detailsHeading")}</CardTitle>
          <CardDescription>{t("detailsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          <FormSection>
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
            <FormItem
              type="color"
              name="color"
              label={t("color")}
              description={t("colorDescription")}
              options={colorOptions}
              colSpan={{ base: 12 }}
            />
          </FormSection>

          <FormSection
            title={t("hoursHeading")}
            description={t("hoursDescription")}
          >
            <div className="col-span-12 grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,10rem)_7rem_7rem]">
              <div
                aria-hidden="true"
                className="col-span-full hidden grid-cols-subgrid text-sm text-muted-foreground sm:grid"
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
        </CardContent>
        <CardFooter>
          <FormActions actions={[{ kind: "submit", label: t("save") }]} />
        </CardFooter>
      </Card>
    </Form>
  )
}
