import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Page from "./page"

describe("Home page", () => {
  it("renders the hello world greeting", async () => {
    render(await Page())
    expect(screen.getByText("Hello, world!")).toBeInTheDocument()
  })
})
