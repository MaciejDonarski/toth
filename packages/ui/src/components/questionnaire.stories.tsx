import type { Meta, StoryObj } from "@storybook/react-vite"
import type * as React from "react"
import { fn } from "storybook/test"

import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@toth/ui/components/questionnaire"

const items = [
  {
    name: "direction",
    required: true,
    choices: [
      { value: "tool-calls" },
      { value: "approvals" },
      { value: "handoffs" },
    ],
  },
  {
    name: "signals",
    choices: [
      { value: "progress" },
      { value: "decisions" },
      { value: "risks" },
    ],
  },
  {
    name: "timing",
    required: true,
    choices: [{ value: "now" }, { value: "next-cycle" }, { value: "backlog" }],
  },
] as const

const onSubmit = fn((event: React.FormEvent<HTMLFormElement>) =>
  event.preventDefault()
)

const meta = {
  title: "UI/Questionnaire",
  component: Questionnaire,
  tags: ["autodocs"],
  args: { items, shortcuts: "letters", defaultItem: "direction", onSubmit },
  render: (args) => (
    <Questionnaire {...args} className="w-[28rem]">
      <QuestionnaireProgress />
      <QuestionnaireItem name="direction" required>
        <QuestionnaireTitle>
          What should the agent build next?
        </QuestionnaireTitle>
        <QuestionnaireDescription>
          Choose a direction or describe another task.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="tool-calls">
            <span className="font-medium">Tool call timeline</span>
            <QuestionnaireChoiceDescription>
              Show what the agent ran.
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="approvals">
            <span className="font-medium">Approval checkpoints</span>
            <QuestionnaireChoiceDescription>
              Ask before destructive actions.
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="handoffs">
            <span className="font-medium">Sub-agent handoffs</span>
            <QuestionnaireChoiceDescription>
              Make delegated work easier to follow.
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireInput
            aria-label="Another feature"
            placeholder="Describe another feature…"
          />
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="signals" multiple>
        <QuestionnaireTitle>
          What should every progress update include?
        </QuestionnaireTitle>
        <QuestionnaireDescription>
          Select all that apply, or skip this question.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="progress">Progress</QuestionnaireChoice>
          <QuestionnaireChoice value="decisions">Decisions</QuestionnaireChoice>
          <QuestionnaireChoice value="risks">Risks</QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="timing" required>
        <QuestionnaireTitle>When should work begin?</QuestionnaireTitle>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="now">Start now</QuestionnaireChoice>
          <QuestionnaireChoice value="next-cycle">
            Next development cycle
          </QuestionnaireChoice>
          <QuestionnaireChoice value="backlog">
            Add it to the backlog
          </QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnairePrevious />
        <QuestionnaireSkip />
        <QuestionnaireNext />
        <QuestionnaireSubmit>Save plan</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  ),
} satisfies Meta<typeof Questionnaire>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const NumberShortcuts: Story = { args: { shortcuts: "numbers" } }
