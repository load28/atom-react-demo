"use client"

import { useCallback } from "react"
import { useAtom } from "@effect-atom/atom-react/Hooks"
import { viewportAtom } from "@/src/atoms/core"

export function useViewport() {
  const [viewport, setViewport] = useAtom(viewportAtom)

  const zoomIn = useCallback(() => {
    setViewport((v) => ({ ...v, zoom: Math.min(v.zoom * 1.5, 100) }))
  }, [setViewport])

  const zoomOut = useCallback(() => {
    setViewport((v) => ({ ...v, zoom: Math.max(v.zoom / 1.5, 5) }))
  }, [setViewport])

  const scrollBy = useCallback(
    (days: number) => {
      setViewport((v) => {
        const ms = days * 86_400_000
        return {
          ...v,
          startDate: new Date(v.startDate.getTime() + ms),
          endDate: new Date(v.endDate.getTime() + ms),
        }
      })
    },
    [setViewport]
  )

  return { viewport, zoomIn, zoomOut, scrollBy }
}
