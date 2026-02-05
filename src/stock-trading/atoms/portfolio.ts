import { Atom } from "@effect-atom/atom-react"
import * as Result from "@effect-atom/atom/Result"
import { Effect, Layer } from "effect"
import type { Holding } from "@/src/stock-trading/domain/model"
import { calculateTotalPnL } from "@/src/stock-trading/domain/calculator"
import { PortfolioService } from "@/src/stock-trading/services/portfolio-service"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import { currentUserAtom } from "./auth"
import { priceMapAtom } from "./stock"

const runtimeAtom = Atom.runtime(
  Layer.mergeAll(
    PortfolioService.Default,
    TradingService.Default,
    AuthService.Default,
  )
)

// 포트폴리오 요약 조회 — currentUserAtom, priceMapAtom 변경 시 자동 재실행
export const fetchPortfolioAtom = runtimeAtom.atom((get) =>
  Effect.gen(function* () {
    const user = get(currentUserAtom)
    if (!user) return null
    const prices = get(priceMapAtom)
    const portfolio = yield* PortfolioService
    return yield* portfolio.getPortfolioSummary(user.id, prices)
  })
)

// 보유 종목 — fetchPortfolioAtom 결과에서 파생
export const holdingsAtom = Atom.make((get) => {
  const result = get(fetchPortfolioAtom)
  const summary = Result.getOrElse(result, () => null)
  return summary?.holdings ?? ([] as ReadonlyArray<Holding>)
})

// 파생 상태: P&L 계산
export const portfolioPnLAtom = Atom.make((get) =>
  calculateTotalPnL(get(holdingsAtom), get(priceMapAtom))
)
