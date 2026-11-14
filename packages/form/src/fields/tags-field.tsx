"use client"

import { useState, type KeyboardEvent } from "react"
import { XIcon } from "lucide-react"

import { Badge } from "@toth/ui/components/badge"
import { cn } from "@toth/ui/lib/utils"

import { useFormLocale } from "../form-context"
import type { TagsItem } from "../types"
import type { FieldRendererProps } from "./field-props"

function toTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === "string")
    : []
}

/**
 * Free-text tags (`string[]`). Enter or comma adds the typed text, Backspace
 * in an empty input removes the last tag, and the draft is added on blur so
 * nothing typed is lost. Duplicates are ignored.
 */
function TagsField({
  item,
  field,
  inputRef,
  fieldState,
  id,
  describedBy,
}: FieldRendererProps<TagsItem>) {
  const { messages } = useFormLocale()
  const [draft, setDraft] = useState("")
  const tags = toTags(field.value)
  const disabled = item.disabled ?? field.disabled

  const commit = () => {
    const tag = draft.trim()
    setDraft("")
    if (tag && !tags.includes(tag)) field.onChange([...tags, tag])
  }

  const remove = (tag: string) => field.onChange(tags.filter((t) => t !== tag))

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      commit()
    } else if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      remove(tags[tags.length - 1]!)
    }
  }

  return (
    <div
      data-slot="tags"
      data-disabled={disabled || undefined}
      aria-invalid={fieldState.invalid || undefined}
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 data-disabled:opacity-50"
      )}
    >
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            disabled={disabled}
            aria-label={messages.removeTag(tag)}
            onClick={() => remove(tag)}
            className="rounded-full opacity-60 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        ref={inputRef}
        name={field.name}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          commit()
          field.onBlur()
        }}
        placeholder={
          tags.length === 0 ? (item.placeholder ?? messages.addTag) : undefined
        }
        disabled={disabled}
        aria-invalid={fieldState.invalid || undefined}
        aria-describedby={describedBy}
        className="min-w-24 flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  )
}

export { TagsField }
