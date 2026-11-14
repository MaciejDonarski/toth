import { createElement, Fragment, type ReactNode } from "react"

/** Joins nodes without keys — what a sentence with a bold number in it needs. */
const join = (...parts: ReactNode[]): ReactNode =>
  createElement(Fragment, null, ...parts)

/** Every user-facing string rendered by @toth/table. Texts with a value in them are functions. */
export interface TableMessages {
  /** Empty, filtered-empty, error and loading states of the table body. */
  body: {
    empty: string
    filteredEmpty: string
    filteredEmptyDescription: string
    errorTitle: string
    error: string
    clearFilters: string
    /** Added under an error when the table can retry: the filters survive a retry. */
    filtersKept: string
    retry: string
    loading: string
  }
  /** Column header controls. */
  column: {
    options: (column: string) => string
    resize: (column: string) => string
    align: string
    alignColumn: (column: string, current: string) => string
    alignLeft: string
    alignCenter: string
    alignRight: string
    sortAscending: string
    sortDescending: string
    pinLeft: string
    unpin: string
    hide: string
  }
  /** The sort button in a header. */
  sort: {
    ascending: string
    descending: string
    none: string
    /** The sort button's name: what clicking does and where the column stands. */
    label: (column: string, state: string) => string
  }
  /** Row checkboxes, the header checkbox and its menu. */
  selection: {
    selectRow: (row: string) => string
    /** A row's name when the table gives none (`getRowLabel`): its id. */
    row: (id: string) => string
    selectPage: string
    clearPage: string
    options: string
    selected: (count: number) => string
    selectedOf: (selected: number, total: number) => string
    nothingSelected: string
    selectAll: string
    selectAllCount: (count: number) => string
    selectCurrentPage: string
    deselectCurrentPage: string
    deselectAll: string
  }
  /** The bar shown while rows are selected. */
  bulk: {
    label: string
    selected: (count: number) => string
    selectAllMatching: (count: number) => string
    selectAll: string
    moreActions: string
    /** The visible link that clears the selection. */
    clearLink: string
    /** The close button's accessible name. */
    clear: string
  }
  /** Confirmation dialogs of actions with `confirm`. */
  confirm: {
    title: string
    confirm: string
    delete: string
    cancel: string
  }
  /** Row actions. */
  rowActions: {
    column: string
    trigger: string
  }
  /** The toolbar above the table. */
  toolbar: {
    options: string
    actions: string
    moreActions: string
    moreActionsTooltip: string
  }
  /** The search box. */
  search: {
    placeholder: string
    label: string
    clear: string
    submit: string
    whatIsSearched: string
    searchedFields: (fields: string) => string
  }
  /** The filter panel and its sheet. */
  filters: {
    trigger: string
    title: string
    close: string
    apply: string
    reset: string
    appliedAsYouEdit: string
    applyToSee: string
    /** How many filters are in force, on the Filters button and the sheet's subtitle. */
    activeCount: (count: number) => string
    resetFilters: string
    done: string
    updating: string
    showResults: (count: number, items?: string) => string
  }
  /** The chips row under the toolbar. */
  activeFilters: {
    lead: string
    search: string
    clearAll: string
    remove: (filter: string) => string
    removeValue: (filter: string, value: string) => string
    from: (value: string) => string
    to: (value: string) => string
    range: (from: string, to: string) => string
  }
  /** The columns panel (visibility, order, pinning). */
  columns: {
    trigger: string
    title: string
    pinnedLeft: string
    pinnedRight: string
    reorder: (column: string) => string
    reorderTooltip: string
    show: (column: string) => string
    hide: (column: string) => string
    pinLeft: (column: string) => string
    pinRight: (column: string) => string
    unpin: (column: string) => string
    dragInstructions: string
    pickedUp: (column: string, position: string) => string
    movedOver: (column: string, position: string) => string
    dropped: (column: string, position: string) => string
    outside: (column: string) => string
    droppedBack: (column: string) => string
    cancelled: (column: string, position: string) => string
    position: (index: number, total: number) => string
  }
  /** The view options panel. */
  view: {
    trigger: string
    title: string
    density: string
    comfortable: string
    compact: string
    dividers: string
    dividersHint: string
    columns: string
    shown: (shown: number, total: number) => string
    pinnedLeft: string
    pinnedRight: string
    moveUp: (column: string) => string
    moveDown: (column: string) => string
    reset: string
    autoRefresh: string
    off: string
  }
  /** Pagination and the footer. */
  pagination: {
    label: string
    previous: string
    next: string
    /** Visible text of the two arrow buttons. */
    previousLabel: string
    nextLabel: string
    goToPage: (page: number) => string
    morePages: string
    rowsPerPage: string
    /** The visible label beside the page-size select. */
    rows: string
    /** What the rows are called when the table does not say (`itemsLabel`). */
    items: (count: number) => string
    /** "**1–25** of **67** orders" — the numbers arrive already emphasised. */
    summary: (range: ReactNode, total: ReactNode, items: string) => ReactNode
    /** "**3** selected", after the summary. */
    selected: (count: ReactNode) => ReactNode
  }
  /** The side panel the filters and the quick view open in. */
  sheet: {
    /** Native tooltip of the close button. */
    closeHint: string
  }
  /** The quick-view sheet. */
  preview: {
    trigger: string
    title: string
    close: string
    previous: string
    next: string
    /** Visible text of the phone's stepping buttons. */
    previousLabel: string
    nextLabel: string
    /** Where the row in view stands among the rows on the page. */
    position: (index: number, count: number) => string
  }
  /** Refresh and auto-refresh. */
  refresh: {
    label: string
    refreshing: string
    /** Tooltip part: when the rows were fetched. */
    updated: (time: string) => string
    /** Tooltip part: how often they refetch. */
    autoEvery: (interval: string) => string
    /** Footer: "updated 14:32:05", the time already marked up. */
    footerUpdated: (time: ReactNode) => ReactNode
    /** Footer: " (auto 15 s)". */
    footerAuto: (interval: string) => string
    minutes: (count: number) => string
    seconds: (count: number) => string
  }
  /** Export. */
  export: {
    trigger: string
    all: string
    allRowsVisibleColumns: string
    currentPage: string
  }
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

/** `TableMessages` where every key (nested ones too) is optional. */
export type TableMessagesInput = DeepPartial<TableMessages>

const enPlural = (count: number, one: string, other: string) =>
  count === 1 ? one : other

export const enMessages: TableMessages = {
  body: {
    empty: "No data yet",
    filteredEmpty: "No results match these filters",
    filteredEmptyDescription: "Try a wider range, or remove a filter.",
    errorTitle: "Couldn’t load the data",
    error: "Something went wrong.",
    clearFilters: "Clear filters",
    filtersKept: "Your filters are kept.",
    retry: "Try again",
    loading: "Loading",
  },
  column: {
    options: (column) => `Options for the ${column} column`,
    resize: (column) => `Resize the ${column} column`,
    align: "Align",
    alignColumn: (column, current) =>
      `Align the ${column} column, currently ${current}`,
    alignLeft: "Left",
    alignCenter: "Center",
    alignRight: "Right",
    sortAscending: "Sort ascending",
    sortDescending: "Sort descending",
    pinLeft: "Pin to left edge",
    unpin: "Unpin",
    hide: "Hide column",
  },
  sort: {
    ascending: "sorted ascending",
    descending: "sorted descending",
    none: "not sorted",
    label: (column, state) => `${column}, ${state}. Activate to sort.`,
  },
  selection: {
    selectRow: (row) => `Select ${row}`,
    row: (id) => `row ${id}`,
    selectPage: "Select all rows on this page",
    clearPage: "Clear all rows on this page",
    options: "Selection options",
    selected: (count) => `${count} selected`,
    selectedOf: (selected, total) => `${selected} of ${total} selected`,
    nothingSelected: "Nothing selected",
    selectAll: "Select all",
    selectAllCount: (count) => `Select all ${count}`,
    selectCurrentPage: "Select current page",
    deselectCurrentPage: "Deselect current page",
    deselectAll: "Deselect all",
  },
  bulk: {
    label: "Selection",
    selected: (count) => `${count} selected`,
    selectAllMatching: (count) => `Select all ${count} matching`,
    selectAll: "Select all",
    moreActions: "More selection actions",
    clearLink: "Clear",
    clear: "Clear selection",
  },
  confirm: {
    title: "Are you sure?",
    confirm: "Confirm",
    delete: "Delete",
    cancel: "Cancel",
  },
  rowActions: {
    column: "Actions",
    trigger: "Row actions",
  },
  toolbar: {
    options: "Table options",
    actions: "Table actions",
    moreActions: "More table actions",
    moreActionsTooltip: "More actions",
  },
  search: {
    placeholder: "Search",
    label: "Search",
    clear: "Clear search",
    submit: "Search",
    whatIsSearched: "What is searched",
    searchedFields: (fields) => `Searches: ${fields}`,
  },
  filters: {
    trigger: "Filters",
    title: "Filters",
    close: "Close filters",
    apply: "Apply",
    reset: "Reset all",
    appliedAsYouEdit: "Applied as you edit",
    applyToSee: "Apply to see the results",
    activeCount: (count) => `${count} active`,
    resetFilters: "Reset filters",
    done: "Done",
    updating: "Updating…",
    showResults: (count, items) =>
      `Show ${count} ${items ?? enPlural(count, "entry", "entries")}`,
  },
  activeFilters: {
    lead: "Filtered by",
    search: "Search",
    clearAll: "Clear all",
    remove: (filter) => `Remove filter ${filter}`,
    removeValue: (filter, value) => `Remove filter ${filter} ${value}`,
    from: (value) => `from ${value}`,
    to: (value) => `up to ${value}`,
    range: (from, to) => `${from} – ${to}`,
  },
  columns: {
    trigger: "Columns",
    title: "Columns",
    pinnedLeft: "Pinned left",
    pinnedRight: "Pinned right",
    reorder: (column) => `Reorder ${column}`,
    reorderTooltip: "Reorder column",
    show: (column) => `Show column ${column}`,
    hide: (column) => `Hide column ${column}`,
    pinLeft: (column) => `Pin ${column} left`,
    pinRight: (column) => `Pin ${column} right`,
    unpin: (column) => `Unpin ${column}`,
    dragInstructions:
      "To move a column, press Space or Enter. Use the up and down arrow keys to change its " +
      "position, Space or Enter to drop it there, or Escape to cancel.",
    pickedUp: (column, position) => `Picked up ${column}, ${position}.`,
    movedOver: (column, position) => `${column} moved to ${position}.`,
    dropped: (column, position) => `${column} dropped at ${position}.`,
    outside: (column) => `${column} is outside the list.`,
    droppedBack: (column) => `${column} dropped back where it was.`,
    cancelled: (column, position) =>
      `Moving ${column} cancelled. It is back at ${position}.`,
    position: (index, total) => `position ${index} of ${total}`,
  },
  view: {
    trigger: "View options",
    title: "View options",
    density: "Density",
    comfortable: "Comfortable",
    compact: "Compact",
    dividers: "Column dividers",
    dividersHint: "Vertical lines between cells",
    columns: "Columns",
    shown: (shown, total) => `· ${shown} of ${total} shown`,
    pinnedLeft: "· pinned left",
    pinnedRight: "· pinned right",
    moveUp: (column) => `Move ${column} up`,
    moveDown: (column) => `Move ${column} down`,
    reset: "Reset to default view",
    autoRefresh: "Auto-refresh",
    off: "Off",
  },
  pagination: {
    label: "Pagination",
    previous: "Go to previous page",
    next: "Go to next page",
    previousLabel: "Previous",
    nextLabel: "Next",
    goToPage: (page) => `Go to page ${page}`,
    morePages: "More pages",
    rowsPerPage: "Rows per page",
    rows: "Rows",
    items: (count) => enPlural(count, "entry", "entries"),
    summary: (range, total, items) => join(range, " of ", total, " ", items),
    selected: (count) => join(count, " selected"),
  },
  sheet: {
    closeHint: "Close (Esc)",
  },
  preview: {
    trigger: "Quick view",
    title: "Quick view",
    close: "Close quick view",
    previous: "Previous row",
    next: "Next row",
    previousLabel: "Previous",
    nextLabel: "Next",
    position: (index, count) => `${index} of ${count}`,
  },
  refresh: {
    label: "Refresh",
    refreshing: "Refreshing…",
    updated: (time) => `updated ${time}`,
    autoEvery: (interval) => `auto every ${interval}`,
    footerUpdated: (time) => join("updated ", time),
    footerAuto: (interval) => ` (auto ${interval})`,
    minutes: (count) => `${count} min`,
    seconds: (count) => `${count} s`,
  },
  export: {
    trigger: "Export",
    all: "Everything",
    allRowsVisibleColumns: "All rows, visible columns",
    currentPage: "This page",
  },
}

const plRules = new Intl.PluralRules("pl")

/** Polish plural: 1 → `one`, 2–4 (not 12–14) → `few`, everything else → `many`. */
const plPlural = (count: number, one: string, few: string, many: string) => {
  const rule = plRules.select(count)
  return rule === "one" ? one : rule === "few" ? few : many
}

export const plMessages: TableMessages = {
  body: {
    empty: "Brak danych",
    filteredEmpty: "Brak wyników dla tych filtrów",
    filteredEmptyDescription: "Poszerz zakres albo usuń któryś filtr.",
    errorTitle: "Nie udało się wczytać danych",
    error: "Coś poszło nie tak.",
    clearFilters: "Wyczyść filtry",
    filtersKept: "Twoje filtry zostają zachowane.",
    retry: "Spróbuj ponownie",
    loading: "Ładowanie",
  },
  column: {
    options: (column) => `Opcje kolumny ${column}`,
    resize: (column) => `Zmień szerokość kolumny ${column}`,
    align: "Wyrównanie",
    alignColumn: (column, current) =>
      `Wyrównanie kolumny ${column}, obecnie: ${current}`,
    alignLeft: "Do lewej",
    alignCenter: "Do środka",
    alignRight: "Do prawej",
    sortAscending: "Sortuj rosnąco",
    sortDescending: "Sortuj malejąco",
    pinLeft: "Przypnij do lewej",
    unpin: "Odepnij",
    hide: "Ukryj kolumnę",
  },
  sort: {
    ascending: "sortowanie rosnące",
    descending: "sortowanie malejące",
    none: "bez sortowania",
    label: (column, state) => `${column}, ${state}. Kliknij, aby sortować.`,
  },
  selection: {
    selectRow: (row) => `Zaznacz ${row}`,
    row: (id) => `wiersz ${id}`,
    selectPage: "Zaznacz wszystkie wiersze na tej stronie",
    clearPage: "Odznacz wszystkie wiersze na tej stronie",
    options: "Opcje zaznaczenia",
    selected: (count) =>
      `${count} ${plPlural(count, "zaznaczony", "zaznaczone", "zaznaczonych")}`,
    selectedOf: (selected, total) => `Zaznaczono ${selected} z ${total}`,
    nothingSelected: "Nic nie zaznaczono",
    selectAll: "Zaznacz wszystko",
    selectAllCount: (count) => `Zaznacz wszystkie (${count})`,
    selectCurrentPage: "Zaznacz bieżącą stronę",
    deselectCurrentPage: "Odznacz bieżącą stronę",
    deselectAll: "Odznacz wszystko",
  },
  bulk: {
    label: "Zaznaczenie",
    selected: (count) =>
      `${count} ${plPlural(count, "zaznaczony", "zaznaczone", "zaznaczonych")}`,
    selectAllMatching: (count) => `Zaznacz wszystkie pasujące (${count})`,
    selectAll: "Zaznacz wszystko",
    moreActions: "Więcej akcji dla zaznaczonych",
    clearLink: "Wyczyść",
    clear: "Wyczyść zaznaczenie",
  },
  confirm: {
    title: "Czy na pewno?",
    confirm: "Potwierdź",
    delete: "Usuń",
    cancel: "Anuluj",
  },
  rowActions: {
    column: "Akcje",
    trigger: "Akcje wiersza",
  },
  toolbar: {
    options: "Opcje tabeli",
    actions: "Akcje tabeli",
    moreActions: "Więcej akcji tabeli",
    moreActionsTooltip: "Więcej akcji",
  },
  search: {
    placeholder: "Szukaj",
    label: "Szukaj",
    clear: "Wyczyść wyszukiwanie",
    submit: "Szukaj",
    whatIsSearched: "Co jest przeszukiwane",
    searchedFields: (fields) => `Przeszukiwane pola: ${fields}`,
  },
  filters: {
    trigger: "Filtry",
    title: "Filtry",
    close: "Zamknij filtry",
    apply: "Zastosuj",
    reset: "Wyczyść wszystkie",
    appliedAsYouEdit: "Stosowane na bieżąco",
    applyToSee: "Zastosuj, aby zobaczyć wyniki",
    activeCount: (count) =>
      `${count} ${plPlural(count, "aktywny", "aktywne", "aktywnych")}`,
    resetFilters: "Wyczyść filtry",
    done: "Gotowe",
    updating: "Aktualizowanie…",
    showResults: (count, items) =>
      `Pokaż ${count} ${items ?? plPlural(count, "wynik", "wyniki", "wyników")}`,
  },
  activeFilters: {
    lead: "Filtry:",
    search: "Szukaj",
    clearAll: "Wyczyść wszystkie",
    remove: (filter) => `Usuń filtr ${filter}`,
    removeValue: (filter, value) => `Usuń filtr ${filter} ${value}`,
    from: (value) => `od ${value}`,
    to: (value) => `do ${value}`,
    range: (from, to) => `${from} – ${to}`,
  },
  columns: {
    trigger: "Kolumny",
    title: "Kolumny",
    pinnedLeft: "Przypięte z lewej",
    pinnedRight: "Przypięte z prawej",
    reorder: (column) => `Przenieś kolumnę ${column}`,
    reorderTooltip: "Zmień kolejność kolumny",
    show: (column) => `Pokaż kolumnę ${column}`,
    hide: (column) => `Ukryj kolumnę ${column}`,
    pinLeft: (column) => `Przypnij ${column} z lewej`,
    pinRight: (column) => `Przypnij ${column} z prawej`,
    unpin: (column) => `Odepnij ${column}`,
    dragInstructions:
      "Aby przenieść kolumnę, naciśnij Spację lub Enter. Strzałkami w górę i w dół zmień jej " +
      "pozycję, a potem naciśnij Spację lub Enter, aby ją upuścić, albo Escape, aby anulować.",
    pickedUp: (column, position) => `Podniesiono ${column}, ${position}.`,
    movedOver: (column, position) => `${column} przeniesiono na ${position}.`,
    dropped: (column, position) => `Upuszczono ${column} na ${position}.`,
    outside: (column) => `${column} jest poza listą.`,
    droppedBack: (column) => `${column} wróciła na swoje miejsce.`,
    cancelled: (column, position) =>
      `Anulowano przenoszenie ${column}. Kolumna wróciła na ${position}.`,
    position: (index, total) => `pozycję ${index} z ${total}`,
  },
  view: {
    trigger: "Opcje widoku",
    title: "Opcje widoku",
    density: "Gęstość",
    comfortable: "Wygodna",
    compact: "Kompaktowa",
    dividers: "Linie między kolumnami",
    dividersHint: "Pionowe linie między komórkami",
    columns: "Kolumny",
    shown: (shown, total) => `· widoczne ${shown} z ${total}`,
    pinnedLeft: "· przypięta z lewej",
    pinnedRight: "· przypięta z prawej",
    moveUp: (column) => `Przesuń ${column} w górę`,
    moveDown: (column) => `Przesuń ${column} w dół`,
    reset: "Przywróć domyślny widok",
    autoRefresh: "Automatyczne odświeżanie",
    off: "Wył.",
  },
  pagination: {
    label: "Paginacja",
    previous: "Poprzednia strona",
    next: "Następna strona",
    previousLabel: "Poprzednia",
    nextLabel: "Następna",
    goToPage: (page) => `Przejdź do strony ${page}`,
    morePages: "Więcej stron",
    rowsPerPage: "Wierszy na stronę",
    rows: "Wiersze",
    items: (count) => plPlural(count, "pozycja", "pozycje", "pozycji"),
    summary: (range, total, items) => join(range, " z ", total, " ", items),
    selected: (count) => join("zaznaczono ", count),
  },
  sheet: {
    closeHint: "Zamknij (Esc)",
  },
  preview: {
    trigger: "Podgląd",
    title: "Podgląd",
    close: "Zamknij podgląd",
    previous: "Poprzedni wiersz",
    next: "Następny wiersz",
    previousLabel: "Poprzedni",
    nextLabel: "Następny",
    position: (index, count) => `${index} z ${count}`,
  },
  refresh: {
    label: "Odśwież",
    refreshing: "Odświeżanie…",
    updated: (time) => `zaktualizowano ${time}`,
    autoEvery: (interval) => `automatycznie co ${interval}`,
    footerUpdated: (time) => join("zaktualizowano ", time),
    footerAuto: (interval) => ` (automatycznie co ${interval})`,
    minutes: (count) => `${count} min`,
    seconds: (count) => `${count} s`,
  },
  export: {
    trigger: "Eksportuj",
    all: "Wszystko",
    allRowsVisibleColumns: "Wszystkie wiersze, widoczne kolumny",
    currentPage: "Ta strona",
  },
}

/**
 * Deep-merges message sets left to right: groups merge key by key, a later
 * value (string or function) replaces an earlier one, `undefined` is skipped.
 */
export function mergeMessages(
  ...parts: (TableMessagesInput | undefined)[]
): TableMessagesInput {
  const out: Record<string, Record<string, unknown>> = {}
  for (const part of parts) {
    if (!part) continue
    for (const [group, entries] of Object.entries(part)) {
      if (!entries) continue
      const target = (out[group] ??= {})
      for (const [key, value] of Object.entries(entries)) {
        if (value !== undefined) target[key] = value
      }
    }
  }
  return out as TableMessagesInput
}
