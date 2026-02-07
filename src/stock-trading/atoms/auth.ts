import { Atom } from "@effect-atom/atom-react"
import { Effect } from "effect"
import type { User } from "@/src/stock-trading/domain/model"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import { ordersAtom } from "./trading"
import { pendingOrdersAtom, lastMatchResultAtom } from "./pending-orders"
import { watchlistsAtom, activeAlertsAtom } from "./watchlist"

// Service runtime atom - dependency injection
const runtimeAtom = Atom.runtime(AuthService.Default)

// UI state: current logged-in user
export const currentUserAtom = Atom.make<User | null>(null)

// Input atoms: DOM onChange → atom setter 직접 연결
export const usernameInputAtom = Atom.make("")
export const passwordInputAtom = Atom.make("")

// UI state: login error message
export const loginErrorAtom = Atom.make<string>("")

// Effect atom: login action (인자 없이 input atom에서 값을 읽음)
export const loginAtom = runtimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const username = get(usernameInputAtom)
    const password = get(passwordInputAtom)
    get.set(loginErrorAtom, "")
    const auth = yield* AuthService
    const user = yield* auth.login(username, password)
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

    // Reset user & auth UI state
    get.set(currentUserAtom, null)
    get.set(usernameInputAtom, "")
    get.set(passwordInputAtom, "")
    get.set(loginErrorAtom, "")

    // Reset trading state to prevent data leaks between users
    get.set(ordersAtom, [])
    get.set(pendingOrdersAtom, [])
    get.set(lastMatchResultAtom, null)
    get.set(watchlistsAtom, [])
    get.set(activeAlertsAtom, [])
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
