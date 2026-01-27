"use client"

import { useAtomValue } from "@effect-atom/atom-react/Hooks"
import { viewportAtom } from "@/src/atoms/core"
import { dateToX } from "@/src/domain/coordinate"

export function TimelineHeader() {
  const viewport = useAtomValue(viewportAtom)
  const dates: Date[] = []
  const current = new Date(viewport.startDate)
  while (current <= viewport.endDate) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  const showEvery = viewport.zoom >= 30 ? 1 : 7

  return (
    <div className="relative h-10 border-b border-gray-300 bg-gray-50" data-testid="timeline-header">
      {dates
        .filter((_, i) => i % showEvery === 0)
        .map((date) => {
          const x = dateToX(date, viewport)
          const label = `${date.getMonth() + 1}/${date.getDate()}`
          return (
            <div
              key={date.toISOString()}
              className="absolute top-0 text-xs text-gray-500 px-1 leading-10"
              style={{ left: x }}
            >
              {label}
            </div>
          )
        })}
    </div>
  )
}
