import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BoxIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  ClipboardListIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FileDownIcon,
  FilterIcon,
  GripVerticalIcon,
  InboxIcon,
  InfoIcon,
  ListTodoIcon,
  MoreHorizontalIcon,
  MoveDownIcon,
  MoveUpIcon,
  PanelLeftDashedIcon,
  PanelRightDashedIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SearchXIcon,
  SlidersHorizontalIcon,
  StoreIcon,
  TrashIcon,
  XIcon,
  type LucideIcon,
  type LucideProps,
} from "lucide-react"

/**
 * The glyphs the table draws, by name — so a column, an action or a story can
 * say `icon: "trash"` without importing lucide. Any other lucide component can
 * be passed directly instead of a name.
 */
const iconRegistry = {
  "align-center": AlignCenterIcon,
  "align-left": AlignLeftIcon,
  "align-right": AlignRightIcon,
  "arrow-down": ArrowDownIcon,
  "arrow-right": ArrowRightIcon,
  "arrow-up": ArrowUpIcon,
  "arrow-up-down": ArrowUpDownIcon,
  box: BoxIcon,
  check: CheckIcon,
  "chevron-down": ChevronDownIcon,
  "chevron-left": ChevronLeftIcon,
  "chevron-right": ChevronRightIcon,
  "chevron-up": ChevronUpIcon,
  "chevrons-up-down": ChevronsUpDownIcon,
  "circle-alert": CircleAlertIcon,
  "clipboard-list": ClipboardListIcon,
  copy: CopyIcon,
  download: DownloadIcon,
  eye: EyeIcon,
  "eye-off": EyeOffIcon,
  "file-down": FileDownIcon,
  filter: FilterIcon,
  "grip-vertical": GripVerticalIcon,
  inbox: InboxIcon,
  info: InfoIcon,
  "list-todo": ListTodoIcon,
  "more-horizontal": MoreHorizontalIcon,
  "move-down": MoveDownIcon,
  "move-up": MoveUpIcon,
  "panel-left-dashed": PanelLeftDashedIcon,
  "panel-right-dashed": PanelRightDashedIcon,
  pencil: PencilIcon,
  pin: PinIcon,
  "pin-off": PinOffIcon,
  plus: PlusIcon,
  "refresh-cw": RefreshCwIcon,
  search: SearchIcon,
  "search-x": SearchXIcon,
  "sliders-horizontal": SlidersHorizontalIcon,
  store: StoreIcon,
  trash: TrashIcon,
  x: XIcon,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof iconRegistry

/** A registered name, or any lucide icon component. */
export type IconSource = IconName | LucideIcon

export type IconProps = LucideProps & { icon: IconSource }

function Icon({ icon, ...props }: IconProps) {
  const IconComponent = typeof icon === "string" ? iconRegistry[icon] : icon
  return <IconComponent data-slot="icon" aria-hidden="true" {...props} />
}

export { Icon, iconRegistry }
