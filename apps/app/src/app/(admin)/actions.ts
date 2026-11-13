"use server"

import { redirect } from "next/navigation"

// TODO: clear the session once authentication exists.
export async function logout() {
  redirect("/login")
}
