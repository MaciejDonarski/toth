"use client"

import { useId, useState } from "react"
import { format, isValid, parse } from "date-fns"
import { XIcon } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@toth/ui/components/input-group"
import { Label } from "@toth/ui/components/label"

interface DateInputProps {
  label: string
  clearLabel: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  /** date-fns format used to show and parse the text. */
  pattern: string
}

/**
 * Text input for one date. Typing keeps a local draft; it is parsed on blur
 * or Enter. Invalid text is discarded and the input is marked invalid until
 * the next edit.
 */
function DateInput({
  label,
  clearLabel,
  value,
  onChange,
  pattern,
}: DateInputProps) {
  const id = useId()
  // null = not editing, show the formatted value.
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)
  // Today as an example of the expected format.
  const [placeholder] = useState(() => format(new Date(), pattern))
  const text = draft ?? (value ? format(value, pattern) : "")

  const commit = () => {
    if (draft === null) return
    const trimmed = draft.trim()
    if (!trimmed) {
      onChange(undefined)
    } else {
      const parsed = parse(trimmed, pattern, new Date())
      if (isValid(parsed)) onChange(parsed)
      else setInvalid(true)
    }
    setDraft(null)
  }

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <InputGroup>
        <InputGroupInput
          id={id}
          value={text}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setDraft(event.target.value)
            setInvalid(false)
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              commit()
            }
          }}
        />
        {value && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label={clearLabel}
              onClick={() => {
                setDraft(null)
                setInvalid(false)
                onChange(undefined)
              }}
            >
              <XIcon />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  )
}

export { DateInput }
