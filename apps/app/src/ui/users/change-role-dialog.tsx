"use client"

import { useTranslations } from "next-intl"
import { z } from "zod"

import { Form, FormActions, FormItem } from "@toth/form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@toth/ui/components/dialog"

import { ROLES, type Role } from "@/core/auth/domain/role"
import { roleSchema } from "@/core/users/application/schemas"
import type { RowActionResult } from "@/ui/data-table/row-actions"

const changeRoleSchema = z.object({ role: roleSchema })

export type ChangeRoleDialogProps = {
  /** The member being changed; `null` closes the dialog. */
  member: { name: string; role: Role } | null
  onClose: () => void
  onSubmit: (role: Role) => Promise<RowActionResult>
}

export function ChangeRoleDialog({
  member,
  onClose,
  onSubmit,
}: ChangeRoleDialogProps) {
  const t = useTranslations()
  const roleOptions = ROLES.map((role) => ({
    value: role,
    label: t(`roles.${role}`),
  }))

  return (
    <Dialog open={member !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {member && (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("users.changeRole.title", { name: member.name })}
              </DialogTitle>
              <DialogDescription>
                {t("users.changeRole.description")}
              </DialogDescription>
            </DialogHeader>
            <Form
              schema={changeRoleSchema}
              defaultValues={{ role: member.role }}
              className="flex flex-col gap-4"
              onSubmit={async ({ role }) => {
                if (role === member.role) {
                  onClose()
                  return
                }
                const result = await onSubmit(role)
                if (result.error) return { formError: result.error }
                onClose()
              }}
            >
              <FormItem
                type="select"
                name="role"
                label={t("users.changeRole.role")}
                options={roleOptions}
              />
              <FormActions
                actions={[
                  {
                    kind: "button",
                    label: t("common.cancel"),
                    variant: "outline",
                    onClick: onClose,
                  },
                  { kind: "submit", label: t("users.changeRole.submit") },
                ]}
              />
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
