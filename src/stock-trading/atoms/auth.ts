import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"
import type { User } from "@/src/stock-trading/domain/model"
import { AuthService } from "@/src/stock-trading/services/auth-service"

// Service runtime atom - dependency injection
const runtimeAtom = Atom.runtime(AuthService.Default)

// UI state: current logged-in user
export const currentUserAtom = Atom.make<User | null>(null)

// UI state: login error message
export const loginErrorAtom = Atom.make<string>("")

// Effect atom: login action
export const loginAtom = runtimeAtom.fn(
  (args: { username: string; password: string }, get) =>
    Effect.gen(function* () {
      get.set(loginErrorAtom, "")
      const auth = yield* AuthService
      const user = yield* auth.login(args.username, args.password)
      get.set(currentUserAtom, user)
      return user
    }).pipe(
      Effect.tapError(() =>
        Effect.sync(() => {
          get.set(loginErrorAtom, "로그인 실패: 아이디 또는 비밀번호를 확인하세요")
        })
      )
    )
)

// Effect atom: logout action
export const logoutAtom = runtimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const auth = yield* AuthService
    yield* auth.logout()
    get.set(currentUserAtom, null)
    get.set(loginErrorAtom, "")
  })
)

// Effect atom: refresh user data
export const refreshUserAtom = runtimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const auth = yield* AuthService
    const user = yield* auth.getCurrentUser()
    get.set(currentUserAtom, user)
    return user
  })
)
