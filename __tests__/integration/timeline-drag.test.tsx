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

describe("Timeline drag integration", () => {
  test("drag task bar triggers pointer events without crashing", () => {
    renderTimeline()

    fireEvent.change(screen.getByTestId("input-title"), {
      target: { value: "Drag Task" },
    })
    fireEvent.change(screen.getByTestId("input-start"), {
      target: { value: "2025-01-01" },
    })
    fireEvent.change(screen.getByTestId("input-end"), {
      target: { value: "2025-01-11" },
    })
    fireEvent.click(screen.getByTestId("btn-create"))

    const bar = screen.getByText("Drag Task")
    fireEvent.pointerDown(bar, { clientX: 100 })
    fireEvent.pointerMove(bar, { clientX: 200 })
    fireEvent.pointerUp(bar)

    expect(screen.getByText("Drag Task")).toBeDefined()
  })
})
