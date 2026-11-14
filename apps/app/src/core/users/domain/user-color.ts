/** Tailwind v4 `*-500` palette (chromatic hues). The key is what we store. */
export const USER_COLORS = {
  red: "#fb2c36",
  orange: "#ff6900",
  amber: "#fe9a00",
  yellow: "#f0b100",
  lime: "#7ccf00",
  green: "#00c950",
  emerald: "#00bc7d",
  teal: "#00bba7",
  cyan: "#00b8db",
  sky: "#00a6f4",
  blue: "#3080ff",
  indigo: "#615fff",
  violet: "#8e51ff",
  purple: "#ad46ff",
  fuchsia: "#e12afb",
  pink: "#f6339a",
  rose: "#ff2056",
} as const

export type UserColor = keyof typeof USER_COLORS

export const USER_COLOR_KEYS = Object.keys(USER_COLORS) as [
  UserColor,
  ...UserColor[],
]

export function isUserColor(value: unknown): value is UserColor {
  return typeof value === "string" && Object.hasOwn(USER_COLORS, value)
}

export function randomUserColor(random: () => number = Math.random): UserColor {
  return USER_COLOR_KEYS[Math.floor(random() * USER_COLOR_KEYS.length)]!
}

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  )
}

/** WCAG contrast ratio between two `#rrggbb` colors. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

/** Black or white, whichever reads better on `background`. */
export function contrastingForeground(
  background: string
): "#000000" | "#ffffff" {
  return contrastRatio(background, "#ffffff") >=
    contrastRatio(background, "#000000")
    ? "#ffffff"
    : "#000000"
}

/** Inline style for a user's avatar: background plus a readable text color. */
export function userColorStyle(color: string): {
  backgroundColor: string
  color: string
} {
  const background = isUserColor(color) ? USER_COLORS[color] : USER_COLORS.blue
  return {
    backgroundColor: background,
    color: contrastingForeground(background),
  }
}
