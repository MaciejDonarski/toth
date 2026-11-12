/**
 * @toth/form — declarative forms on react-hook-form + zod and @toth/ui.
 */
export { Form, type FormProps } from "./form"
export { FormItem, defineFormItems, type FormItemProps } from "./form-item"
export { FormSection, type FormSectionProps } from "./form-section"
export { FormActions, FormError, type FormActionsProps } from "./form-actions"
export { useFormConfig, type FormConfig } from "./form-context"
export { colSpanClassName } from "./lib/grid"
export type { SubmitResult } from "./lib/submit"
export type {
  Breakpoint,
  ColSpan,
  FormAction,
  FormItemConfig,
  FormItemType,
  FormOption,
  LinkComponent,
  Span,
} from "./types"
