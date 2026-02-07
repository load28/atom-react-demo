"use client"

import { useState, useEffect, type ReactNode } from "react"

export const MSWProvider = ({ children }: { children: ReactNode }) => {
  const [ready, setReady] = useState(process.env.NODE_ENV === "production")

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return

    import("./browser")
      .then(({ worker }) => worker.start({ onUnhandledRequest: "bypass" }))
      .then(() => setReady(true))
  }, [])

  if (!ready) return null
  return <>{children}</>
}
