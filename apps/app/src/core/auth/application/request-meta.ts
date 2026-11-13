/** Where a request came from — for rate limiting and the audit log. */
export type RequestMeta = Readonly<{
  ip?: string
  userAgent?: string
}>
