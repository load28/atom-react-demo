"use client"

import { useAtomValue } from "@effect-atom/atom-react/Hooks"
import { viewportAtom } from "@/src/atoms/core"
import { dateToX } from "@/src/domain/coordinate"

interface TimelineGridProps {
  readonly height: number
}

export function TimelineGrid({ height }: TimelineGridProps) {
  const viewport = useAtomValue(viewportAtom)
  const lines: number[] = []
  const current = new Date(viewport.startDate)
  while (current <= viewport.endDate) {
    lines.push(dateToX(current, viewport))
    current.setDate(current.getDate() + 7)
  }

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="timeline-grid">
      {lines.map((x) => (
        <div
          key={x}
          className="absolute top-0 w-px bg-gray-200"
          style={{ left: x, height }}
        />
      ))}
    </div>
  )
}
