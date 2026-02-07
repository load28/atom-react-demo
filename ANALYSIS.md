# 프로젝트 분석 보고서: atom-react-demo

## 프로젝트 개요

Effect + Atom 기반의 모의 주식 트레이딩 시뮬레이션 애플리케이션.
Next.js 16 + React 19 위에서 전통적인 useState/useEffect 없이, Effect 서비스와 Atom 상태관리만으로 복잡한 실시간 트레이딩 앱을 구현.

### 기술 스택

- **프레임워크**: Next.js 16.1.5 + React 19.2.3
- **상태관리**: @effect-atom/atom-react 0.4.6
- **함수형 런타임**: Effect 3.19.15
- **스타일링**: Tailwind CSS 4
- **API 모킹**: MSW 2.12.8
- **테스트**: @testing-library/react + happy-dom

---

## 핵심 기능 분석: 실시간 주문 매칭 시스템

### 데이터 흐름

```
WebSocket 가격 업데이트
    ↓
livePricesAtom (실시간 구독)
    ↓
priceMapAtom (종목→가격 맵 파생)
    ↓
orderMatchingAtom (자동 주문 평가)
    ↓
조건 충족 시 → 주문 체결 + 알림 + 포트폴리오 갱신
```

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `src/stock-trading/atoms/pending-orders.ts:100-138` | 가격 변동 시 자동 매칭 |
| `src/stock-trading/services/order-matching-service.ts` | 주문 매칭 서비스 |
| `src/stock-trading/atoms/stock-feed.ts:15-40` | WebSocket 실시간 가격 수신 |
| `src/stock-trading/components/PendingOrders.tsx` | 대기 주문 UI |
| `src/stock-trading/components/TradingPanel.tsx` | 주문 입력 인터페이스 |

### 아키텍처 특징

1. **리액티브 체인**: WebSocket 가격 → Atom 파생 → 자동 주문 평가가 선언적으로 연결
2. **Effect 서비스 DI**: OrderMatchingService가 Layer를 통해 주입, 테스트 시 모의 객체로 교체 가능
3. **타입 안전 에러**: InsufficientBalance, OrderNotFound 등 브랜디드 에러 타입 사용

---

## 개선 필요 사항

### 높은 우선순위

#### 1. 접근성(a11y) 미비
- **위치**: LoginForm.tsx, StockList.tsx 등 전체 컴포넌트
- **문제**: `<input>`에 `<label>` 없음, 버튼에 `aria-label` 없음
- **해결**: 모든 폼 요소에 label 연결, 인터랙티브 요소에 aria 속성 추가

#### 2. `as any` 타입 단언
- **위치**: TradingPanel.tsx:54-66, WatchlistPanel.tsx:58-68
- **문제**: 에러 객체를 `as any`로 캐스팅하여 타입 안전성 파괴
- **해결**: Effect의 discriminated union 패턴 활용, 타입 가드 함수 작성

#### 3. ErrorBoundary 불완전
- **위치**: ErrorBoundary.tsx:14-16
- **문제**: `componentDidCatch` 누락으로 에러 로깅/모니터링 불가
- **해결**: componentDidCatch 구현 및 에러 리포팅 서비스 연결

#### 4. 컴포넌트 테스트 부재
- **위치**: `__tests__/` 디렉토리
- **문제**: 서비스/도메인 테스트는 있으나 React 컴포넌트 테스트 0건
- **해결**: @testing-library/react로 컴포넌트 테스트 추가, jest-axe로 접근성 테스트

### 중간 우선순위

#### 5. Toast 알림 접근성
- **위치**: ToastContainer.tsx
- **해결**: `role="status"`, `aria-live="polite"` 추가

#### 6. 빌드 타입체크 누락
- **위치**: package.json
- **해결**: build 스크립트에 `tsc --noEmit &&` 추가

#### 7. WebSocket 에러 무시
- **위치**: stock-feed.ts:89-95
- **해결**: JSON.parse 실패 시 에러 이벤트 발행 또는 로깅

#### 8. MSWProvider 깜빡임
- **위치**: MSWProvider.tsx:15
- **해결**: null 대신 로딩 스켈레톤 렌더링

#### 9. 숫자 입력 검증 부족
- **위치**: TradingPanel.tsx:165-207
- **해결**: min/max/step 속성 강화, 음수/소수점 방어 로직

#### 10. CSP 헤더 누락
- **위치**: next.config.ts
- **해결**: Content-Security-Policy 헤더 추가

### 낮은 우선순위

#### 11. React.memo() 미적용
- 실시간 가격 업데이트 시 불필요한 리렌더링 가능성

#### 12. Flash 타이머 확장성
- 종목 100개 이상 시 개별 setTimeout 성능 이슈 가능

#### 13. toLocaleString() 로케일 미지정
- 'ko-KR' 명시 필요

#### 14. console.warn() 프로덕션 노출
- 개발 환경 조건문 필요

#### 15. 0으로 나누기 위험
- calculator.ts:6 - averagePrice가 0일 때 NaN 발생 가능

---

## 요약

| 카테고리 | 건수 | 심각도 |
|----------|------|--------|
| 접근성 | 6건 | 높음/중간 |
| 타입 안전성 | 2건 | 중간 |
| 에러 핸들링 | 5건 | 낮음/중간 |
| 성능 | 3건 | 낮음 |
| 보안 | 4건 | 낮음 |
| 테스트 커버리지 | 2건 | 중간 |
| 빌드 설정 | 4건 | 낮음/중간 |
| **합계** | **26건** | |
