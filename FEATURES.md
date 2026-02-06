# 신규 기능 구현 목록

> Effect + Atom 아키텍처의 강점을 극대화하는 기능들

## 구현 우선순위

| 순위 | 기능 | 아키텍처 활용도 | 상태 |
|------|------|---------------|------|
| **1** | 지정가/조건부 주문 시스템 | ★★★★★ | 🔧 구현 중 |
| **2** | 실시간 포트폴리오 리스크 대시보드 | ★★★★★ | ⏳ 대기 |
| **3** | 멀티 워치리스트 & 가격 알림 시스템 | ★★★★☆ | ⏳ 대기 |
| **4** | 거래 성과 분석 대시보드 | ★★★★☆ | ⏳ 대기 |
| **5** | 모의 마진 거래 (레버리지) | ★★★★★ | ⏳ 대기 |

---

## 1. 지정가/조건부 주문 시스템 (Limit & Stop Order)

### 개요
현재 시장가(market) 즉시 체결만 존재하는 구조에 지정가(limit), 손절(stop), 스탑리밋(stop-limit) 주문을 추가한다.
실시간 가격 피드(WebSocket)와 Atom 파생 상태를 결합하여 가격 조건 도달 시 자동 체결하는 매칭 엔진을 구현한다.

### 아키텍처 활용 포인트

| 계층 | 활용 패턴 | 설명 |
|------|----------|------|
| **Domain** | Branded Type, Schema | `LimitPrice`, `StopPrice` 브랜드 타입으로 가격 혼동 방지. 주문 확장 스키마 |
| **Domain** | Tagged Error | `OrderExpired`, `OrderAlreadyCancelled` 등 세분화된 에러 타입 |
| **Domain** | Pure Functions | 주문 매칭 조건 평가 함수 (가격 비교 로직) — 100% 단위 테스트 가능 |
| **Service** | Effect Service + DI | `OrderMatchingService`가 `TradingService`, `AuthService`에 의존 → Layer로 합성 |
| **Service** | Ref (상태관리) | 대기 주문 목록을 `Ref<HashMap>` 으로 관리 |
| **Atom** | 파생 상태 체인 | `priceMapAtom` 변경 → `orderMatchingAtom` 자동 평가 → 체결 시 `ordersAtom` 업데이트 |
| **Atom** | Action Atom + Effect | 주문 생성/취소를 Effect pipeline으로 선언적 처리 |
| **Component** | 순수 렌더러 | useState/useEffect 없이 atom만으로 UI 구성 |

### 구현 계층별 상세

#### Domain 확장
- `model.ts`: `OrderExecutionType` ("market" | "limit" | "stop" | "stop_limit") 추가
- `model.ts`: `Order` 스키마에 `executionType`, `limitPrice`, `stopPrice`, `expiresAt` 필드 추가
- `errors.ts`: `OrderExpired`, `OrderAlreadyCancelled` Tagged Error 추가
- `calculator.ts`: `shouldFillOrder(order, currentPrice)` 순수 매칭 함수 추가

#### Service 구현
- `order-matching-service.ts`: 대기 주문 관리 및 매칭 엔진
  - `placeLimitOrder()`: 지정가 주문 생성 → pending 상태로 Ref에 저장
  - `placeStopOrder()`: 스탑 주문 생성
  - `cancelOrder()`: 대기 주문 취소
  - `evaluateOrders(prices)`: 가격 맵을 받아 체결 조건 평가 → TradingService로 위임
  - `getPendingOrders()`: 대기 주문 목록 조회

#### Atom 구현
- `pending-orders.ts`:
  - `pendingOrdersAtom`: 대기 주문 상태
  - `placeLimitOrderAtom`: 지정가/스탑 주문 생성 액션
  - `cancelPendingOrderAtom`: 대기 주문 취소 액션
  - `orderMatchingAtom`: priceMapAtom 구독 → 자동 매칭 평가 (핵심!)

#### Component 구현
- `TradingPanel.tsx` 확장: 주문 유형 선택 (시장가/지정가/손절), 지정가격 입력 필드
- `PendingOrders.tsx` 신규: 대기 주문 목록 표시, 취소 버튼, 상태 배지

---

## 2. 실시간 포트폴리오 리스크 대시보드

### 개요
단순 P&L을 넘어 변동성(σ), 샤프 비율, 최대 낙폭(MDD), 종목별 비중 등 리스크 지표를 실시간 계산.

### 아키텍처 활용 포인트
- **Domain 순수 함수**: `calculator.ts`에 리스크 계산 함수 추가 → 테스트가 trivial
- **Atom 파생 체인**: `priceHistoryAtom → volatilityAtom → riskScoreAtom → alertAtom`
- **WebSocket 활용**: 가격 히스토리 축적 + 실시간 리스크 지표 재계산

---

## 3. 멀티 워치리스트 & 가격 알림 시스템

### 개요
사용자가 관심 종목을 그룹화하고, 조건 기반 알림(가격 도달, 변동률 초과 등)을 설정.

### 아키텍처 활용 포인트
- **Effect Service DI**: `AlertService`가 `StockFeedService`에 의존 → Layer 교체로 테스트
- **Atom finalizer**: 워치리스트별 WebSocket 구독 관리 → 삭제 시 자동 구독 해제
- **Branded Type**: `WatchlistId`, `AlertId` 등 ID 혼동 방지

---

## 4. 거래 성과 분석 대시보드

### 개요
전체 거래 기록을 분석하여 승률, 평균 수익/손실, 보유 기간 등 트레이딩 성과 시각화.

### 아키텍처 활용 포인트
- **Domain 순수 함수**: 통계 계산을 순수 함수로 구현 → 100% 단위 테스트 커버리지
- **Atom 파생 상태**: `ordersAtom → tradeStatsAtom → winRateAtom, avgReturnAtom`
- **Schema**: `TradeRecord` 스키마로 런타임 유효성 보장

---

## 5. 모의 마진 거래 (레버리지 시스템)

### 개요
레버리지를 걸어 매매하는 마진 트레이딩. 마진콜, 강제 청산 등 금융 도메인 시나리오 구현.

### 아키텍처 활용 포인트
- **Tagged Error 극대화**: `MarginCallTriggered`, `LiquidationExecuted`, `InsufficientMargin` 등
- **Effect pipeline**: 마진 비율 계산 → 유지 마진 확인 → 강제 청산의 체이닝
- **실시간 감시**: 가격 변동 시 마진 비율 파생 atom 자동 재계산
- **Integration Test**: 레버리지 매수 → 가격 하락 → 마진콜 → 강제청산 전체 플로우 테스트
