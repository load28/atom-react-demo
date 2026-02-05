import { describe, it, expect } from "bun:test"
import { Effect, Exit } from "effect"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import type { UserId } from "@/src/stock-trading/domain/model"

// 가이드 섹션 22: Effect.provide(Layer) → Effect.runPromise 패턴
// AuthService.Default는 Ref 기반 인메모리 구현

describe("AuthService", () => {
  // 매 테스트마다 새 서비스 인스턴스 (Ref 초기화)
  const run = <A, E>(effect: Effect.Effect<A, E, AuthService>) =>
    Effect.runPromise(effect.pipe(Effect.provide(AuthService.Default)))

  const runExit = <A, E>(effect: Effect.Effect<A, E, AuthService>) =>
    Effect.runPromiseExit(effect.pipe(Effect.provide(AuthService.Default)))

  describe("login", () => {
    it("should login with valid credentials and return user", async () => {
      const user = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          return yield* auth.login("trader1", "password123")
        })
      )
      expect(user.username).toBe("trader1")
      expect(user.balance).toBeGreaterThan(0)
    })

    it("should fail with InvalidCredentials for wrong password", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const auth = yield* AuthService
          return yield* auth.login("trader1", "wrongpass")
        })
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })

    it("should fail with InvalidCredentials for unknown user", async () => {
      const exit = await runExit(
        Effect.gen(function* () {
          const auth = yield* AuthService
          return yield* auth.login("nonexistent", "password123")
        })
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("getCurrentUser", () => {
    it("should return null when not logged in", async () => {
      const user = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          return yield* auth.getCurrentUser()
        })
      )
      expect(user).toBeNull()
    })

    it("should return user after login", async () => {
      const user = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          yield* auth.login("trader1", "password123")
          return yield* auth.getCurrentUser()
        })
      )
      expect(user).not.toBeNull()
      expect(user!.username).toBe("trader1")
    })
  })

  describe("logout", () => {
    it("should clear current user", async () => {
      const user = await run(
        Effect.gen(function* () {
          const auth = yield* AuthService
          yield* auth.login("trader1", "password123")
          yield* auth.logout()
          return yield* auth.getCurrentUser()
        })
      )
      expect(user).toBeNull()
    })
  })
})
