import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@toth/ui/components/questionnaire"

const items = [
  {
    name: "timing",
    required: true,
    choices: [{ value: "now" }, { value: "later" }],
  },
] as const

describe("Questionnaire", () => {
  it("renders a question with choices and submits the answer", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      return new FormData(event.currentTarget).get("timing")
    })
    render(
      <Questionnaire items={items} onSubmit={onSubmit}>
        <QuestionnaireItem name="timing" required>
          <QuestionnaireTitle>When should work begin?</QuestionnaireTitle>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="now">Start now</QuestionnaireChoice>
            <QuestionnaireChoice value="later">Later</QuestionnaireChoice>
          </QuestionnaireChoices>
        </QuestionnaireItem>
        <QuestionnaireActions>
          <QuestionnaireSubmit>Save</QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
    )
    expect(
      screen.getByRole("group", { name: "When should work begin?" })
    ).toBeInTheDocument()
    const radio = screen.getByRole("radio", { name: "Start now" })
    await user.click(radio)
    expect(radio).toBeChecked()

    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.results[0]?.value).toBe("now")
  })
})
