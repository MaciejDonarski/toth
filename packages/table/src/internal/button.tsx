import type * as React from "react"

import { Button as UIButton } from "@toth/ui/components/button"
import { Spinner } from "@toth/ui/components/spinner"
import { cn } from "@toth/ui/lib/utils"

import { Icon, type IconSource } from "./icon"

type UIButtonProps = React.ComponentProps<typeof UIButton>

export type ButtonVariant = NonNullable<UIButtonProps["variant"]>
export type ButtonSize = NonNullable<UIButtonProps["size"]>

export type ButtonProps = UIButtonProps & {
  /** Leading glyph. */
  icon?: IconSource
  /** Trailing glyph. */
  rightIcon?: IconSource
  /**
   * Work is running: a spinner replaces the leading icon and the button is
   * disabled, keeping its size.
   */
  loading?: boolean
}

/** `@toth/ui` `Button` plus the icon/loading shorthands the table's parts use. */
function Button({
  icon,
  rightIcon,
  loading,
  disabled,
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <UIButton
      // Mirrored as attributes so a parent's stylesheet — and a test — can tell them apart.
      data-variant={variant}
      data-size={size}
      variant={variant}
      size={size}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading ? (
        <Spinner data-icon="inline-start" aria-hidden="true" role={undefined} />
      ) : (
        icon && <Icon icon={icon} data-icon="inline-start" />
      )}
      {children}
      {rightIcon && <Icon icon={rightIcon} data-icon="inline-end" />}
    </UIButton>
  )
}

export { Button }
