import { describe, expect, it } from "vitest"
import type { z } from "zod"

import "@/ui/zod-locale"

import {
  forgotPasswordSchema,
  loginCodeSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/core/auth/application/schemas"
import { PASSWORD_RULES } from "@/core/auth/domain/password-policy"
import { ROLES } from "@/core/auth/domain/role"
import {
  acceptInvitationSchema,
  inviteUserSchema,
} from "@/core/users/application/schemas"
import type { MemberChangeError } from "@/core/users/domain/membership"
import { navGroups } from "@/ui/admin/nav-config"

import { LOCALES } from "./config"
import { MESSAGES } from "./messages"

const pl = MESSAGES.pl as unknown as Record<string, unknown>

function lookup(messages: Record<string, unknown>, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      messages
    )
}

function leaves(node: unknown, prefix = ""): [string, unknown][] {
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) =>
      leaves(v, prefix ? `${prefix}.${k}` : k)
    )
  }
  return [[prefix, node]]
}

function messagesOf(schema: z.ZodType, inputs: unknown[]): string[] {
  return inputs.flatMap((input) => {
    const result = schema.safeParse(input)
    return result.success ? [] : result.error.issues.map((i) => i.message)
  })
}

const BAD = [
  {},
  {
    email: "x",
    password: "weak",
    confirmPassword: "other",
    companyName: "",
    name: "",
    acceptTerms: false,
    code: "12",
    remember: "no",
    role: "OWNER",
  },
  { email: "", password: "", confirmPassword: "" },
  { email: `${"a".repeat(250)}@x.pl`, password: "x".repeat(200) },
  { password: "Zaq1@wsx", confirmPassword: "Zaq1@wsy" },
]

describe("message catalog", () => {
  it("has a translation for every message a schema can produce", () => {
    const keys = new Set(
      [
        registerSchema,
        loginSchema,
        loginCodeSchema,
        forgotPasswordSchema,
        resetPasswordSchema,
        inviteUserSchema,
        acceptInvitationSchema,
      ].flatMap((schema) => messagesOf(schema, BAD))
    )
    expect(keys.size).toBeGreaterThan(10)
    for (const key of keys) {
      expect(typeof lookup(pl, key), key).toBe("string")
    }
  })

  it("covers every generic zod issue code", () => {
    const codes = [
      "invalid_type",
      "too_small",
      "too_big",
      "invalid_format",
      "not_multiple_of",
      "unrecognized_keys",
      "invalid_union",
      "invalid_key",
      "invalid_element",
      "invalid_value",
      "custom",
    ]
    for (const code of codes) {
      expect(typeof lookup(pl, `validation.generic.${code}`), code).toBe(
        "string"
      )
    }
  })

  it("covers keys built at runtime", () => {
    const changeErrors: MemberChangeError[] = [
      "SELF_CHANGE",
      "LAST_ADMIN",
      "NOT_FOUND",
      "USER_LIMIT_REACHED",
    ]
    const keys = [
      ...ROLES.map((role) => `roles.${role}`),
      ...["ACTIVE", "DISABLED"].map((s) => `users.status.${s}`),
      ...changeErrors.map((e) => `users.errors.${e}`),
      "users.errors.EMAIL_TAKEN",
      ...PASSWORD_RULES.map((rule) => `passwordRules.${rule.id}`),
      ...navGroups.flatMap((group) => [
        `nav.groups.${group.key}`,
        ...group.items.map((item) => `nav.items.${item.key}`),
      ]),
    ]
    for (const key of keys) {
      expect(typeof lookup(pl, key), key).toBe("string")
    }
  })

  it("has no empty messages", () => {
    for (const [key, value] of leaves(pl)) {
      expect(typeof value === "string" && value.trim().length > 0, key).toBe(
        true
      )
    }
  })

  it("gives every locale the same keys as Polish", () => {
    const reference = leaves(pl)
      .map(([key]) => key)
      .sort()
    for (const locale of LOCALES) {
      const keys = leaves(MESSAGES[locale])
        .map(([key]) => key)
        .sort()
      expect(keys, locale).toEqual(reference)
    }
  })
})
