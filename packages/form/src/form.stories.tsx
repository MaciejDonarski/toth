import type { Meta, StoryObj } from "@storybook/react-vite"
import { z } from "zod"

import { Form } from "./form"
import { FormActions } from "./form-actions"
import { defineFormItems } from "./form-item"
import { FormSection } from "./form-section"

const roles = [
  { value: "admin", label: "Admin" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
]

const skills = [
  { value: "react", label: "React" },
  { value: "ts", label: "TypeScript" },
  { value: "css", label: "CSS" },
  { value: "node", label: "Node.js" },
]

const schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.email("Invalid email"),
  password: z.string().min(8, "At least 8 characters"),
  age: z.number().int().min(18, "Must be 18+").optional(),
  role: z.string({ error: "Pick a role" }),
  skills: z.array(z.string()).min(1, "Pick at least one skill"),
  bio: z.string().max(200, "Max 200 characters").optional(),
  plan: z.enum(["free", "pro"]),
  birthday: z.date({ error: "Pick a date" }),
  vacation: z
    .object({ from: z.date().optional(), to: z.date().optional() })
    .optional(),
  newsletter: z.boolean(),
  terms: z.literal(true, { error: "You must accept the terms" }),
})

type Values = z.input<typeof schema>

const accountItems = defineFormItems<Values>()([
  {
    name: "firstName",
    type: "text",
    label: "First name",
    required: true,
    colSpan: { base: 12, md: 6 },
  },
  {
    name: "lastName",
    type: "text",
    label: "Last name",
    required: true,
    colSpan: { base: 12, md: 6 },
  },
  {
    name: "email",
    type: "email",
    label: "Email",
    required: true,
    description: "Try taken@example.com to see a server error.",
    colSpan: { base: 12, md: 6 },
  },
  {
    name: "password",
    type: "password",
    label: "Password",
    required: true,
    colSpan: { base: 12, md: 6 },
  },
  {
    name: "age",
    type: "number",
    label: "Age",
    colSpan: { base: 12, md: 4 },
  },
  {
    name: "role",
    type: "select",
    label: "Role",
    placeholder: "Select a role",
    options: roles,
    required: true,
    colSpan: { base: 12, md: 4 },
  },
  {
    name: "birthday",
    type: "date",
    label: "Birthday",
    required: true,
    colSpan: { base: 12, md: 4 },
  },
])

const profileItems = defineFormItems<Values>()([
  {
    name: "skills",
    type: "multiselect",
    label: "Skills",
    placeholder: "Add skill",
    options: skills,
    colSpan: { base: 12, lg: 6 },
  },
  {
    name: "vacation",
    type: "date-range",
    label: "Vacation",
    placeholder: "Pick a range",
    colSpan: { base: 12, lg: 6 },
  },
  { name: "bio", type: "textarea", label: "Bio", rows: 3 },
  {
    name: "plan",
    type: "radio",
    label: "Plan",
    orientation: "horizontal",
    options: [
      { value: "free", label: "Free" },
      { value: "pro", label: "Pro" },
    ],
  },
  {
    name: "newsletter",
    type: "switch",
    label: "Newsletter",
    description: "Monthly product updates.",
  },
  { name: "terms", type: "checkbox", label: "I accept the terms" },
])

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function ExampleForm() {
  return (
    <Form
      schema={schema}
      defaultValues={{
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        skills: [],
        plan: "free",
        newsletter: true,
      }}
      onSubmit={async (values) => {
        await wait(1200)
        if (values.email === "taken@example.com") {
          return {
            fieldErrors: { email: "This email is already registered" },
            formError: "We could not create the account.",
          }
        }
        alert(JSON.stringify(values, null, 2))
      }}
      className="w-[min(56rem,calc(100vw-2rem))]"
    >
      <FormSection
        card
        title="Account"
        description="Basic account details."
        items={accountItems}
      />
      <FormSection
        title="Profile"
        description="Plain section without a card."
        items={profileItems}
      />
      <FormActions
        actions={[
          { kind: "link", label: "Cancel", href: "#" },
          { kind: "reset", label: "Reset" },
          { kind: "submit", label: "Create account" },
        ]}
      />
    </Form>
  )
}

const meta = {
  title: "Form/Form",
  component: ExampleForm,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ExampleForm>

export default meta
export const Complete: StoryObj<typeof meta> = {}
