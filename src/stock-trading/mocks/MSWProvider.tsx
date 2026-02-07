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

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    )
  }
  return <>{children}</>
}
