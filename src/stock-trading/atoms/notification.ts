import { Atom } from "@effect-atom/atom-react"

export type NotificationType = "success" | "error" | "warning" | "info"

export interface Notification {
  id: string
  type: NotificationType
  message: string
  createdAt: number
}

let notificationCounter = 0

// 활성 알림 목록
export const notificationsAtom = Atom.make<ReadonlyArray<Notification>>([])

// 알림 추가 헬퍼 (컴포넌트에서 get.set으로 사용)
export const createNotification = (type: NotificationType, message: string): Notification => ({
  id: `notif-${++notificationCounter}`,
  type,
  message,
  createdAt: Date.now(),
})
