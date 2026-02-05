import { Atom } from "@effect-atom/atom-react"
import { Effect, Layer } from "effect"
import type { User } from "@/src/stock-trading/domain/model"
import { AuthService } from "@/src/stock-trading/services/auth-service"

// 가이드 섹션 18: Atom.runtime으로 서비스 의존성 주입
const runtimeAtom = Atom.runtime(AuthService.Default)

// UI 상태: 현재 로그인된 유저
export const currentUserAtom = Atom.make<User | null>(null)

// runtimeAtom.fn: 인자를 받아 Effect를 실행하는 Atom
export const loginAtom = runtimeAtom.fn(
  (args: { username: string; password: string }, get) =>
    Effect.gen(function* () {
      const auth = yield* AuthService
      const user = yield* auth.login(args.username, args.password)
      get.set(currentUserAtom, user)
      return user
    })
)

export const logoutAtom = runtimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const auth = yield* AuthService
    yield* auth.logout()
    get.set(currentUserAtom, null)
  })
)

export const refreshUserAtom = runtimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const auth = yield* AuthService
    const user = yield* auth.getCurrentUser()
    get.set(currentUserAtom, user)
    return user
  })
)
