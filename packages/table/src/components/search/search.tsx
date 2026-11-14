import * as React from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@toth/ui/components/input-group"
import { cn } from "@toth/ui/lib/utils"

import { useTableMessages } from "../../hooks/use-table-locale"
import { useDebouncedCallback } from "../../internal/hooks/use-debounced-callback"
import { Icon } from "../../internal/icon"
import { InfoTooltip } from "../../internal/tooltip"
import {
  SEARCH_DEBOUNCE,
  SEARCH_MAX_LENGTH,
} from "../data-table/data-table.constants"
import type { SearchableField } from "../data-table/data-table.types"

// The toolbar's full-text box.
//
// One value, no submission that can fail, nothing to validate: this is a bare `InputGroup`, not a
// `<Form>` — a form around a single input would add a submit handler, a schema and a resolver to
// type a word into a box.
//
// The draft is local so typing stays responsive, and the term is reported on a longer debounce
// than the filter panel uses: a search term is usually several words, and each keystroke that
// escapes is a round trip.

export interface DataTableSearchProps {
  /** The term in force. The box opens showing it. */
  value: string
  onChange: (term: string) => void
  /** Report as the user types. Off puts the term behind the magnifier. */
  submitOnChange?: boolean
  debounce?: number
  /** The fields the term is matched against, listed in the box's tooltip. */
  searchableFields?: readonly SearchableField[]
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  /**
   * Fill the container rather than take the box's own width (full below `sm`, 20rem above). The
   * table's toolbar sets it, because it sizes the box by the table's width, not the window's.
   */
  fullWidth?: boolean
  className?: string
}

function DataTableSearch({
  value,
  onChange,
  submitOnChange = true,
  debounce = SEARCH_DEBOUNCE,
  searchableFields = [],
  placeholder,
  maxLength = SEARCH_MAX_LENGTH,
  disabled,
  fullWidth = false,
  className,
}: DataTableSearchProps) {
  const messages = useTableMessages()
  const [draft, setDraft] = React.useState(value)
  // The last term this box itself is responsible for, whether already reported or still pending
  // behind the debounce. A ref rather than state: the comparison below must run only when the
  // `value` PROP itself changes, never on a render this component causes on its own — a keystroke
  // bumps `draft` (and, under `submitOnChange`, this ref) long before the debounced `onChange`
  // lets `value` catch up, and a render-time check comparing against state re-fires on every one
  // of those renders, undoing the keystroke that just landed.
  const knownRef = React.useRef(value)

  const report = useDebouncedCallback(onChange, debounce)

  // The term in force changed from OUTSIDE — a chip cleared, a saved view loaded — so the box
  // follows it. Compared against what the box last reported rather than against the draft, or a
  // debounced echo of the box's OWN term would undo whatever was typed after it.
  //
  // Cancels whatever the box itself still has in flight: without it, an external reset arriving
  // while a keystroke's debounce is still pending would win for a moment, then lose again the
  // instant that stale report finally lands and puts the old term right back.
  React.useEffect(() => {
    if (value !== knownRef.current) {
      report.cancel()
      knownRef.current = value
      setDraft(value)
    }
  }, [value, report])

  const commit = (term: string) => {
    report.cancel()
    knownRef.current = term
    onChange(term)
  }

  const handleChange = (term: string) => {
    setDraft(term)

    if (submitOnChange) {
      knownRef.current = term
      report.call(term)
    }
  }

  const fieldNames = searchableFields
    .map((field) => field.label ?? field.field)
    .filter(Boolean)

  // Enter submits whether or not the box reports as you type: someone who has finished typing
  // should not have to wait out a debounce to see the result.
  //
  // Guarded on the target so that Enter on the clear or search button, which fires keydown
  // BEFORE click, is left to the button it belongs to.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) {
      return
    }

    event.preventDefault()
    commit(draft)
  }

  return (
    <div className={className}>
      <InputGroup
        data-slot="data-table-search"
        className={cn("w-full", !fullWidth && "sm:w-80")}
      >
        {fieldNames.length > 0 ? (
          <InputGroupAddon>
            <InfoTooltip label={messages.search.whatIsSearched}>
              {messages.search.searchedFields(fieldNames.join(", "))}
            </InfoTooltip>
          </InputGroupAddon>
        ) : (
          <InputGroupAddon>
            <Icon icon="search" />
          </InputGroupAddon>
        )}
        <InputGroupInput
          type="search"
          aria-label={messages.search.label}
          placeholder={placeholder ?? messages.search.placeholder}
          maxLength={maxLength}
          disabled={disabled}
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          // The native clear button doubles the one below.
          className="[&::-webkit-search-cancel-button]:hidden"
        />
        <InputGroupAddon align="inline-end">
          {draft !== "" ? (
            <InputGroupButton
              size="icon-xs"
              aria-label={messages.search.clear}
              disabled={disabled}
              onClick={() => {
                setDraft("")
                commit("")
              }}
            >
              <Icon icon="x" />
            </InputGroupButton>
          ) : null}
          {submitOnChange ? null : (
            <InputGroupButton
              size="icon-xs"
              aria-label={messages.search.submit}
              disabled={disabled}
              onClick={() => commit(draft)}
            >
              <Icon icon="search" />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

export { DataTableSearch }
