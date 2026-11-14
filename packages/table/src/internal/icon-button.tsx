import { Button, type ButtonProps, type ButtonSize } from "./button"
import { Icon, type IconSource } from "./icon"
import { nativeElementProps } from "./native-element-props"
import { Tooltip, type TooltipProps } from "./tooltip"

export type IconButtonSize = Extract<ButtonSize, `icon${string}`>

export type IconButtonProps = Omit<
  ButtonProps,
  "size" | "children" | "icon" | "rightIcon"
> &
  Pick<TooltipProps, "side" | "sideOffset" | "align" | "alignOffset"> & {
    icon: IconSource
    /** Accessible name and tooltip text — one string, so they cannot disagree. */
    label: string
    size?: IconButtonSize
  }

/** A square icon-only button whose label is both its name and its tooltip. */
function IconButton({
  icon,
  label,
  size = "icon",
  side,
  sideOffset,
  align,
  alignOffset,
  render,
  ...props
}: IconButtonProps) {
  const elementProps =
    typeof render === "function" ? undefined : nativeElementProps(render)

  return (
    <Tooltip
      trigger={
        <Button size={size} render={render} {...elementProps} {...props}>
          <Icon icon={icon} />
          <span className="sr-only">{label}</span>
        </Button>
      }
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
    >
      {label}
    </Tooltip>
  )
}

export { IconButton }
