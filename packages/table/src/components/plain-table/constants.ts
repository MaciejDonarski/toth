/**
 * The localStorage key every PlainTable shares. Widths and aligns are nested under it by table
 * id (and user id), so one entry holds the state of every table in the application.
 *
 * Prefixed `snt-` like the package's classes, and deliberately NOT the old grid's
 * `sn-plain-table`: the two components can be on the same origin during a migration, and their
 * stored shapes are not the same.
 */
export const DEFAULT_STORAGE_KEY = "toth-plain-table"

/** Drag limits used by any column that does not set its own, in px. */
export const DEFAULT_MIN_WIDTH = 80
export const DEFAULT_MAX_WIDTH = 400
export const DEFAULT_COLUMN_WIDTH = 200

/** How far one arrow-key press moves a resize handle, in px. */
export const KEYBOARD_RESIZE_STEP = 16

/**
 * The widths, in px, at which a table steps up from `sm` to `md` and from `md` to `lg` — measured on
 * the table itself, not the window, and written out as `data-size` on its wrapper. Pinned columns
 * stick from `md` up: below 640px of table a pinned column leaves too little for the rest.
 */
export const PLAIN_TABLE_SIZE_STEPS = { md: 640, lg: 960 } as const

/** The size steps a table is measured into. */
export type PlainTableSize = "sm" | "md" | "lg"

/** How many skeleton rows stand in for the first page while it loads. */
export const DEFAULT_PLACEHOLDER_ROWS = 10
