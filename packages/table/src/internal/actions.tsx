"use client"

import * as React from "react"

import { ButtonGroup } from "@toth/ui/components/button-group"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@toth/ui/components/dropdown-menu"
import { useIsMobile } from "./hooks/use-is-mobile"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@toth/ui/components/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@toth/ui/components/sheet"
import { Spinner } from "@toth/ui/components/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@toth/ui/components/tooltip"
import { cn } from "@toth/ui/lib/utils"

import { actionGroups, type ActionGroupEntry } from "./action-groups"
import { Button, type ButtonSize, type ButtonVariant } from "./button"
import { Icon, type IconSource } from "./icon"
import { nativeElementProps } from "./native-element-props"

// The actions of a row, a toolbar or a selection bar, taken as data: a three-dots menu, with the
// actions that deserve to be seen promoted out of it to buttons beside the trigger. A composition
// of `Button`, `ButtonGroup`, `DropdownMenu`, `Popover` and `Sheet` from `@toth/ui`.
//
// Which side an action lands on is decided in React rather than by a media query: hiding a menu
// row with `display: none` would leave it in the DOM, where arrow-key navigation could land on it.

/**
 * Where an action is drawn. `true` — always a button beside the trigger. `'desktop'` — a button
 * from `md` up, a menu row below it. Omitted — the menu.
 */
export type ActionStandalone = boolean | "desktop"

/** What a panel action opens; a function receives the panel's own `close`. */
export type ActionPanelContent =
  React.ReactNode | ((ctx: { close: () => void }) => React.ReactNode)

type PopoverContentProps = React.ComponentProps<typeof PopoverContent>

export type ActionPanelProps = Pick<
  PopoverContentProps,
  "align" | "alignOffset" | "side" | "sideOffset" | "className"
>

export interface ActionSheetProps {
  side?: "top" | "right" | "bottom" | "left"
  /** Falls back to the action's label, so the sheet always has an accessible name. */
  title?: React.ReactNode
  description?: React.ReactNode
  className?: string
}

export interface ActionBase {
  label: React.ReactNode
  /** Identity for React. Falls back to the label when it is a string, and to the index otherwise. */
  key?: React.Key
  icon?: IconSource
  /** Any `Button` variant on a standalone action; a menu row only knows `destructive`. */
  variant?: ButtonVariant
  /** Standalone actions only. An `icon*` size draws the icon alone and names the button with the label. */
  size?: ButtonSize
  disabled?: boolean
  /** Work started by this action is still running; implies `disabled`. */
  loading?: boolean
  /** Dropped entirely, so a caller can branch without rebuilding the array. */
  hidden?: boolean
  standalone?: ActionStandalone
  className?: string
  /** On an icon-only standalone action, its tooltip text. Anywhere else, the native `title`. */
  title?: string
}

/** Somewhere to go, or something to run. */
export type ActionCommand = ActionBase & {
  href?: string
  onClick?: React.MouseEventHandler<HTMLElement>
  /** The element the action renders as — an app's own router link. Wins over `href`. */
  render?: React.ReactElement
  panel?: never
  panelProps?: never
  asSheetOnMobile?: never
  sheetProps?: never
  menuItems?: never
}

/**
 * A surface to open — a filter form, a column list. Standalone by default: a popover anchored to
 * a menu row would anchor to an element that unmounts the moment the row is chosen.
 */
export type ActionPanelAction = ActionBase & {
  panel: ActionPanelContent
  panelProps?: ActionPanelProps
  /** Below `md`, open as an edge sheet — and allow the action into the menu there. */
  asSheetOnMobile?: boolean
  sheetProps?: ActionSheetProps
  href?: never
  onClick?: never
  render?: never
  menuItems?: never
}

export interface ActionMenuItem {
  key?: React.Key
  label: React.ReactNode
  icon?: IconSource
  onClick?: () => void
  disabled?: boolean
  /** A checkable row: the current choice among a list. */
  checked?: boolean
  variant?: "default" | "destructive"
}

/** A trigger that opens a short dropdown of choices (an export scope, a refresh interval). */
export type ActionMenuAction = ActionBase & {
  menuItems: ActionMenuItem[]
  /** Splits the trigger: this runs on the main button, a trailing chevron opens the menu. */
  onClick?: React.MouseEventHandler<HTMLElement>
  href?: never
  render?: never
  panel?: never
  panelProps?: never
  asSheetOnMobile?: never
  sheetProps?: never
}

export type Action = ActionCommand | ActionPanelAction | ActionMenuAction

export type ActionsEntry = ActionGroupEntry<Action>

export type ActionsProps = Omit<React.ComponentProps<"div">, "children"> & {
  actions: ActionsEntry[]
  /** Weld the row into one segmented control (`ButtonGroup`). `false` spaces the buttons apart. */
  asGroup?: boolean
  /** Trigger first, buttons after it in reverse order. */
  reverse?: boolean
  /** Replaces the three-dots button. */
  trigger?: React.ComponentProps<typeof DropdownMenuTrigger>["render"]
  /** Accessible name of the default trigger. */
  triggerLabel: string
  /** A tooltip on the trigger. Off unless given. */
  triggerTooltip?: string
  /** Defaults every standalone button, and the default trigger. */
  variant?: ButtonVariant
  /** Standalone actions only — the trigger stays icon-sized. */
  size?: ButtonSize
}

function isPanelAction(action: Action): action is ActionPanelAction {
  return action.panel !== undefined
}

function isMenuAction(action: Action): action is ActionMenuAction {
  return action.menuItems !== undefined
}

function resolvePanel(panel: ActionPanelContent, close: () => void) {
  return typeof panel === "function" ? panel({ close }) : panel
}

function actionRender(action: Action) {
  if (isPanelAction(action) || isMenuAction(action)) return undefined
  if (action.render) return action.render
  // The element a `Button` renders AS: the label arrives as its children.
  // eslint-disable-next-line jsx-a11y-x/anchor-has-content
  return action.href ? <a href={action.href} /> : undefined
}

function actionKey(action: Action, index: number): React.Key {
  if (action.key !== undefined) return action.key
  return typeof action.label === "string" || typeof action.label === "number"
    ? action.label
    : index
}

function isIconOnly(action: ActionBase, size: ButtonSize) {
  return (
    size.startsWith("icon") &&
    action.icon !== undefined &&
    typeof action.label === "string"
  )
}

function iconTooltip(action: ActionBase, size: ButtonSize) {
  return isIconOnly(action, size)
    ? (action.title ?? (action.label as string))
    : undefined
}

function withTooltip(trigger: React.ReactElement, content?: string) {
  if (content === undefined) return trigger
  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Whether a `standalone` value draws a button at this viewport. The one place `'desktop'` is
 * read, shared with the table's actions column, which sizes itself from the promoted actions.
 */
function resolveActionStandalone(
  standalone: ActionStandalone | undefined,
  isMobile: boolean
): boolean {
  if (standalone === "desktop") return !isMobile
  return standalone === true
}

function isStandalone(action: Action, isMobile: boolean) {
  // A menu action is a button unless demoted; a split one runs a command and never demotes.
  if (isMenuAction(action)) {
    if (action.onClick) return true
    return (
      action.standalone === undefined ||
      resolveActionStandalone(action.standalone, isMobile)
    )
  }
  // A panel is a button unless it can become a sheet and the caller demotes it.
  if (isPanelAction(action)) {
    if (!action.asSheetOnMobile) return true
    return (
      action.standalone === undefined ||
      resolveActionStandalone(action.standalone, isMobile)
    )
  }
  return resolveActionStandalone(action.standalone, isMobile)
}

function chevronTriggerButton(
  action: ActionBase,
  size: ButtonSize,
  variant: ButtonVariant
) {
  const iconOnly = isIconOnly(action, size)
  return (
    <Button
      variant={action.variant ?? variant}
      size={size}
      icon={action.icon}
      rightIcon={iconOnly ? undefined : "chevron-down"}
      loading={action.loading}
      disabled={action.disabled}
      title={iconOnly ? undefined : action.title}
      className={action.className}
      aria-label={iconOnly ? (action.label as string) : undefined}
    >
      {iconOnly ? null : action.label}
    </Button>
  )
}

function ActionSheetBody({
  action,
  close,
}: {
  action: ActionPanelAction
  close: () => void
}) {
  const { title, description } = action.sheetProps ?? {}
  return (
    <>
      <SheetHeader>
        <SheetTitle>{title ?? action.label}</SheetTitle>
        {description && <SheetDescription>{description}</SheetDescription>}
      </SheetHeader>
      <div
        data-slot="actions-sheet-body"
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
      >
        {resolvePanel(action.panel, close)}
      </div>
    </>
  )
}

function ActionPanelButton({
  action,
  size,
  variant,
}: {
  action: ActionPanelAction
  size: ButtonSize
  variant: ButtonVariant
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)
  const close = React.useCallback(() => setOpen(false), [])
  const tooltip = iconTooltip(action, size)

  if (action.asSheetOnMobile && isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        {withTooltip(
          <SheetTrigger render={chevronTriggerButton(action, size, variant)} />,
          tooltip
        )}
        <SheetContent
          side={action.sheetProps?.side ?? "right"}
          className={action.sheetProps?.className}
        >
          <ActionSheetBody action={action} close={close} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {withTooltip(
        <PopoverTrigger render={chevronTriggerButton(action, size, variant)} />,
        tooltip
      )}
      <PopoverContent align="end" {...action.panelProps}>
        {resolvePanel(action.panel, close)}
      </PopoverContent>
    </Popover>
  )
}

function iconSizeFor(size: ButtonSize): ButtonSize {
  switch (size) {
    case "default":
      return "icon"
    case "xs":
      return "icon-xs"
    case "sm":
      return "icon-sm"
    case "lg":
      return "icon-lg"
    default:
      return size
  }
}

function ActionMenuItemRow({ item }: { item: ActionMenuItem }) {
  if (item.checked !== undefined) {
    return (
      <DropdownMenuCheckboxItem
        checked={item.checked}
        disabled={item.disabled}
        onCheckedChange={() => item.onClick?.()}
      >
        {item.label}
      </DropdownMenuCheckboxItem>
    )
  }
  return (
    <DropdownMenuItem
      variant={item.variant === "destructive" ? "destructive" : undefined}
      disabled={item.disabled}
      onClick={item.onClick}
    >
      {item.icon && <Icon icon={item.icon} />}
      {item.label}
    </DropdownMenuItem>
  )
}

function ActionMenuButton({
  action,
  size,
  variant,
}: {
  action: ActionMenuAction
  size: ButtonSize
  variant: ButtonVariant
}) {
  const label = typeof action.label === "string" ? action.label : undefined
  const menu = (
    <DropdownMenu>
      {action.onClick ? (
        <DropdownMenuTrigger
          render={
            <Button
              variant={action.variant ?? variant}
              size={iconSizeFor(size)}
              icon="chevron-down"
              disabled={action.disabled}
              aria-label={label}
            />
          }
        />
      ) : (
        withTooltip(
          <DropdownMenuTrigger
            render={chevronTriggerButton(action, size, variant)}
          />,
          iconTooltip(action, size)
        )
      )}
      <DropdownMenuContent align="end">
        {action.menuItems.map((item, index) => (
          // A menu is a fixed list that is never reordered, so position is a stable fallback.
          // eslint-disable-next-line @eslint-react/no-array-index-key
          <ActionMenuItemRow key={item.key ?? index} item={item} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (!action.onClick) return menu

  const iconOnly = isIconOnly(action, size)
  return (
    <ButtonGroup>
      {withTooltip(
        <Button
          variant={action.variant ?? variant}
          size={size}
          icon={action.icon}
          loading={action.loading}
          disabled={action.disabled}
          title={iconOnly ? undefined : action.title}
          aria-label={iconOnly ? (action.label as string) : undefined}
          onClick={action.onClick}
        >
          {iconOnly ? null : action.label}
        </Button>,
        iconTooltip(action, size)
      )}
      {menu}
    </ButtonGroup>
  )
}

/**
 * The one sheet a menu's panel rows share: a row unmounts with the menu the moment it is chosen,
 * so the sheet lives on `Actions` itself and the rows only ask it to open.
 */
const ActionsSheetHostContext = React.createContext<
  ((action: ActionPanelAction) => void) | null
>(null)

function ActionsSheetHost({ children }: { children: React.ReactNode }) {
  // Two pieces of state: clearing the action on close would unmount the sheet mid-animation.
  const [action, setAction] = React.useState<ActionPanelAction | null>(null)
  const [open, setOpen] = React.useState(false)
  const close = React.useCallback(() => setOpen(false), [])
  const openPanel = React.useCallback((next: ActionPanelAction) => {
    setAction(next)
    setOpen(true)
  }, [])

  return (
    <ActionsSheetHostContext value={openPanel}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        {action && (
          <SheetContent
            side={action.sheetProps?.side ?? "right"}
            className={action.sheetProps?.className}
          >
            <ActionSheetBody action={action} close={close} />
          </SheetContent>
        )}
      </Sheet>
    </ActionsSheetHostContext>
  )
}

function ActionMenuRow({ action }: { action: Action }) {
  const openSheet = React.use(ActionsSheetHostContext)

  if (isMenuAction(action)) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={action.disabled}>
          {action.icon && <Icon icon={action.icon} />}
          {action.label}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {action.menuItems.map((item, index) => (
            // See `ActionMenuButton`: a fixed list, position is a stable fallback.
            // eslint-disable-next-line @eslint-react/no-array-index-key
            <ActionMenuItemRow key={item.key ?? index} item={item} />
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  }

  const onClick = isPanelAction(action)
    ? () => openSheet?.(action)
    : (action.onClick as React.MouseEventHandler<HTMLElement> | undefined)
  const render = actionRender(action)

  return (
    <DropdownMenuItem
      variant={action.variant === "destructive" ? "destructive" : undefined}
      disabled={action.disabled || action.loading}
      aria-busy={action.loading || undefined}
      title={action.title}
      className={action.className}
      onClick={onClick}
      render={render}
    >
      {action.loading ? (
        <Spinner aria-hidden="true" role={undefined} />
      ) : (
        action.icon && <Icon icon={action.icon} />
      )}
      {action.label}
    </DropdownMenuItem>
  )
}

function Actions({
  actions,
  asGroup = true,
  reverse,
  trigger,
  triggerLabel,
  triggerTooltip,
  variant = "outline",
  size = "sm",
  className,
  ...props
}: ActionsProps) {
  const isMobile = useIsMobile()

  // Promoted actions leave their group, so a group emptied by promotion leaves no separator.
  const standalone: Action[] = []
  const menuGroups: Action[][] = []

  for (const group of actionGroups<Action>(actions)) {
    const rows: Action[] = []
    for (const action of group) {
      if (action.hidden) continue
      if (isStandalone(action, isMobile)) standalone.push(action)
      else rows.push(action)
    }
    if (rows.length > 0) menuGroups.push(rows)
  }

  if (standalone.length === 0 && menuGroups.length === 0) return null

  const buttons = standalone.map((action, index) => {
    const buttonSize = action.size ?? size
    const key = actionKey(action, index)

    if (isMenuAction(action)) {
      return (
        <ActionMenuButton
          key={key}
          action={action}
          size={buttonSize}
          variant={variant}
        />
      )
    }
    if (isPanelAction(action)) {
      return (
        <ActionPanelButton
          key={key}
          action={action}
          size={buttonSize}
          variant={variant}
        />
      )
    }

    const element = actionRender(action)
    const iconOnly = isIconOnly(action, buttonSize)
    return (
      <React.Fragment key={key}>
        {withTooltip(
          <Button
            variant={action.variant ?? variant}
            size={buttonSize}
            icon={action.icon}
            loading={action.loading}
            disabled={action.disabled}
            title={iconOnly ? undefined : action.title}
            className={action.className}
            aria-label={iconOnly ? (action.label as string) : undefined}
            onClick={action.onClick}
            render={element}
            {...nativeElementProps(element)}
          >
            {iconOnly ? null : action.label}
          </Button>,
          iconTooltip(action, buttonSize)
        )}
      </React.Fragment>
    )
  })

  if (reverse) buttons.reverse()

  // Nothing left to open: a trigger that opens an empty menu is a broken promise.
  const menu = menuGroups.length > 0 && (
    <DropdownMenu key="trigger">
      {withTooltip(
        <DropdownMenuTrigger
          render={
            trigger ?? (
              <Button
                variant={variant}
                size="icon-sm"
                icon="more-horizontal"
                aria-label={triggerLabel}
              />
            )
          }
        />,
        triggerTooltip
      )}
      <DropdownMenuContent align={reverse ? "start" : "end"}>
        {menuGroups.map((group, index) => (
          <React.Fragment key={actionKey(group[0]!, index)}>
            {index > 0 && <DropdownMenuSeparator />}
            {group.map((action, rowIndex) => (
              <ActionMenuRow
                key={actionKey(action, rowIndex)}
                action={action}
              />
            ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const row = reverse ? (
    <>
      {menu}
      {buttons}
    </>
  ) : (
    <>
      {buttons}
      {menu}
    </>
  )

  const content = asGroup ? (
    <ButtonGroup className={className} {...props}>
      {row}
    </ButtonGroup>
  ) : (
    <div
      data-slot="actions"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    >
      {row}
    </div>
  )

  const needsSheetHost = menuGroups.some((group) => group.some(isPanelAction))
  return needsSheetHost ? (
    <ActionsSheetHost>{content}</ActionsSheetHost>
  ) : (
    content
  )
}

export { Actions, resolveActionStandalone }
