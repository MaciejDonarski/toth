import type { Metadata } from "next"

import { invitationAcceptance } from "@/composition-root"
import type { AcceptInvitationInput } from "@/core/users/application/schemas"
import { ROLE_LABELS } from "@/core/users/domain/membership"
import {
  AcceptInvitationForm,
  InvalidInvitation,
} from "@/ui/users/accept-invitation-form"

import { acceptInvitationAction } from "./actions"

export const metadata: Metadata = {
  title: "Zaproszenie",
  referrer: "no-referrer",
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token } = await searchParams
  const value = typeof token === "string" ? token : ""

  const invitation = await invitationAcceptance.find(value)
  if (!invitation) return <InvalidInvitation />

  async function accept(input: AcceptInvitationInput) {
    "use server"
    return acceptInvitationAction(value, input)
  }

  return (
    <AcceptInvitationForm
      companyName={invitation.companyName}
      email={invitation.email}
      roleLabel={ROLE_LABELS[invitation.role]}
      onAccept={accept}
    />
  )
}
