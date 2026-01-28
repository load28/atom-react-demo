import { describe, expect, test, afterEach, beforeEach } from "bun:test"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import React from "react"
import { RegistryProvider } from "@effect-atom/atom-react/RegistryContext"
import { TimelineContainer } from "@/src/components/timeline/TimelineContainer"

afterEach(cleanup)

beforeEach(() => {
  // happy-dom does not implement setPointerCapture
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

describe("Timeline CRUD integration", () => {
  test("creates a task via form and displays it", () => {
    renderTimeline()

    fireEvent.change(screen.getByTestId("input-title"), {
      target: { value: "New Task" },
    })
    fireEvent.change(screen.getByTestId("input-start"), {
      target: { value: "2025-01-05" },
    })
    fireEvent.change(screen.getByTestId("input-end"), {
      target: { value: "2025-01-15" },
    })
    fireEvent.click(screen.getByTestId("btn-create"))

    // The task bar span and the form heading both contain "New Task",
    // so use getAllByText and check at least one is in the timeline bar
    const elements = screen.getAllByText("New Task")
    expect(elements.length).toBeGreaterThanOrEqual(2) // bar + heading
  })

  test("selects a task and deletes it", () => {
    renderTimeline()

    fireEvent.change(screen.getByTestId("input-title"), {
      target: { value: "Delete Me" },
    })
    fireEvent.change(screen.getByTestId("input-start"), {
      target: { value: "2025-01-01" },
    })
    fireEvent.change(screen.getByTestId("input-end"), {
      target: { value: "2025-01-10" },
    })
    fireEvent.click(screen.getByTestId("btn-create"))

    const bar = screen.getByText("Delete Me")
    fireEvent.pointerDown(bar, { clientX: 100 })

    const deleteBtn = screen.getByTestId("btn-delete")
    fireEvent.click(deleteBtn)

    expect(screen.queryByText("Delete Me")).toBeNull()
  })
})
