import "server-only"

import NextAuth, { type DefaultSession, type NextAuthResult } from "next-auth"
import type {} from "next-auth/jwt"
import Credentials from "next-auth/providers/credentials"

import { redeemLoginGrant } from "@/composition-root"
import { AUTH_POLICY } from "@/core/auth/domain/auth-policy"

import { getRequestMeta } from "./request-meta"

declare module "next-auth" {
  interface User {
    /** Plain server-side session id (only its hash is stored). */
    sid?: string
  }
  interface Session {
    sid?: string
    user?: DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sid?: string
  }
}

/**
 * Auth.js in "hybrid" mode: the encrypted JWT carries nothing but the id of
 * a row in the `Session` table. Every request re-validates that row (see
 * `validateSession` in the DAL), so sign-out, idle timeout, disabling a user
 * or changing a password take effect immediately.
 *
 * The only provider redeems a single-use grant that our own login flow
 * (password + emailed code, or a trusted device) issues after verification.
 */
const nextAuth = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: AUTH_POLICY.sessionAbsoluteTtlMs / 1_000,
  },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      id: "login-grant",
      credentials: { grant: {} },
      async authorize(credentials) {
        const grant = credentials.grant
        if (typeof grant !== "string" || !grant) return null
        const result = await redeemLoginGrant(grant, await getRequestMeta())
        return result ? { id: result.userId, sid: result.sessionId } : null
      },
    }),
  ],
  callbacks: {
    // Keep the token minimal: no name, email, role or company in the cookie.
    jwt({ token, user }) {
      if (user?.sid) return { sub: user.id, sid: user.sid }
      return { sub: token.sub, sid: token.sid }
    },
    session({ session, token }) {
      return { expires: session.expires, sid: token.sid }
    },
  },
})

// Explicit types: the inferred ones reference pnpm-internal paths (TS2742).
export const handlers: NextAuthResult["handlers"] = nextAuth.handlers
export const auth: NextAuthResult["auth"] = nextAuth.auth
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut
