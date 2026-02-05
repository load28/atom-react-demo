"use client"

import { useState, useEffect, type ReactNode } from "react"

export const MSWProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    import("./browser")
      .then(({ worker }) => worker.start({ onUnhandledRequest: "bypass" }))
      .then(() => setReady(true))
  }, [])

  if (!ready) return null
  return <>{children}</>
}
