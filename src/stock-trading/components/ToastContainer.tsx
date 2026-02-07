"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { useEffect } from "react"
import { notificationsAtom, type NotificationType } from "@/src/stock-trading/atoms/notification"

const TOAST_DURATION_MS = 4000

const TOAST_STYLES: Record<NotificationType, { bg: string; border: string; text: string }> = {
  success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800" },
  error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800" },
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800" },
}

export const ToastContainer = () => {
  const notifications = useAtomValue(notificationsAtom)
  const setNotifications = useAtomSet(notificationsAtom)

  useEffect(() => {
    if (notifications.length === 0) return
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.slice(1))
    }, TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [notifications, setNotifications])

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notif) => {
        const style = TOAST_STYLES[notif.type]
        return (
          <div
            key={notif.id}
            className={`px-4 py-3 rounded-lg border shadow-lg ${style.bg} ${style.border} animate-in slide-in-from-right`}
          >
            <p className={`text-sm font-medium ${style.text}`}>{notif.message}</p>
          </div>
        )
      })}
    </div>
  )
}
