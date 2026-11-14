// A filter's `field` is a server field name, and the server is free to use dots for nested
// values — `address.city`. react-hook-form reads a dot in a field name as a path into the form
// state, so registering `address.city` would build `{ address: { city } }` and the filter's key
// would be lost on the way back out.
//
// Escaping the dot on the way in and restoring it on the way out keeps the form flat and the
// filtering object keyed by the field the server asked for. The escape sequence is spelled out
// rather than clever because it also has to survive being a DOM `id` and an `htmlFor`.

const DOT = /\./g
const ESCAPED = /-dot-/g

/** Server field name → react-hook-form field name. */
export function toFieldName(field: string): string {
  return field.replace(DOT, "-dot-")
}

/** react-hook-form field name → server field name. */
export function fromFieldName(name: string): string {
  return name.replace(ESCAPED, ".")
}
