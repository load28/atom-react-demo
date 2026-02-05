import { Effect, Ref, HashMap } from "effect"
import type { User, UserId } from "@/src/stock-trading/domain/model"
import { InvalidCredentials } from "@/src/stock-trading/domain/errors"

// 모의 유저 데이터 (실무에서는 Layer로 교체)
const MOCK_USERS = HashMap.fromIterable([
  ["trader1", { id: "user-1" as UserId, username: "trader1", password: "password123", balance: 100_000 }],
  ["trader2", { id: "user-2" as UserId, username: "trader2", password: "password456", balance: 50_000 }],
])

export class AuthService extends Effect.Service<AuthService>()("AuthService", {
  effect: Effect.gen(function* () {
    const currentUser = yield* Ref.make<User | null>(null)
    const balances = yield* Ref.make(HashMap.empty<UserId, number>())

    const login = (username: string, password: string) =>
      Effect.gen(function* () {
        const found = HashMap.get(MOCK_USERS, username)
        if (found._tag === "None") {
          return yield* Effect.fail(new InvalidCredentials({ username }))
        }
        if (found.value.password !== password) {
          return yield* Effect.fail(new InvalidCredentials({ username }))
        }
        const user: User = {
          id: found.value.id,
          username: found.value.username,
          balance: found.value.balance,
        }
        yield* Ref.set(currentUser, user)
        yield* Ref.update(balances, HashMap.set(user.id, user.balance))
        return user
      })

    const getCurrentUser = () =>
      Effect.gen(function* () {
        const user = yield* Ref.get(currentUser)
        if (user === null) return null
        const bal = HashMap.get(yield* Ref.get(balances), user.id)
        return bal._tag === "Some" ? { ...user, balance: bal.value } : user
      })

    const logout = () => Ref.set(currentUser, null)

    const updateBalance = (userId: UserId, newBalance: number) =>
      Ref.update(balances, HashMap.set(userId, newBalance))

    const getBalance = (userId: UserId) =>
      Effect.gen(function* () {
        const bal = HashMap.get(yield* Ref.get(balances), userId)
        return bal._tag === "Some" ? bal.value : 0
      })

    return { login, getCurrentUser, logout, updateBalance, getBalance } as const
  }),
}) {}
