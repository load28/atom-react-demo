# Atom React Architecture

Effect + Atom 기반의 함수형 React 아키텍처 데모.
React Query, Form 라이브러리 없이 **컴포넌트는 순수 렌더링**, **비즈니스 로직과 상태는 컴포넌트 외부**에 선언한다.

## 설계 철학

### 변수와 상태를 최소화하고, Effect로 예측 가능한 흐름을 만든다

전통적인 React에서는 `useState`, `useEffect`, `useCallback`이 컴포넌트 안에 뒤섞인다.
상태 변경이 어디서 일어나는지 추적하기 어렵고, 의존성 배열 실수로 버그가 생기며, 비즈니스 로직이 컴포넌트에 강하게 결합된다.

이 아키텍처는 다른 접근을 취한다:

- **상태**는 컴포넌트 외부의 Atom으로 선언한다
- **비즈니스 로직**은 Effect 기반 Service로 분리한다
- **컴포넌트**는 Atom을 읽고(`useAtomValue`) 액션을 호출(`useAtomSet`)하는 **렌더링 함수**로만 동작한다
- **부수효과**는 `Effect.gen` 안에서 명시적으로 합성한다

결과적으로 모든 흐름이 **선언적이고 추적 가능**하며, **컴포넌트 없이도 비즈니스 로직을 TDD**할 수 있다.

## 프로젝트 구조

```
src/stock-trading/
├── domain/           # 순수 도메인 — 외부 의존성 없음
│   ├── model.ts      # Branded type + Schema (User, Stock, Order, Holding)
│   ├── calculator.ts # 순수 함수 (P&L 계산, 포트폴리오 밸류에이션)
│   └── errors.ts     # TaggedError (InsufficientBalance, InvalidCredentials, ...)
│
├── services/         # Effect 기반 비즈니스 로직 — React에 의존하지 않음
│   ├── auth-service.ts
│   ├── trading-service.ts
│   └── portfolio-service.ts
│
├── atoms/            # 상태 + 액션 선언 — 컴포넌트와 서비스를 연결하는 계층
│   ├── auth.ts       # 로그인 상태, 입력 아톰, 로그인/로그아웃 액션
│   ├── stock.ts      # HTTP 쿼리(자동 캐싱), 파생 상태(가격 변동, 가격 맵)
│   ├── trading.ts    # 매수/매도 액션, 주문 내역
│   └── portfolio.ts  # 포트폴리오 조회(자동 의존성 추적), P&L 파생
│
├── components/       # 순수 렌더링 — useState/useEffect 없음
│   ├── LoginForm.tsx
│   ├── StockList.tsx
│   ├── TradingPanel.tsx
│   └── PortfolioView.tsx
│
├── api.ts            # HttpApi 스키마 (엔드포인트 + 요청/응답 타입)
├── client.ts         # AtomHttpApi 클라이언트 설정
└── mocks/            # MSW 핸들러 (개발/테스트용 API 모킹)

__tests__/
├── unit/
│   ├── domain/       # 순수 함수 단위 테스트
│   └── services/     # Effect 서비스 단위 테스트
└── integration/      # 전체 플로우 통합 테스트
```

## 핵심 원칙

### 1. 컴포넌트는 렌더링만 한다

컴포넌트에는 세 가지 Hook만 사용한다:

| Hook | 역할 |
|------|------|
| `useAtomValue(atom)` | Atom 값 읽기 (구독) |
| `useAtomSet(atom)` | Atom 값 쓰기 또는 액션 호출 |
| `useAtomRefresh(atom)` | HTTP 쿼리 수동 리프레시 |

```tsx
// components/LoginForm.tsx — useState, useEffect, useCallback 없음
export const LoginForm = () => {
  const currentUser = useAtomValue(currentUserAtom)
  const login = useAtomSet(loginAtom)
  const error = useAtomValue(loginErrorAtom)
  const setUsername = useAtomSet(usernameInputAtom)
  const setPassword = useAtomSet(passwordInputAtom)

  if (currentUser) {
    return <div>{currentUser.username} <button onClick={() => logout()}>로그아웃</button></div>
  }

  return (
    <div>
      <input onChange={(e) => setUsername(e.target.value)} />
      <input onChange={(e) => setPassword(e.target.value)} />
      <button onClick={() => login()}>로그인</button>
      {error && <p>{error}</p>}
    </div>
  )
}
```

컴포넌트가 알고 있는 것: **무엇을 보여줄지, 어떤 Atom을 읽을지, 어떤 액션을 호출할지**. 그 외 아무것도 알지 않는다.

### 2. 상태는 Atom으로 컴포넌트 외부에 선언한다

```ts
// atoms/auth.ts

// 단순 상태 — useState를 대체
export const currentUserAtom = Atom.make<User | null>(null)
export const usernameInputAtom = Atom.make("")
export const passwordInputAtom = Atom.make("")
export const loginErrorAtom = Atom.make<string>("")
```

```ts
// atoms/stock.ts

// 파생 상태 — 의존하는 Atom이 바뀌면 자동 재계산
export const stocksWithChangeAtom = Atom.make((get) =>
  get(stockListAtom).map((stock) => ({
    ...stock,
    ...calculatePriceChange(stock),
  })),
)

// symbol → price 맵 — 다른 Atom에서 참조할 수 있는 파생 데이터
export const priceMapAtom = Atom.make((get) =>
  new Map(get(stockListAtom).map((s) => [s.symbol, s.price])),
)
```

Atom은 **전역적이고 구독 가능한 상태 단위**다. React 컴포넌트 트리에 종속되지 않으므로 어디서든 읽고 쓸 수 있고, 테스트에서도 독립적으로 검증할 수 있다.

### 3. 비즈니스 로직은 Effect Service로 분리한다

```ts
// services/trading-service.ts
export class TradingService extends Effect.Service<TradingService>()("TradingService", {
  effect: Effect.gen(function* () {
    const orders = yield* Ref.make(HashMap.empty<OrderId, Order>())
    const holdings = yield* Ref.make(HashMap.empty<string, Holding>())

    const placeBuyOrder = (userId: UserId, symbol: StockSymbol, quantity: number, currentPrice: number) =>
      Effect.gen(function* () {
        const authService = yield* AuthService          // DI: 타입으로 의존성 주입
        const balance = yield* authService.getBalance(userId)

        if (balance < currentPrice * quantity) {
          return yield* Effect.fail(new InsufficientBalance({ ... }))
        }

        yield* authService.updateBalance(userId, balance - currentPrice * quantity)
        // ... 주문 생성, 보유 수량 업데이트
        return order
      })

    return { placeBuyOrder, placeSellOrder, getOrders, getHoldings }
  }),
}) {}
```

Service의 특징:
- **React에 의존하지 않는다** — Hook도, 컴포넌트도, DOM도 없다
- **Effect.gen으로 합성한다** — 모든 부수효과가 명시적이고 순차적으로 읽힌다
- **yield\*로 의존성을 주입한다** — `yield* AuthService`는 런타임에 Layer가 주입한 인스턴스를 반환한다
- **에러가 타입 시그니처에 포함된다** — `Effect.fail(new InsufficientBalance(...))`은 예외가 아니라 값이다
- **Ref로 내부 상태를 관리한다** — 변경 가능한 상태도 Effect의 제어 하에 있다

### 4. Atom은 Service와 컴포넌트를 연결하는 다리다

```ts
// atoms/trading.ts

// Layer로 서비스 런타임 구성 — DI 컨테이너
const runtimeAtom = Atom.runtime(
  Layer.mergeAll(TradingService.Default, AuthService.Default)
)

// Effect 액션 Atom — 다른 Atom을 읽고, Service를 호출하고, 결과를 Atom에 쓴다
export const placeBuyOrderAtom = runtimeAtom.fn(
  (args: { symbol: StockSymbol; quantity: number }, get) =>
    Effect.gen(function* () {
      const user = get(currentUserAtom)             // Atom 읽기
      const prices = get(priceMapAtom)              // 파생 Atom 읽기
      const trading = yield* TradingService         // Service DI
      const order = yield* trading.placeBuyOrder(   // 비즈니스 로직 호출
        user.id, args.symbol, args.quantity, prices.get(args.symbol)!
      )
      get.set(ordersAtom, allOrders)                // Atom 쓰기
      return order
    })
)
```

이 구조에서 데이터 흐름은 단방향이다:

```
사용자 액션 → Atom 액션(Effect) → Service 로직 → Atom 상태 갱신 → 컴포넌트 리렌더
```

### 5. React Query 없이 HTTP 데이터 페칭

`AtomHttpApi`가 쿼리 캐싱, 자동 리프레시, 로딩/에러 상태를 제공한다:

```ts
// api.ts — 스키마로 엔드포인트 정의 (요청/응답 타입 자동 추론)
const StocksGroup = HttpApiGroup.make("stocks", { topLevel: true })
  .add(HttpApiEndpoint.get("getAll", "/api/stocks").addSuccess(Schema.Array(Stock)))
  .add(HttpApiEndpoint.put("updatePrice", "/api/stocks/:symbol/price")
    .setPath(Schema.Struct({ symbol: Schema.String }))
    .setPayload(Schema.Struct({ price: Schema.Number }))
    .addSuccess(Stock))

// atoms/stock.ts — 쿼리 Atom (구독 시 자동 fetch, TTL 30초 캐시)
export const fetchStocksAtom = StockApiClient.query("stocks", "getAll", {
  timeToLive: "30 seconds",
  reactivityKeys: stocksKey,        // mutation 실행 시 자동 리프레시
})

// mutation Atom (실행 후 reactivityKeys로 연결된 쿼리 자동 갱신)
export const updatePriceAtom = StockApiClient.mutation("stocks", "updatePrice")
```

컴포넌트에서는 `Result` 패턴매칭으로 상태를 분기한다:

```tsx
// components/StockList.tsx
const result = useAtomValue(fetchStocksAtom)

{Result.isInitial(result) && <p>로딩 중...</p>}
{Result.isFailure(result) && <p>에러</p>}
{Result.isSuccess(result) && <table>...</table>}
```

### 6. 폼 검증도 라이브러리 없이

폼 입력 → Atom 직접 바인딩, 검증은 Service 계층에서 수행, 에러는 Atom으로 전파:

```ts
// 입력 Atom
export const usernameInputAtom = Atom.make("")
export const passwordInputAtom = Atom.make("")
export const loginErrorAtom = Atom.make<string>("")

// 액션 Atom — 입력값을 읽고, 서비스 호출, 에러 시 errorAtom에 메시지 설정
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
```

React Hook Form이 하는 일(입력 추적, 유효성 검사, 에러 표시)을 **Atom + Effect 파이프라인**으로 대체한다.

### 7. 도메인 모델은 Branded Type + Schema로 안전하게

```ts
// domain/model.ts
export const UserId = Schema.NonEmptyString.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const Stock = Schema.Struct({
  symbol: StockSymbol,        // 빈 문자열 불가
  name: Schema.NonEmptyString,
  price: Schema.Positive,     // 0 이하 불가
  previousClose: Schema.Positive,
})
```

- **컴파일 타임**: `UserId`는 `string`과 호환되지 않는 별도 타입
- **런타임**: Schema가 API 응답을 자동 검증 (잘못된 데이터가 들어오면 디코딩 에러)
- **도메인 규칙이 타입에 인코딩됨**: `Schema.Positive`는 "가격은 0보다 커야 한다"를 표현

### 8. 에러는 예외가 아니라 값이다

```ts
// domain/errors.ts
export class InsufficientBalance extends Data.TaggedError("InsufficientBalance")<{
  readonly required: number
  readonly available: number
}> {}

export class InvalidCredentials extends Data.TaggedError("InvalidCredentials")<{
  readonly username: string
}> {}
```

`Effect.fail(new InsufficientBalance({...}))`는 throw가 아니다. 에러가 **Effect의 타입 시그니처에 포함**되므로, 컴파일러가 처리되지 않은 에러를 잡아준다. try-catch 없이도 에러 흐름이 명확하다.

## TDD: 컴포넌트 없이 비즈니스 로직을 테스트한다

이 아키텍처의 핵심 이점은 **React 없이 비즈니스 로직을 완전히 테스트**할 수 있다는 것이다.

### 순수 함수 테스트 — 입력과 출력만 검증

```ts
// __tests__/unit/domain/calculator.test.ts
it("should calculate positive P&L when price goes up", () => {
  const result = calculateHoldingPnL(holding("AAPL", 10, 100), 150)
  expect(result.unrealizedPnL).toBe(500)
  expect(result.pnlPercent).toBe(50)
})
```

### Service 테스트 — Effect.provide로 의존성 주입, 모킹 프레임워크 불필요

```ts
// __tests__/unit/services/auth-service.test.ts
const run = <A, E>(effect: Effect.Effect<A, E, AuthService>) =>
  Effect.runPromise(effect.pipe(Effect.provide(AuthService.Default)))

it("should login with valid credentials", async () => {
  const user = await run(
    Effect.gen(function* () {
      const auth = yield* AuthService
      return yield* auth.login("trader1", "password123")
    })
  )
  expect(user.username).toBe("trader1")
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
```

### 통합 테스트 — Layer.mergeAll로 서비스 조립, 전체 플로우 검증

```ts
// __tests__/integration/trading-flow.test.ts
const AppLayer = Layer.mergeAll(
  AuthService.Default,
  TradingService.Default,
  PortfolioService.Default,
)

it("should complete full buy flow and reflect in portfolio", async () => {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      const auth = yield* AuthService
      const user = yield* auth.login("trader1", "password123")
      const trading = yield* TradingService
      const order = yield* trading.placeBuyOrder(user.id, "AAPL", 10, 178.5)
      const portfolio = yield* PortfolioService
      const summary = yield* portfolio.getPortfolioSummary(user.id, STOCK_PRICES)
      return { order, summary }
    }).pipe(Effect.provide(AppLayer))
  )

  expect(result.order.status).toBe("filled")
  expect(result.summary.holdings[0].quantity).toBe(10)
})
```

테스트가 React를 import하지 않는다. 렌더링도, DOM도, 비동기 UI 대기도 없다.
**비즈니스 로직은 Effect 파이프라인 안에서 완결**되므로, 테스트도 Effect만으로 완결된다.

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                     React Components                        │
│              useAtomValue · useAtomSet · useAtomRefresh      │
│              (순수 렌더링, 로직 없음)                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
   ┌──────────▼──────────┐     ┌──────────▼──────────┐
   │   State Atoms       │     │   AtomHttpApi       │
   │   Atom.make(...)    │     │   .query(...)       │
   │   (단순/파생 상태)    │     │   .mutation(...)    │
   │                     │     │   (자동 캐싱/갱신)    │
   └──────────┬──────────┘     └──────────┬──────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   Action Atoms            │
              │   runtimeAtom.fn(...)     │
              │   runtimeAtom.atom(...)   │
              │   (Effect 합성, DI)        │
              └─────────────┬─────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   Effect Services         │
              │   Effect.Service(...)     │
              │   (비즈니스 로직, Ref 상태) │
              └─────────────┬─────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   Domain                  │
              │   Schema · Calculator     │
              │   TaggedError             │
              │   (순수, 의존성 없음)       │
              └───────────────────────────┘
```

데이터 흐름은 항상 **위에서 아래로** 요청하고, **아래에서 위로** 응답한다. 양방향 의존이 없다.

## 기술 스택

| 영역 | 기술 | 역할 |
|------|------|------|
| 프레임워크 | Next.js 16 (App Router) | 라우팅, SSR |
| UI | React 19 | 렌더링 |
| 상태 관리 | @effect-atom/atom-react | Atom + Effect 런타임 |
| 함수형 런타임 | Effect | 서비스, 에러 처리, DI, Ref |
| HTTP 스키마 | @effect/platform HttpApi | 엔드포인트 + 타입 정의 |
| API 모킹 | MSW 2 | 개발/테스트용 API 시뮬레이션 |
| 테스트 | Bun test + Testing Library | 단위/통합 테스트 |

## 시작하기

```bash
bun install
bun run dev         # 개발 서버
bun run build       # 프로덕션 빌드
bun test            # 테스트 실행
```
