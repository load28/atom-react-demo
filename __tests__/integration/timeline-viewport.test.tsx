import { describe, expect, test, afterEach } from "bun:test"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import React from "react"
import { RegistryProvider } from "@effect-atom/atom-react/RegistryContext"
import { TimelineContainer } from "@/src/components/timeline/TimelineContainer"

afterEach(cleanup)

function renderTimeline() {
  return render(
    <RegistryProvider>
      <TimelineContainer />
    </RegistryProvider>
  )
}

describe("Timeline viewport integration", () => {
  test("zoom in button is clickable", () => {
    renderTimeline()
    const zoomInBtn = screen.getByTestId("btn-zoom-in")
    expect(zoomInBtn).toBeDefined()
    fireEvent.click(zoomInBtn)
  })

  test("zoom out button is clickable", () => {
    renderTimeline()
    const zoomOutBtn = screen.getByTestId("btn-zoom-out")
    expect(zoomOutBtn).toBeDefined()
    fireEvent.click(zoomOutBtn)
  })
})
