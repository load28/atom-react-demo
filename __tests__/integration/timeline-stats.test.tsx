import { describe, expect, test, afterEach, beforeEach } from "bun:test"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import React from "react"
import { RegistryProvider } from "@effect-atom/atom-react/RegistryContext"
import { TimelineContainer } from "@/src/components/timeline/TimelineContainer"

afterEach(cleanup)

beforeEach(() => {
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => {}
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => {}
  }
})

function renderTimeline() {
  return render(
    <RegistryProvider>
      <TimelineContainer />
    </RegistryProvider>
  )
}

describe("TaskStats integration", () => {
  test("displays stats panel with initial zero values", () => {
    renderTimeline()
    expect(screen.getByTestId("task-stats")).toBeDefined()
    expect(screen.getByTestId("stats-total").textContent).toContain("0")
  })

  test("updates stats after creating a task", () => {
    renderTimeline()

    fireEvent.change(screen.getByTestId("input-title"), {
      target: { value: "Stats Task" },
    })
    fireEvent.change(screen.getByTestId("input-start"), {
      target: { value: "2025-01-05" },
    })
    fireEvent.change(screen.getByTestId("input-end"), {
      target: { value: "2025-01-15" },
    })
    fireEvent.click(screen.getByTestId("btn-create"))

    expect(screen.getByTestId("stats-total").textContent).toContain("1")
  })
})
