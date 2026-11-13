import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldValues,
  RefCallBack,
} from "react-hook-form"

import type { FormItemConfig } from "../types"

/** Props every field renderer receives from `FormItem`. */
export interface FieldRendererProps<TItem extends FormItemConfig> {
  item: TItem
  field: Omit<ControllerRenderProps<FieldValues, string>, "ref">
  /** react-hook-form ref, so the field can be focused on error. */
  inputRef: RefCallBack
  fieldState: ControllerFieldState
  /** id of the focusable control — `FieldLabel` points at it. */
  id: string
  /** id of the label element, for controls labelled via `aria-labelledby`. */
  labelId: string
  /** id of the description/error text, for `aria-describedby`. */
  describedBy?: string
}
