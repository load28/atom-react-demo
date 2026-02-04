# Effect TS & Effect-Atom 학습 가이드

## 학습 방향성

이 문서는 Effect TS와 effect-atom 라이브러리를 단계별로 학습하기 위한 가이드입니다.

### 학습 방식
1. **가장 작은 단위의 섹션**을 하나씩 제시
2. 사용자가 **이해하고 질문**
3. 이해가 완료되면 **문서에 추가**
4. **다음 섹션**으로 진행

### 학습 순서 (예정)

#### Part 1: Effect TS 기초
- [x] 섹션 1: Effect란 무엇인가?
- [x] 섹션 2: Effect.succeed / Effect.fail
- [x] 섹션 3: Effect.gen (제너레이터 문법)
- [x] 섹션 4: 에러 타입과 처리
- [ ] 섹션 5: Effect 실행하기 (runSync, runPromise)

#### Part 2: Effect TS 중급
- [ ] 섹션 6: Ref (뮤터블 상태)
- [ ] 섹션 7: Effect.Service (의존성 주입)
- [ ] 섹션 8: Layer 개념
- [ ] 섹션 9: Schema (타입 검증)
- [ ] 섹션 10: Data.TaggedError (커스텀 에러)

#### Part 3: Effect-Atom
- [ ] 섹션 11: Atom.make (기본 상태)
- [ ] 섹션 12: Derived Atoms (파생 상태)
- [ ] 섹션 13: Atom.runtime (Effect 통합)
- [ ] 섹션 14: React Hooks 연동

---

## 학습 내용

### 섹션 1: Effect란 무엇인가?

**Effect**는 "나중에 실행될 작업의 설명"입니다.

```typescript
import { Effect } from "effect"

// 이것은 "5를 반환하는 작업"의 설명일 뿐, 아직 실행되지 않음
const myEffect = Effect.succeed(5)
```

#### 비유
- 일반 함수: 레시피를 보고 **바로 요리**함
- Effect: **레시피만 작성**해둠 (요리는 나중에)

#### Effect의 타입 시그니처

```typescript
Effect<A, E, R>
```

| 타입 파라미터 | 의미 | 예시 |
|--------------|------|------|
| `A` | 성공 시 반환값 | `number`, `string` |
| `E` | 실패 시 에러 타입 | `Error`, `never` |
| `R` | 필요한 의존성 | `never` (없음), `SomeService` |

#### 예시

```typescript
// Effect<number, never, never>
// - 성공하면 number 반환
// - 에러 없음 (never)
// - 의존성 없음 (never)
const successEffect = Effect.succeed(42)
```

---

### 섹션 2: Effect.succeed / Effect.fail

#### Effect.succeed - 성공하는 Effect 만들기

```typescript
import { Effect } from "effect"

// 항상 성공하고 42를 반환하는 Effect
const success = Effect.succeed(42)
// 타입: Effect<number, never, never>
```

- `never` 에러 = 절대 실패하지 않음

#### Effect.fail - 실패하는 Effect 만들기

```typescript
// 항상 실패하고 "오류 발생"이라는 에러를 반환하는 Effect
const failure = Effect.fail("오류 발생")
// 타입: Effect<never, string, never>
```

- `never` 성공값 = 절대 성공하지 않음

#### 둘 다 "설명"일 뿐

```typescript
const success = Effect.succeed(42)   // 아직 42가 없음
const failure = Effect.fail("에러")   // 아직 에러 안 남

// 이 시점에서는 아무 일도 일어나지 않음
// "나중에 실행하면 이렇게 될 것이다"라는 설명만 있음
```

#### 다른 방법들

| 함수 | 용도 | 에러 처리 |
|------|------|----------|
| `succeed(value)` | 값을 바로 성공으로 | 없음 |
| `fail(error)` | 값을 바로 실패로 | 있음 |
| `sync(() => ...)` | 동기 함수 (throw 없음) | 없음 |
| `try({ try, catch })` | 동기 함수 (throw 가능) | catch로 변환 |
| `promise(() => ...)` | Promise (reject 없음) | 없음 |
| `tryPromise({ try, catch })` | Promise (reject 가능) | catch로 변환 |

```typescript
// Effect.sync - 동기 함수 감싸기
const effect1 = Effect.sync(() => {
  console.log("실행됨")
  return 42
})

// Effect.try - 예외가 발생할 수 있는 코드
const effect2 = Effect.try({
  try: () => JSON.parse('{"a": 1}'),
  catch: (error) => new Error("파싱 실패")
})

// Effect.tryPromise - 실패할 수 있는 Promise
const effect3 = Effect.tryPromise({
  try: () => fetch("/api/data"),
  catch: (error) => new Error("네트워크 오류")
})
```

---

### 섹션 3: Effect.gen (제너레이터 문법)

#### 문제: Effect를 연결하는 방법

```typescript
const getUser = Effect.succeed({ id: 1, name: "Kim" })
const getAge = Effect.succeed(25)

// 두 Effect의 결과를 합치고 싶다면?
```

#### Effect.gen - async/await와 비슷한 문법

```typescript
const program = Effect.gen(function* () {
  const user = yield* getUser    // Effect에서 값 꺼내기
  const age = yield* getAge      // 또 다른 Effect에서 값 꺼내기

  return `${user.name}는 ${age}살`  // 최종 결과
})
// 타입: Effect<string, never, never>
```

#### 비교: async/await vs Effect.gen

```typescript
// async/await
async function example() {
  const user = await getUser()
  const age = await getAge()
  return `${user.name}는 ${age}살`
}

// Effect.gen
const example = Effect.gen(function* () {
  const user = yield* getUser
  const age = yield* getAge
  return `${user.name}는 ${age}살`
})
```

| async/await | Effect.gen |
|-------------|------------|
| `async function` | `Effect.gen(function* () { ... })` |
| `await` | `yield*` |
| Promise 반환 | Effect 반환 |

#### 핵심 포인트

1. `yield*`는 Effect에서 **성공값을 꺼냄**
2. 중간에 실패하면 **전체가 실패**로 끝남
3. 아직 **실행된 게 아님** (여전히 설명일 뿐)

```typescript
const program = Effect.gen(function* () {
  const a = yield* Effect.succeed(10)
  const b = yield* Effect.fail("에러!")  // 여기서 멈춤
  const c = yield* Effect.succeed(20)    // 실행 안 됨
  return a + c
})
// 타입: Effect<number, string, never>
```

---

### 섹션 4: 에러 타입과 처리

#### Effect의 에러는 타입에 드러남

```typescript
const mayFail = Effect.gen(function* () {
  const value = yield* Effect.succeed(10)
  if (value < 20) {
    return yield* Effect.fail("너무 작음")
  }
  return value
})
// 타입: Effect<number, string, never>
//                      ^^^^^^ 에러 타입이 보임!
```

#### 에러 처리 방법 1: Effect.catchAll

모든 에러를 잡아서 **다른 Effect로 대체**

```typescript
const recovered = mayFail.pipe(
  Effect.catchAll((error) => Effect.succeed(0))  // 에러 시 0 반환
)
// 타입: Effect<number, never, never>
//                      ^^^^^ 에러가 사라짐
```

#### 에러 처리 방법 2: Effect.either

성공/실패를 **Either 타입**으로 변환

```typescript
import { Either } from "effect"

const program = Effect.gen(function* () {
  const result = yield* Effect.either(mayFail)

  if (Either.isLeft(result)) {
    console.log("에러:", result.left)
    return 0
  } else {
    console.log("성공:", result.right)
    return result.right
  }
})
// 타입: Effect<number, never, never>
```

#### 커스텀 에러 정의하기 (TaggedError)

```typescript
import { Data, Effect } from "effect"

// 에러 클래스 정의
class UserNotFound extends Data.TaggedError("UserNotFound")<{
  readonly userId: string
}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string
}> {}
```

#### 커스텀 에러 던지기

```typescript
const getUser = (id: string) => Effect.gen(function* () {
  if (id === "") {
    return yield* new UserNotFound({ userId: id })
  }
  if (Math.random() < 0.5) {
    return yield* new NetworkError({ message: "연결 실패" })
  }
  return { id, name: "Kim" }
})
// 타입: Effect<User, UserNotFound | NetworkError, never>
```

#### 에러 처리 방법 3: Effect.catchTag

특정 태그의 에러만 잡기

```typescript
const program = getUser("123").pipe(
  Effect.catchTag("UserNotFound", (e) => {
    console.log(`유저 ${e.userId}를 찾을 수 없음`)
    return Effect.succeed({ id: "default", name: "Guest" })
  })
)
// 타입: Effect<User, NetworkError, never>
//                    ^^^^^^^^^^^^ UserNotFound만 처리됨
```

#### 에러 처리 방법 4: Effect.catchTags

여러 에러 각각 처리

```typescript
const program = getUser("123").pipe(
  Effect.catchTags({
    UserNotFound: (e) => {
      console.log(`유저 ${e.userId} 없음`)
      return Effect.succeed({ id: "default", name: "Guest" })
    },
    NetworkError: (e) => {
      console.log(`네트워크 오류: ${e.message}`)
      return Effect.fail(new Error("재시도 필요"))  // 다른 에러로 변환
    }
  })
)
// 타입: Effect<User, Error, never>
```

#### 핵심 요약

| 방법 | 용도 |
|------|------|
| `catchAll` | 모든 에러를 잡아서 대체값 반환 |
| `either` | 에러를 값으로 변환 (분기 처리용) |
| `catchTag` | 특정 태그의 에러만 선택적으로 처리 |
| `catchTags` | 여러 태그 에러를 각각 처리 |

| 단계 | 코드 |
|------|------|
| 에러 정의 | `class MyError extends Data.TaggedError("MyError")<{ data }>` |
| 에러 던지기 | `yield* new MyError({ data })` |
| 특정 에러 잡기 | `Effect.catchTag("MyError", handler)` |
| 여러 에러 잡기 | `Effect.catchTags({ Error1: h1, Error2: h2 })` |

---

### 섹션 5: Effect 실행하기 (runSync, runPromise)

(학습 완료 후 추가 예정)

