import { Atom } from "@effect-atom/atom-react"
import { Effect, Layer } from "effect"
import type { Holding, StockSymbol } from "@/src/stock-trading/domain/model"
import { calculateTotalPnL } from "@/src/stock-trading/domain/calculator"
import { PortfolioService } from "@/src/stock-trading/services/portfolio-service"
import { TradingService } from "@/src/stock-trading/services/trading-service"
import { StockService } from "@/src/stock-trading/services/stock-service"
import { AuthService } from "@/src/stock-trading/services/auth-service"
import { currentUserAtom } from "./auth"
import { priceMapAtom } from "./stock"

const runtimeAtom = Atom.runtime(
  Layer.mergeAll(
    PortfolioService.Default,
    TradingService.Default,
    StockService.Default,
    AuthService.Default,
  )
)

// 보유 종목 상태
export const holdingsAtom = Atom.make<ReadonlyArray<Holding>>([])

// 포트폴리오 요약 조회
export const fetchPortfolioAtom = runtimeAtom.fn((_: void, get) =>
  Effect.gen(function* () {
    const user = get(currentUserAtom)
    if (!user) return null
    const portfolio = yield* PortfolioService
    const summary = yield* portfolio.getPortfolioSummary(user.id)
    get.set(holdingsAtom, summary.holdings)
    return summary
  })
)

// 파생 상태: P&L 계산
export const portfolioPnLAtom = Atom.make((get) =>
  calculateTotalPnL(get(holdingsAtom), get(priceMapAtom))
)
