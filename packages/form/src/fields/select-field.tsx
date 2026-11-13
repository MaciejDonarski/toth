"use client"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@toth/ui/components/combobox"

import { useFormLocale } from "../form-context"
import type { FormOption, SelectItem } from "../types"
import type { FieldRendererProps } from "./field-props"

const toLabel = (option: FormOption) => option.label
const isSameOption = (a: FormOption, b: FormOption) => a.value === b.value

function OptionList({ emptyText }: { emptyText?: string }) {
  const { messages } = useFormLocale()
  return (
    <>
      <ComboboxEmpty>{emptyText ?? messages.noResults}</ComboboxEmpty>
      <ComboboxList>
        {(option: FormOption) => (
          <ComboboxItem
            key={option.value}
            value={option}
            disabled={option.disabled}
          >
            {option.label}
          </ComboboxItem>
        )}
      </ComboboxList>
    </>
  )
}

function SingleSelect({
  item,
  field,
  inputRef,
  fieldState,
  id,
  describedBy,
}: FieldRendererProps<SelectItem>) {
  const selected = item.options.find((o) => o.value === field.value) ?? null

  return (
    <Combobox
      items={item.options}
      value={selected}
      onValueChange={(option) => field.onChange(option?.value ?? null)}
      itemToStringLabel={toLabel}
      isItemEqualToValue={isSameOption}
      disabled={item.disabled ?? field.disabled}
    >
      <ComboboxInput
        id={id}
        ref={inputRef}
        name={field.name}
        className="w-full"
        placeholder={item.placeholder}
        onBlur={field.onBlur}
        disabled={item.disabled ?? field.disabled}
        aria-invalid={fieldState.invalid || undefined}
        aria-describedby={describedBy}
      />
      <ComboboxContent>
        <OptionList emptyText={item.emptyText} />
      </ComboboxContent>
    </Combobox>
  )
}

function MultiSelect({
  item,
  field,
  inputRef,
  fieldState,
  id,
  describedBy,
}: FieldRendererProps<SelectItem>) {
  const anchor = useComboboxAnchor()
  const values: unknown = field.value
  const selectedValues = Array.isArray(values) ? (values as string[]) : []
  const selected = item.options.filter((o) => selectedValues.includes(o.value))

  return (
    <Combobox
      multiple
      items={item.options}
      value={selected}
      onValueChange={(options) => field.onChange(options.map((o) => o.value))}
      itemToStringLabel={toLabel}
      isItemEqualToValue={isSameOption}
      disabled={item.disabled ?? field.disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(options: FormOption[]) => (
            <>
              {options.map((option) => (
                <ComboboxChip key={option.value}>{option.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                id={id}
                ref={inputRef}
                name={field.name}
                placeholder={options.length ? undefined : item.placeholder}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid || undefined}
                aria-describedby={describedBy}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <OptionList emptyText={item.emptyText} />
      </ComboboxContent>
    </Combobox>
  )
}

function SelectField(props: FieldRendererProps<SelectItem>) {
  return props.item.type === "multiselect" ? (
    <MultiSelect {...props} />
  ) : (
    <SingleSelect {...props} />
  )
}

export { SelectField }
