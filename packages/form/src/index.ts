/**
 * @toth/form — declarative forms on react-hook-form + zod and @toth/ui.
 */
export { Form, type FormProps, type ProvidedFormProps } from "./form"
export { FormItem, defineFormItems, type FormItemProps } from "./form-item"
export { FormSection, type FormSectionProps } from "./form-section"
export { FormActions, FormError, type FormActionsProps } from "./form-actions"
export {
  useFormConfig,
  useFormLocale,
  type FormConfig,
  type FormLocaleSettings,
  type ResolvedFormLocale,
} from "./form-context"
export {
  FormDefaultsProvider,
  type FormDefaultsProviderProps,
} from "./form-defaults"
export {
  enMessages,
  plMessages,
  mergeMessages,
  type DatePresetKey,
  type DateRangePresetKey,
  type FormMessages,
  type FormMessagesInput,
} from "./lib/messages"
export { plLocale } from "./lib/locales"
export { colSpanClassName } from "./lib/grid"
export { DATE_PRESETS, DATE_RANGE_PRESETS } from "./lib/date-presets"
export type { SubmitResult } from "./lib/submit"
export type {
  Breakpoint,
  ColSpan,
  DatePreset,
  DateRangePreset,
  FormAction,
  FormItemConfig,
  FormItemType,
  ColorOption,
  FormOption,
  LinkComponent,
  NumberRangeValue,
  Span,
} from "./types"
