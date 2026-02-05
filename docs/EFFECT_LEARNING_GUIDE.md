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
- [x] 섹션 5: Effect 실행하기 (runSync, runPromise)

#### Part 2: Effect TS 중급
- [x] 섹션 6: Ref (뮤터블 상태)
- [x] 섹션 7: Effect.Service (의존성 주입)
- [x] 섹션 8: Layer 개념
- [x] 섹션 9: Schema (타입 검증)
- [ ] 섹션 10: Data.TaggedError (커스텀 에러)

#### Part 3: Effect TS 심화
- [x] 섹션 11: Fiber (동시성)
- [x] 섹션 12: Schedule (재시도/반복)
- [x] 섹션 13: Scope/Resource (리소스 관리)
- [x] 섹션 14: Stream (스트리밍)
- [x] 섹션 15: 실무 조합 패턴

#### Part 4: Effect-Atom
- [x] 섹션 16: Atom.make (기본 상태)
- [x] 섹션 17: Derived Atoms (파생 상태)
- [x] 섹션 18: Atom.runtime (Effect 통합)
- [x] 섹션 19: React Hooks 연동

#### Part 5: 함수형 아키텍처 & 실무 패턴
- [x] 섹션 20: 계층 분리 패턴 (Service → Atom → Component)
- [x] 섹션 21: AtomHttpApi (서버 상태 관리)
- [x] 섹션 22: 테스트 패턴 (Effect DI 활용)

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

#### 지금까지는 "설명"만 했음

```typescript
const program = Effect.gen(function* () {
  const a = yield* Effect.succeed(10)
  const b = yield* Effect.succeed(20)
  return a + b
})
// 아직 아무것도 실행 안 됨!
```

#### Effect.runSync - 동기 실행

```typescript
import { Effect } from "effect"

const result = Effect.runSync(program)
console.log(result)  // 30
```

- **즉시 실행**하고 결과 반환
- 비동기 작업이 있으면 **에러 발생**
- 에러가 발생하면 **throw**

#### Effect.runPromise - 비동기 실행

```typescript
const asyncProgram = Effect.gen(function* () {
  yield* Effect.sleep("1 second")  // 비동기 작업
  return 42
})

const result = await Effect.runPromise(asyncProgram)
console.log(result)  // 42
```

- **Promise 반환**
- 비동기 작업 지원
- 에러 발생 시 **reject**

#### Effect.runSyncExit / Effect.runPromiseExit

에러를 throw하지 않고 **Exit 타입**으로 받기

```typescript
import { Exit } from "effect"

const exit = Effect.runSyncExit(mayFail)

if (Exit.isSuccess(exit)) {
  console.log("성공:", exit.value)
} else {
  console.log("실패:", exit.cause)
}
```

#### 일반 실행 vs Exit 실행 비교

```typescript
// runSync - 에러가 throw됨
try {
  const result = Effect.runSync(mayFail)
} catch (e) {
  console.log("JS catch로 잡힘:", e)
}

// runSyncExit - 에러가 throw 안 됨
const exit = Effect.runSyncExit(mayFail)  // 절대 throw 안 함
if (Exit.isFailure(exit)) {
  console.log("명시적 처리:", exit.cause)
}
```

#### 실행 함수 요약

| 함수 | 반환 | 비동기 | 에러 처리 |
|------|------|--------|----------|
| `runSync` | `A` | X | throw |
| `runPromise` | `Promise<A>` | O | reject |
| `runSyncExit` | `Exit<A, E>` | X | Exit로 반환 |
| `runPromiseExit` | `Promise<Exit<A, E>>` | O | Exit로 반환 |

#### 주의: R (의존성)이 never가 아니면 실행 불가

```typescript
const needsService: Effect<number, never, SomeService> = ...

// 에러! SomeService가 제공되지 않음
Effect.runSync(needsService)

// 의존성을 먼저 제공해야 함
Effect.runSync(
  needsService.pipe(Effect.provide(SomeService.Default))
)
```

---

### 섹션 6: Ref (뮤터블 상태)

#### 문제: Effect 내에서 상태를 어떻게 관리?

```typescript
// 이렇게 하면 안 됨 (외부 변수 직접 변경)
let count = 0
const program = Effect.gen(function* () {
  count++  // 부수효과! Effect의 순수성 깨짐
  return count
})
```

#### Ref - Effect 친화적인 뮤터블 상태

```typescript
import { Effect, Ref } from "effect"

const program = Effect.gen(function* () {
  // Ref 생성 (초기값 0)
  const countRef = yield* Ref.make(0)

  // 값 읽기
  const current = yield* Ref.get(countRef)  // 0

  // 값 변경
  yield* Ref.set(countRef, 10)

  // 변경된 값 읽기
  const updated = yield* Ref.get(countRef)  // 10

  return updated
})
```

#### 주요 Ref 연산

```typescript
const program = Effect.gen(function* () {
  const ref = yield* Ref.make(0)

  // get: 현재 값 읽기
  const value = yield* Ref.get(ref)

  // set: 값 덮어쓰기
  yield* Ref.set(ref, 100)

  // update: 현재 값 기반으로 변경
  yield* Ref.update(ref, (n) => n + 1)  // 100 -> 101

  // modify: 변경하면서 결과도 반환
  const oldValue = yield* Ref.modify(ref, (n) => [n, n * 2])
  // oldValue = 101, ref는 이제 202

  return yield* Ref.get(ref)  // 202
})
```

#### Ref.modify 상세

```typescript
Ref.modify(ref, (현재값) => [반환할값, 새로저장할값])
```

```typescript
const ref = yield* Ref.make(100)

const result = yield* Ref.modify(ref, (current) => [
  `이전 값은 ${current}`,  // 반환할 값
  current * 2              // Ref에 저장할 새 값
])

console.log(result)              // "이전 값은 100"
console.log(yield* Ref.get(ref)) // 200
```

#### Ref 연산 요약

| 함수 | 역할 | 반환 |
|------|------|------|
| `Ref.make(초기값)` | Ref 생성 | `Effect<Ref<A>>` |
| `Ref.get(ref)` | 값 읽기 | `Effect<A>` |
| `Ref.set(ref, 값)` | 값 덮어쓰기 | `Effect<void>` |
| `Ref.update(ref, fn)` | 함수로 변경 | `Effect<void>` |
| `Ref.modify(ref, fn)` | 변경 + 결과 반환 | `Effect<B>` |

#### 왜 Ref를 사용하나?

1. **순수성 유지**: 상태 변경이 Effect 안에서 추적됨
2. **타입 안전**: Ref<number>는 number만 담을 수 있음
3. **동시성 안전**: 여러 fiber에서 안전하게 접근 가능

---

### 섹션 7: Effect.Service (의존성 주입)

#### 문제: 의존성을 어떻게 관리?

```typescript
// 직접 import하면 테스트하기 어려움
import { realDatabase } from "./database"

const getUser = (id: string) => Effect.gen(function* () {
  return realDatabase.findUser(id)  // 테스트 시 실제 DB 호출됨!
})
```

#### Effect.Service - 의존성을 타입으로 표현

```typescript
import { Effect, Context } from "effect"

// 서비스 정의 (Context.Tag 방식)
class Database extends Context.Tag("Database")<
  Database,
  {
    readonly findUser: (id: string) => Effect.Effect<User>
    readonly saveUser: (user: User) => Effect.Effect<void>
  }
>() {}
```

#### 서비스 사용하기

```typescript
const getUser = (id: string) => Effect.gen(function* () {
  const db = yield* Database  // 서비스 요청
  const user = yield* db.findUser(id)
  return user
})
// 타입: Effect<User, never, Database>
//                          ^^^^^^^^ 의존성이 타입에 표시됨!
```

#### 서비스 구현 제공하기

```typescript
// 실제 구현
const RealDatabase = Database.of({
  findUser: (id) => Effect.succeed({ id, name: "Kim" }),
  saveUser: (user) => Effect.succeed(undefined)
})

// 실행 시 구현 제공
const result = Effect.runSync(
  getUser("123").pipe(
    Effect.provideService(Database, RealDatabase)
  )
)
```

#### 테스트용 Mock 구현

```typescript
const MockDatabase = Database.of({
  findUser: (id) => Effect.succeed({ id, name: "TestUser" }),
  saveUser: (user) => Effect.succeed(undefined)
})

// 테스트에서 Mock 제공
const testResult = Effect.runSync(
  getUser("123").pipe(
    Effect.provideService(Database, MockDatabase)
  )
)
```

#### Effect.Service 클래스 방식 (더 간단)

```typescript
class Database extends Effect.Service<Database>()("Database", {
  succeed: {
    findUser: (id: string) => ({ id, name: "Kim" }),
    saveUser: (user: User) => undefined
  }
}) {}

// 사용
const program = Effect.gen(function* () {
  const db = yield* Database
  return db.findUser("123")
})

// 실행 (Default 자동 생성됨)
Effect.runSync(program.pipe(Effect.provide(Database.Default)))
```

#### 서비스 내부에 Ref 포함 (상태 공유)

```typescript
class CounterService extends Effect.Service<CounterService>()("CounterService", {
  effect: Effect.gen(function* () {
    const ref = yield* Ref.make(0)  // 서비스 초기화 시 생성

    return {
      increment: Ref.update(ref, (n) => n + 1),
      get: Ref.get(ref)
    }
  })
}) {}

// 여러 곳에서 같은 Ref 공유
const program = Effect.gen(function* () {
  const counter = yield* CounterService
  yield* counter.increment
  yield* counter.increment
  return yield* counter.get  // 2
})
```

#### 핵심 요약

| 개념 | 설명 |
|------|------|
| `Context.Tag` | 서비스 타입 정의 |
| `yield* ServiceTag` | 서비스 요청 (의존성 발생) |
| `Effect.provideService` | 구현 제공 |
| `Effect.Service` | 간편한 서비스 클래스 정의 |

---

### 섹션 8: Layer 개념

#### Layer = 서비스를 만드는 "레시피"

```typescript
import { Layer, Effect } from "effect"

// Layer<제공하는것, 에러, 필요한것>
// Layer<Out, Err, In>
```

#### 기본 Layer 만들기

```typescript
// 의존성 없는 Layer
const LoggerLayer = Layer.succeed(Logger, {
  log: (msg: string) => Effect.sync(() => console.log(msg))
})
// 타입: Layer<Logger, never, never>
//            ^^^^^^ Logger를 제공
//                         ^^^^^ 아무것도 필요 없음
```

#### 다른 서비스에 의존하는 Layer

```typescript
// Database는 Logger가 필요
const DatabaseLayer = Layer.effect(
  Database,
  Effect.gen(function* () {
    const logger = yield* Logger  // Logger 필요!

    return {
      findUser: (id: string) => Effect.gen(function* () {
        yield* logger.log(`Finding user: ${id}`)
        return { id, name: "Kim" }
      })
    }
  })
)
// 타입: Layer<Database, never, Logger>
//            ^^^^^^^^ Database 제공
//                              ^^^^^^ Logger 필요
```

#### Layer.provide - 의존성 주입

```typescript
const LoggerLayer: Layer<Logger, never, never>       // Logger 제공, 의존성 없음
const DatabaseLayer: Layer<Database, never, Logger>  // Database 제공, Logger 필요

const result = DatabaseLayer.pipe(
  Layer.provide(LoggerLayer)
)
// 결과: Layer<Database, never, never>
//       DatabaseLayer의 Logger 의존성이 해결됨
```

#### Layer.merge - 둘 다 제공

```typescript
const ConfigLayer = Layer.succeed(Config, { apiUrl: "..." })
const LoggerLayer = Layer.succeed(Logger, { ... })

// 둘 다 독립적으로 제공
const BaseLayer = Layer.merge(ConfigLayer, LoggerLayer)
// 타입: Layer<Config | Logger, never, never>
```

#### Layer.provideMerge - 주입 + 둘 다 제공

```typescript
const BothLayer = DatabaseLayer.pipe(
  Layer.provideMerge(LoggerLayer)
)
// 결과: Layer<Logger | Database, never, never>
//       Logger 주입 + Logger도 외부에 제공
```

#### Layer 사용하기

```typescript
const program = Effect.gen(function* () {
  const db = yield* Database
  return yield* db.findUser("123")
})

// Layer로 모든 의존성 제공
Effect.runPromise(
  program.pipe(Effect.provide(AppLayer))
)
```

#### Layer 합성 요약

| 함수 | 용도 |
|------|------|
| `Layer.succeed(Tag, impl)` | 간단한 Layer 생성 |
| `Layer.effect(Tag, effect)` | Effect로 Layer 생성 (의존성 가능) |
| `Layer.provide(inner)` | inner의 의존성 해결 (inner만 남음) |
| `Layer.merge(a, b)` | 두 Layer 병렬 합성 (둘 다 제공) |
| `Layer.provideMerge(inner)` | inner 의존성 해결 + inner도 제공 |

```
Logger (독립)
   ↓ provide
Database (Logger 필요)
   ↓ provide
UserService (Database 필요)
   ↓
AppLayer (모두 제공)
```

---

### 섹션 9: Schema (타입 검증)

#### 문제: 런타임에서 타입을 어떻게 검증?

```typescript
// TypeScript 타입은 컴파일 타임에만 존재
type User = { name: string; age: number }

// 런타임에 외부 데이터가 들어오면?
const data = JSON.parse(response)  // any 타입, 검증 안 됨
```

#### Schema - 타입 정의 + 런타임 검증

```typescript
import { Schema } from "effect"

// 스키마 정의 = 타입 + 검증 규칙
const User = Schema.Struct({
  name: Schema.String,
  age: Schema.Number
})

// 타입 추출
type User = typeof User.Type
// { name: string; age: number }
```

#### 데이터 검증하기

```typescript
// decode: unknown -> User (검증)
const result = Schema.decodeUnknownSync(User)({
  name: "Kim",
  age: 25
})
// 성공: { name: "Kim", age: 25 }

// 실패 시 에러 throw
Schema.decodeUnknownSync(User)({
  name: "Kim",
  age: "스물다섯"  // string이라 실패
})
// ParseError: Expected number, got string
```

#### Effect와 함께 사용

```typescript
const parseUser = Schema.decodeUnknown(User)
// 타입: (input: unknown) => Effect<User, ParseError>

const program = Effect.gen(function* () {
  const user = yield* parseUser(jsonData)
  return user.name
})
```

#### 유용한 Schema들

```typescript
// 기본 타입
Schema.String
Schema.Number
Schema.Boolean

// 제약 조건
Schema.NonEmptyString              // 빈 문자열 불가
Schema.Int                         // 정수만
Schema.Positive                    // 양수만
Schema.Int.pipe(Schema.between(0, 100))  // 0~100

// 선택적 필드
Schema.Struct({
  name: Schema.String,
  nickname: Schema.optional(Schema.String)
})

// 배열
Schema.Array(Schema.String)        // string[]

// 유니온
Schema.Union(Schema.String, Schema.Number)  // string | number

// 리터럴
Schema.Literal("admin", "user")    // "admin" | "user"
```

#### Brand 타입 (식별용 타입)

```typescript
const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

const TaskId = Schema.String.pipe(Schema.brand("TaskId"))
type TaskId = typeof TaskId.Type

// 컴파일 에러: UserId와 TaskId는 호환 안 됨
const userId: UserId = "123" as UserId
const taskId: TaskId = userId  // Error!
```

#### Brand 타입 활용

```typescript
// 함수 시그니처에 Brand 타입 사용
function getUser(userId: UserId) { ... }
function getTask(taskId: TaskId) { ... }

const userId = Schema.decodeUnknownSync(UserId)("user-123")
const taskId = Schema.decodeUnknownSync(TaskId)("task-456")

getUser(userId)  // OK
getUser(taskId)  // 컴파일 에러!
```

#### 핵심 요약

| 함수 | 용도 |
|------|------|
| `Schema.Struct({...})` | 객체 스키마 정의 |
| `Schema.decodeUnknownSync` | 동기 검증 (throw) |
| `Schema.decodeUnknown` | Effect로 검증 |
| `Schema.brand("Name")` | Brand 타입 생성 |
| `typeof Schema.Type` | 타입 추출 |

---

### 섹션 10: Data.TaggedError (커스텀 에러)

(섹션 4에서 다룸 - 생략)

---

### 섹션 11: Fiber (동시성)

#### Fiber란?

**Fiber = Effect 런타임에서 시뮬레이션된 경량 가상 스레드**

- JavaScript는 싱글 스레드지만 Effect는 이벤트 루프를 활용해 동시성 구현
- Effect 실행의 "핸들"로 작동
- 고유한 ID, 상태(Running/Suspended/Done) 보유

#### Effect.fork - Fiber 생성

```typescript
import { Effect, Fiber } from "effect"

const program = Effect.gen(function* () {
  // fiber 생성 (백그라운드에서 실행 시작)
  const fiberA = yield* Effect.fork(taskA)
  const fiberB = yield* Effect.fork(taskB)

  // 둘 다 병렬로 실행 중...

  // 결과 기다리기
  const a = yield* Fiber.join(fiberA)
  const b = yield* Fiber.join(fiberB)

  return a + b
})
```

#### Effect.all - 간편한 병렬 실행

```typescript
// 배열로 병렬 실행
const results = yield* Effect.all([taskA, taskB, taskC])
// results: [결과A, 결과B, 결과C]

// 객체로 병렬 실행
const { user, posts } = yield* Effect.all({
  user: fetchUser(id),
  posts: fetchPosts(id)
})
```

#### 동시성 옵션

```typescript
// 동시 실행 개수 제한
const results = yield* Effect.all(tasks, { concurrency: 3 })

// 무제한 병렬
const results = yield* Effect.all(tasks, { concurrency: "unbounded" })
```

#### Fiber.interrupt - 취소

```typescript
const program = Effect.gen(function* () {
  const fiber = yield* Effect.fork(longRunningTask)
  yield* Effect.sleep("1 second")
  yield* Fiber.interrupt(fiber)  // 취소!
})
```

#### Effect.timeout / Effect.race

```typescript
// 타임아웃
const withTimeout = fetchData.pipe(
  Effect.timeout("5 seconds")
)

// 경쟁 (먼저 끝나는 것만 사용)
const fastest = yield* Effect.race([
  fetchFromServerA,
  fetchFromServerB
])
```

#### Fiber 내부 동작 원리

1. **Effect는 데이터 구조**: 실행 계획(트리)일 뿐
2. **Fiber는 인터프리터**: Effect 트리를 순회하며 해석/실행
3. **런타임 루프**: 단계별로 명령어 실행
4. **협력적 양보**: 자원 독점 방지를 위해 일정 단위마다 양보
5. **비동기 처리**: Promise pending 시 Fiber 일시 중단, 재개

#### Fiber 요약

| 함수 | 용도 |
|------|------|
| `Effect.fork(effect)` | Fiber 생성 (백그라운드 실행) |
| `Fiber.join(fiber)` | Fiber 결과 대기 |
| `Fiber.interrupt(fiber)` | Fiber 취소 |
| `Effect.all([...])` | 병렬 실행 후 모든 결과 |
| `Effect.race([...])` | 가장 빠른 것만 |
| `Effect.timeout(duration)` | 타임아웃 설정 |

---

### 섹션 12: Schedule (재시도/반복)

#### Schedule이란?

**Schedule = 재시도/반복 정책을 정의하는 데이터 구조**

```typescript
import { Schedule, Effect } from "effect"
```

#### Effect.retry - 실패 시 재시도

```typescript
const unreliableApi = Effect.tryPromise({
  try: () => fetch("/api/data"),
  catch: () => new Error("네트워크 오류")
})

// 최대 3번 재시도
const withRetry = unreliableApi.pipe(
  Effect.retry(Schedule.recurs(3))
)
```

#### Effect.repeat - 성공 시 반복

```typescript
const pollData = Effect.tryPromise(() => fetch("/api/status"))

// 5번 반복
const repeated = pollData.pipe(
  Effect.repeat(Schedule.recurs(5))
)
```

#### 기본 Schedule들

```typescript
Schedule.recurs(3)          // 3번
Schedule.spaced("1 second") // 1초 간격
Schedule.exponential("1 second")  // 지수 백오프 (1초, 2초, 4초...)
Schedule.forever            // 영원히
Schedule.upTo("10 seconds") // 특정 시간까지
```

#### Schedule 조합

```typescript
// AND: 둘 다 만족해야 계속
Schedule.recurs(5).pipe(
  Schedule.intersect(Schedule.spaced("1 second"))
)
// → 최대 5번, 1초 간격

// OR: 둘 중 하나라도 만족하면 계속
Schedule.recurs(3).pipe(
  Schedule.union(Schedule.spaced("500 millis"))
)

// THEN: 첫 번째 끝나면 두 번째
Schedule.recurs(2).pipe(
  Schedule.andThen(Schedule.spaced("1 second").pipe(Schedule.recurs(3)))
)
// → 2번 즉시 → 3번 1초 간격
```

#### 지수 백오프 + 최대 횟수 (실무 패턴)

```typescript
const retryPolicy = Schedule.exponential("100 millis").pipe(
  Schedule.intersect(Schedule.recurs(5)),       // 최대 5번
  Schedule.intersect(Schedule.upTo("30 seconds")) // 최대 30초
)

const robust = unreliableApi.pipe(
  Effect.retry(retryPolicy)
)
// 100ms → 200ms → 400ms → 800ms → 1600ms
```

#### Schedule.whileInput - 조건부 재시도

```typescript
// 특정 에러일 때만 재시도
const retryOnNetwork = Schedule.recurs(3).pipe(
  Schedule.whileInput((error: Error) =>
    error.message.includes("network")
  )
)
```

#### Schedule 요약

| Schedule | 용도 |
|----------|------|
| `recurs(n)` | n번 |
| `spaced(duration)` | 고정 간격 |
| `exponential(base)` | 지수 백오프 |
| `forever` | 무한 |
| `upTo(duration)` | 최대 시간 |

| 조합 | 의미 |
|------|------|
| `intersect(a, b)` | a AND b |
| `union(a, b)` | a OR b |
| `andThen(a, b)` | a 후 b |

---

### 섹션 13: Scope/Resource (리소스 관리)

#### 문제: 리소스를 안전하게 정리하기

```typescript
// 문제: 에러 발생 시 파일이 닫히지 않음!
const file = openFile("data.txt")
const data = readFile(file)  // 여기서 에러 발생하면?
closeFile(file)              // 이 줄이 실행 안 됨!
```

#### Effect.acquireRelease - 획득과 해제 보장

```typescript
import { Effect } from "effect"

const withFile = Effect.acquireRelease(
  // acquire: 리소스 획득
  Effect.sync(() => openFile("data.txt")),

  // release: 항상 실행됨 (에러 발생해도!)
  (file) => Effect.sync(() => closeFile(file))
)
```

#### Effect.scoped - 스코프 내에서 사용

```typescript
const program = Effect.scoped(
  Effect.gen(function* () {
    const file = yield* withFile  // 파일 획득
    const data = yield* readFromFile(file)
    return data
  })
  // 여기서 자동으로 closeFile 호출!
)
```

#### 여러 리소스 관리

```typescript
const withDbAndFile = Effect.scoped(
  Effect.gen(function* () {
    const db = yield* acquireDbConnection
    const file = yield* acquireFileHandle

    const result = yield* doWork(db, file)

    return result
  })
  // 역순으로 해제: file 먼저, 그 다음 db
)
```

#### Effect.ensuring - 간단한 cleanup

```typescript
const program = doSomething.pipe(
  Effect.ensuring(
    Effect.sync(() => console.log("항상 실행됨"))
  )
)
```

#### 실무 예시: DB 트랜잭션

```typescript
const withTransaction = Effect.acquireRelease(
  // acquire: 트랜잭션 시작
  Effect.tryPromise(() => db.beginTransaction()),

  // release: exit 결과에 따라 commit 또는 rollback
  (tx, exit) =>
    Exit.isSuccess(exit)
      ? Effect.tryPromise(() => tx.commit())
      : Effect.tryPromise(() => tx.rollback())
)

const program = Effect.scoped(
  Effect.gen(function* () {
    const tx = yield* withTransaction
    yield* tx.query("INSERT INTO users ...")
    yield* tx.query("UPDATE accounts ...")
    return "완료"
  })
)
// 성공 → commit, 실패 → rollback
```

#### 흐름 정리

```
Effect.scoped 시작
    │
    ├─ acquire: 리소스 획득
    │
    ├─ 스코프 내 작업 실행
    │   └─ 에러 발생 가능
    │
    └─ release: (리소스, exit) => ...
        ├─ exit = Success → 정상 해제
        └─ exit = Failure → 에러 처리 후 해제
```

#### Scope 요약

| 함수 | 용도 |
|------|------|
| `Effect.acquireRelease(acquire, release)` | 리소스 획득/해제 정의 |
| `Effect.scoped(effect)` | 스코프 종료 시 자동 해제 |
| `Effect.ensuring(finalizer)` | 항상 실행되는 cleanup |
| `release(resource, exit)` | exit으로 성공/실패 여부 판단 |

---

### 섹션 14: Stream (스트리밍)

#### Stream이란?

**Stream = 여러 값을 시간에 걸쳐 방출하는 Effect**

| 비교 | 반환 값 |
|------|--------|
| `Effect<A>` | 값 1개 |
| `Stream<A>` | 값 0개 ~ 무한개 |

#### Stream 만들기

```typescript
import { Stream, Effect } from "effect"

Stream.make(1, 2, 3)                    // 고정 값들
Stream.fromIterable([1, 2, 3])          // 배열에서
Stream.range(1, 10)                     // 범위 1~10
Stream.repeat(Effect.succeed("hello"))  // 무한 반복
Stream.fromEffect(fetchUser(id))        // Effect에서
```

#### Stream 변환

```typescript
// map: 각 요소 변환
Stream.make(1, 2, 3).pipe(
  Stream.map((n) => n * 2)
)  // 2, 4, 6

// filter: 조건에 맞는 것만
Stream.make(1, 2, 3, 4).pipe(
  Stream.filter((n) => n % 2 === 0)
)  // 2, 4

// take: 앞에서 N개만
Stream.range(1, 100).pipe(
  Stream.take(3)
)  // 1, 2, 3

// flatMap: 각 요소를 Stream으로 확장
Stream.make(1, 2).pipe(
  Stream.flatMap((n) => Stream.make(n, n * 10))
)  // 1, 10, 2, 20
```

#### Stream 실행

```typescript
// 배열로 수집
const arr = await Effect.runPromise(
  Stream.make(1, 2, 3).pipe(Stream.runCollect)
)  // [1, 2, 3]

// forEach: 각 요소에 Effect 실행
await Effect.runPromise(
  Stream.make(1, 2, 3).pipe(
    Stream.runForEach((n) => Effect.log(`값: ${n}`))
  )
)

// 합계
const sum = await Effect.runPromise(
  Stream.make(1, 2, 3).pipe(
    Stream.runFold(0, (acc, n) => acc + n)
  )
)  // 6
```

#### 실무 예시: 페이지네이션 API

```typescript
const fetchAllUsers = Stream.paginateEffect(1, (page) =>
  Effect.gen(function* () {
    const response = yield* fetchUsers(page)

    if (response.users.length === 0) {
      return [response.users, Option.none()]  // 종료
    }
    return [response.users, Option.some(page + 1)]  // 다음 페이지
  })
).pipe(
  Stream.flatMap(Stream.fromIterable)  // 배열을 개별 요소로 펼침
)
```

**paginateEffect 반환값 형태:**
```typescript
[방출할 값, 다음 상태]
// Option.some(nextPage) → 계속
// Option.none() → 종료
```

**흐름:**
```
page=1 → [유저1,2,3] 방출 → Option.some(2)
page=2 → [유저4,5] 방출 → Option.some(3)
page=3 → [] 방출 → Option.none() → 종료
```

#### Stream 요약

| 생성 | 용도 |
|------|------|
| `Stream.make(1, 2, 3)` | 고정 값 |
| `Stream.fromIterable([...])` | 배열에서 |
| `Stream.fromEffect(effect)` | Effect에서 |
| `Stream.paginateEffect(init, fn)` | 페이지네이션 |

| 변환 | 용도 |
|------|------|
| `map(fn)` | 각 요소 변환 |
| `filter(pred)` | 필터링 |
| `take(n)` | 앞에서 N개 |
| `flatMap(fn)` | 확장 |

| 실행 | 용도 |
|------|------|
| `runCollect` | 배열로 수집 |
| `runForEach(fn)` | 각 요소 처리 |
| `runFold(init, fn)` | 접기 |

---

### 섹션 15: 실무 조합 패턴

#### 예시 1: API 클라이언트 (Service + Schema + Retry + Timeout)

```typescript
import { Effect, Schema, Schedule, Data } from "effect"

// 1. 에러 정의
class ApiError extends Data.TaggedError("ApiError")<{
  readonly status: number
  readonly message: string
}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly cause: unknown
}> {}

// 2. 응답 스키마
const UserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String
})
type User = typeof UserSchema.Type

// 3. API 서비스 정의
class ApiClient extends Effect.Service<ApiClient>()("ApiClient", {
  effect: Effect.gen(function* () {
    const baseUrl = "https://api.example.com"

    const request = <A>(
      path: string,
      schema: Schema.Schema<A>
    ): Effect.Effect<A, ApiError | NetworkError> =>
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: () => fetch(`${baseUrl}${path}`),
          catch: (e) => new NetworkError({ cause: e })
        })

        if (!response.ok) {
          return yield* new ApiError({
            status: response.status,
            message: `HTTP ${response.status}`
          })
        }

        const json = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: (e) => new NetworkError({ cause: e })
        })

        return yield* Schema.decodeUnknown(schema)(json).pipe(
          Effect.mapError(() => new ApiError({
            status: 422,
            message: "Invalid response schema"
          }))
        )
      })

    return { request }
  })
}) {}

// 4. 실제 사용: 재시도 + 타임아웃
const getUser = (id: string) =>
  Effect.gen(function* () {
    const api = yield* ApiClient
    return yield* api.request(`/users/${id}`, UserSchema)
  }).pipe(
    Effect.retry(
      Schedule.exponential("100 millis").pipe(
        Schedule.intersect(Schedule.recurs(3))
      )
    ),
    Effect.timeout("5 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new ApiError({ status: 408, message: "Timeout" }))
    )
  )
```

#### 예시 2: 배치 처리 (Stream + Concurrency + Resource)

```typescript
const processBatch = Effect.scoped(
  Effect.gen(function* () {
    const db = yield* acquireDbConnection

    const users = Stream.fromIterable(largeUserList)

    yield* users.pipe(
      Stream.grouped(100),  // 100개씩 묶기
      Stream.mapEffect(
        (batch) => db.insertMany(batch),
        { concurrency: 5 }  // 5개 청크 병렬
      ),
      Stream.runDrain
    )

    return "완료"
  })
)
```

#### 예시 3: 트랜잭션 + 에러 복구

```typescript
const transferMoney = (from: string, to: string, amount: number) =>
  Effect.scoped(
    Effect.gen(function* () {
      const tx = yield* withTransaction

      const fromAccount = yield* tx.query(`
        UPDATE accounts SET balance = balance - $1
        WHERE id = $2 RETURNING balance
      `, [amount, from])

      if (fromAccount.balance < 0) {
        return yield* new InsufficientFunds({ accountId: from })
      }

      yield* tx.query(`
        UPDATE accounts SET balance = balance + $1
        WHERE id = $2
      `, [amount, to])

      return { from, to, amount }
    })
  ).pipe(
    Effect.catchTag("InsufficientFunds", (e) =>
      Effect.succeed({ error: `잔액 부족: ${e.accountId}` })
    ),
    Effect.retry(Schedule.recurs(3))
  )
```

#### 예시 4: 병렬 API 호출 + 부분 실패 허용

```typescript
const fetchDashboardData = (userId: string) =>
  Effect.gen(function* () {
    const results = yield* Effect.all({
      user: getUser(userId).pipe(Effect.either),
      posts: getPosts(userId).pipe(Effect.either),
      notifications: getNotifications(userId).pipe(Effect.either)
    })

    return {
      user: Either.isRight(results.user) ? results.user.right : null,
      posts: Either.isRight(results.posts) ? results.posts.right : [],
      notifications: Either.isRight(results.notifications)
        ? results.notifications.right
        : []
    }
  })
```

#### 조합 패턴 요약

| 패턴 | 조합 |
|------|------|
| **안정적 API 호출** | Service + Schema + Retry + Timeout |
| **배치 처리** | Stream + grouped + concurrency |
| **트랜잭션** | acquireRelease + scoped + catchTag |
| **부분 실패 허용** | Effect.all + either |
| **의존성 주입** | Service + Layer + provide |

---

### 섹션 16: Atom.make (기본 상태)

#### Effect-Atom이란?

**Effect-Atom = Effect와 통합된 React 상태 관리 라이브러리**

- Jotai와 비슷한 atomic 상태 관리
- Effect의 서비스/에러 처리와 자연스럽게 연결

```typescript
import { Atom } from "@effect-atom/core"
```

#### Atom.make - 기본 상태 만들기

```typescript
// 단순 값 상태
const countAtom = Atom.make(0)

// 객체 상태
const userAtom = Atom.make<User | null>(null)

// 배열 상태
const todosAtom = Atom.make<Todo[]>([])
```

#### React에서 사용하기

```typescript
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"

function Counter() {
  // 읽기
  const count = useAtomValue(countAtom)

  // 쓰기 함수 얻기
  const setCount = useAtomSet(countAtom)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  )
}
```

#### useAtom - 읽기 + 쓰기 한번에

```typescript
import { useAtom } from "@effect-atom/atom-react/Hooks"

function Counter() {
  const [count, setCount] = useAtom(countAtom)

  return (
    <button onClick={() => setCount(count + 1)}>
      {count}
    </button>
  )
}
```

#### RegistryProvider 필요

```typescript
import { RegistryProvider } from "@effect-atom/atom-react"

function App() {
  return (
    <RegistryProvider>
      <Counter />
    </RegistryProvider>
  )
}
```

#### Atom 요약

| Hook | 용도 |
|------|------|
| `useAtomValue(atom)` | 값 읽기 |
| `useAtomSet(atom)` | 쓰기 함수 얻기 |
| `useAtom(atom)` | 읽기 + 쓰기 |

| 함수 | 용도 |
|------|------|
| `Atom.make(초기값)` | 기본 상태 Atom 생성 |

---

### 섹션 17: Derived Atoms (파생 상태)

#### Derived Atom이란?

**Derived Atom = 다른 Atom에서 계산된 읽기 전용 상태**

기존 Atom의 값을 기반으로 새로운 값을 자동으로 계산합니다.

#### 방법 1: Atom.make에 함수 전달

```typescript
import { Atom } from "@effect-atom/atom"

// 기본 Atom
const todosAtom = Atom.make<Todo[]>([])

// 파생 Atom: Atom.make에 함수를 전달하면 파생 Atom이 됨
const completedTodosAtom = Atom.make((get) => {
  const todos = get(todosAtom)
  return todos.filter(todo => todo.completed)
})

// 파생 Atom: 완료되지 않은 할일 개수
const remainingCountAtom = Atom.make((get) => {
  const todos = get(todosAtom)
  return todos.filter(todo => !todo.completed).length
})
```

#### 방법 2: Atom.map 사용

기존 Atom을 단순 변환할 때 사용합니다.

```typescript
const countAtom = Atom.make(0)

// Atom.map: 기존 Atom의 값을 변환
const doubleCountAtom = Atom.map(countAtom, (count) => count * 2)
const tripleCountAtom = Atom.map(countAtom, (count) => count * 3)

// pipe 스타일도 가능
const quadrupleCountAtom = countAtom.pipe(
  Atom.map((count) => count * 4)
)
```

#### 여러 Atom 조합하기

```typescript
const firstNameAtom = Atom.make("Kim")
const lastNameAtom = Atom.make("철수")

// 여러 Atom을 조합할 때는 Atom.make + 함수
const fullNameAtom = Atom.make((get) => {
  const firstName = get(firstNameAtom)
  const lastName = get(lastNameAtom)
  return `${lastName} ${firstName}`
})
// "철수 Kim"
```

#### React에서 사용

```typescript
function TodoStats() {
  // 파생 Atom도 동일하게 사용
  const remainingCount = useAtomValue(remainingCountAtom)
  const completedTodos = useAtomValue(completedTodosAtom)

  return (
    <div>
      <p>남은 할일: {remainingCount}개</p>
      <p>완료: {completedTodos.length}개</p>
    </div>
  )
}
```

#### 핵심 특징

1. **자동 업데이트**: 원본 Atom이 변경되면 파생 Atom도 자동 갱신
2. **읽기 전용**: 함수로 만든 Atom은 직접 수정 불가 (Writable이 아님)
3. **메모이제이션**: 의존 Atom이 바뀌지 않으면 재계산하지 않음

#### Derived Atom 요약

| 함수 | 용도 |
|------|------|
| `Atom.make((get) => ...)` | 여러 Atom 조합 가능한 파생 Atom |
| `Atom.map(atom, fn)` | 단일 Atom 값 변환 |
| `get(atom)` | Context에서 다른 Atom 값 읽기 |

---

### 섹션 18: Atom.runtime (Effect 통합)

#### Effect를 사용하는 Atom

**Effect나 Stream을 `Atom.make`에 전달하면 `Result` 타입을 반환합니다.**

```typescript
import { Atom } from "@effect-atom/atom"
import { Effect } from "effect"

// Effect를 직접 전달 → Atom<Result.Result<number, never>>
const countAtom = Atom.make(Effect.succeed(0))

// 함수 형태로 Effect 반환
const userIdAtom = Atom.make(1)

const userAtom = Atom.make((get) =>
  Effect.gen(function*() {
    const id = get(userIdAtom)
    const response = yield* Effect.tryPromise({
      try: () => fetch(`/api/users/${id}`).then(r => r.json()),
      catch: () => new Error("Failed to fetch")
    })
    return response as User
  })
)
// 타입: Atom<Result.Result<User, Error>>
```

#### Atom.make 오버로드 정리

```typescript
// 1. 원시값 → Writable<A> (읽기/쓰기 가능)
Atom.make(0)  // Writable<number>

// 2. 함수가 일반 값 반환 → Atom<A> (읽기 전용)
Atom.make((get) => get(a) + 1)  // Atom<number>

// 3. Effect 직접 전달 → Atom<Result<A, E>>
Atom.make(Effect.succeed(0))  // Atom<Result.Result<number, never>>

// 4. 함수가 Effect 반환 → Atom<Result<A, E>>
Atom.make((get) => Effect.gen(...))  // Atom<Result.Result<A, E>>

// 5. 함수가 Stream 반환 → Atom<Result<A, E>>
Atom.make((get) => Stream.make(...))  // Atom<Result.Result<A, E>>
```

#### Result 타입 처리

Effect Atom은 `Result` 타입을 반환합니다. 로딩/성공/실패 상태를 포함합니다.

```typescript
import { Result } from "@effect-atom/atom"

function UserProfile() {
  const result = useAtomValue(userAtom)

  // Result.builder로 상태별 UI 렌더링
  return Result.builder(result)
    .onInitial(() => <p>로딩 중...</p>)
    .onFailure((cause) => <p>에러 발생</p>)
    .onSuccess((user) => <p>안녕하세요, {user.name}님!</p>)
    .render()
}
```

#### 왜 동기 Effect도 Result인가?

Effect는 "지연 실행"이므로 동기든 비동기든 실행 라이프사이클이 있습니다:

```
컴포넌트 마운트 → Atom 구독 → Effect 실행 시작(Initial) → 완료(Success/Failure)
```

- **타입 일관성**: 동기/비동기 구분 없이 동일한 처리
- **안전한 리팩토링**: 나중에 동기 → 비동기로 바꿔도 타입 변경 없음
- **에러 처리**: 동기 Effect도 `Effect.fail`로 실패할 수 있음

#### Atom.runtime - 서비스 의존성 주입

Effect Service를 사용하려면 `Atom.runtime`으로 런타임을 생성합니다.

```typescript
import { Atom } from "@effect-atom/atom"
import { Effect, Layer } from "effect"

// 서비스 정의
class UsersService extends Effect.Service<UsersService>()("UsersService", {
  effect: Effect.gen(function*() {
    return {
      getAll: Effect.tryPromise(() =>
        fetch("/api/users").then(r => r.json())
      ),
      findById: (id: string) => Effect.tryPromise(() =>
        fetch(`/api/users/${id}`).then(r => r.json())
      )
    }
  })
}) {}

// Atom.runtime으로 런타임 생성
const runtimeAtom = Atom.runtime(UsersService.Default)

// runtimeAtom.atom()으로 서비스 사용하는 Atom 생성
const usersAtom = runtimeAtom.atom(
  Effect.gen(function*() {
    const users = yield* UsersService
    return yield* users.getAll
  })
)
```

#### Context에서 Result Atom 읽기

Effect 내에서 다른 Result Atom의 값을 읽으려면 `get.result()`를 사용합니다.

```typescript
const derivedAtom = Atom.make((get) =>
  Effect.gen(function*() {
    // get.result()로 Result Atom의 성공값 추출
    const user = yield* get.result(userAtom)
    return `${user.name}의 프로필`
  })
)
```

#### runtimeAtom.fn - 함수형 Atom (뮤테이션)

인자를 받아 Effect를 실행하는 Atom입니다.

```typescript
const createUserAtom = runtimeAtom.fn((name: string) =>
  Effect.gen(function*() {
    const users = yield* UsersService
    return yield* users.create(name)
  })
)

// React에서 사용
function CreateUser() {
  const createUser = useAtomSet(createUserAtom, { mode: "promiseExit" })

  const handleSubmit = async (name: string) => {
    const exit = await createUser(name)
    if (Exit.isSuccess(exit)) {
      console.log("생성됨:", exit.value)
    }
  }
}
```

#### 글로벌 Layer 추가

앱 전체에 공통 Layer를 추가할 수 있습니다.

```typescript
import { ConfigProvider, Layer } from "effect"

Atom.runtime.addGlobalLayer(
  Layer.setConfigProvider(ConfigProvider.fromJson(import.meta.env))
)
```

#### 섹션 18 요약

| 함수 | 용도 |
|------|------|
| `Atom.make(Effect)` | Effect Atom 생성 (Result 반환) |
| `Atom.runtime(Layer)` | 서비스 의존성 주입용 런타임 생성 |
| `runtimeAtom.atom(Effect)` | 런타임 내에서 Effect Atom 생성 |
| `runtimeAtom.fn(fn)` | 인자를 받는 함수형 Atom |
| `get.result(atom)` | Effect 내에서 Result Atom 값 추출 |
| `Result.builder()` | 로딩/성공/실패 상태별 UI 렌더링 |

---

### 섹션 19: React Hooks 연동

#### RegistryProvider (선택적)

**기본 Registry가 이미 있어서 Provider 없이도 동작합니다.**

```typescript
// Provider 없이 사용 가능 (기본 Registry 사용)
function App() {
  return <Counter />
}

// 커스텀 설정이 필요할 때만 Provider 사용
import { RegistryProvider } from "@effect-atom/atom-react"

function App() {
  return (
    <RegistryProvider
      initialValues={[[countAtom, 10]]}
      defaultIdleTTL={1000}
    >
      <Counter />
    </RegistryProvider>
  )
}
```

#### RegistryProvider Props

| Props | 타입 | 설명 |
|-------|------|------|
| `children` | `ReactNode` | 자식 컴포넌트 |
| `initialValues` | `Iterable<[Atom, any]>` | Atom 초기값 설정 |
| `defaultIdleTTL` | `number` | 구독 해제 후 리셋까지 대기 시간 (ms) |
| `scheduleTask` | `(f: () => void) => void` | 커스텀 스케줄러 |

#### TTL과 Atom 생명주기

```typescript
// 기본 동작: 구독자 없으면 TTL 후 리셋
const countAtom = Atom.make(0)

// keepAlive: 구독자 없어도 영구 유지
const persistentAtom = Atom.make(0).pipe(Atom.keepAlive)
```

| 설정 | 동작 |
|------|------|
| 기본 | 구독 해제 → TTL 후 리셋 |
| `keepAlive` | 영구 유지 |
| `defaultIdleTTL: 0` | 즉시 리셋 |

#### Provider 중첩 시 동작

중첩된 Provider는 **별도의 Registry 인스턴스**를 생성합니다.

```typescript
<RegistryProvider>  {/* Registry A */}
  <ComponentA />  {/* Registry A 사용 */}

  <RegistryProvider>  {/* Registry B */}
    <ComponentB />  {/* Registry B 사용 (상태 격리) */}
  </RegistryProvider>
</RegistryProvider>
```

#### useAtomValue - 값 읽기

```typescript
import { useAtomValue } from "@effect-atom/atom-react/Hooks"

// 기본 사용
const count = useAtomValue(countAtom)

// 변환 함수 포함
const doubled = useAtomValue(countAtom, (c) => c * 2)
```

#### useAtomSet - 값 쓰기

```typescript
import { useAtomSet } from "@effect-atom/atom-react/Hooks"

const setCount = useAtomSet(countAtom)

// 직접 값 설정
setCount(10)

// 이전 값 기반 업데이트
setCount((prev) => prev + 1)
```

#### useAtomSet mode 옵션

| mode | 반환 | 용도 |
|------|------|------|
| `"value"` (기본) | `void` | 일반적인 상태 업데이트 |
| `"promise"` | `Promise<A>` | 비동기 완료 대기 |
| `"promiseExit"` | `Promise<Exit<A, E>>` | 비동기 + 에러 처리 |

```typescript
// Promise 모드
const setPromise = useAtomSet(atom, { mode: "promise" })
const result = await setPromise(value)

// Exit 모드 (runtimeAtom.fn과 함께 사용)
const execute = useAtomSet(fnAtom, { mode: "promiseExit" })
const exit = await execute(args)
if (Exit.isSuccess(exit)) {
  console.log(exit.value)
}
```

#### useAtom - 읽기 + 쓰기

```typescript
import { useAtom } from "@effect-atom/atom-react/Hooks"

const [count, setCount] = useAtom(countAtom)

// mode 옵션도 사용 가능
const [value, setPromise] = useAtom(atom, { mode: "promise" })
```

#### 추가 훅들

| 훅 | 용도 |
|-----|------|
| `useAtomMount(atom)` | Atom 마운트 (구독 시작) |
| `useAtomRefresh(atom)` | Atom 새로고침 함수 반환 |
| `useAtomSubscribe(atom, callback)` | Atom 변경 구독 |
| `useAtomInitialValues(values)` | 초기값 설정 |

```typescript
// 새로고침 (Effect Atom 재실행)
const refresh = useAtomRefresh(userAtom)
<button onClick={refresh}>새로고침</button>

// 구독 (side effect용)
useAtomSubscribe(countAtom, (value) => {
  console.log("변경됨:", value)
})
```

#### 섹션 19 요약

| 훅 | 용도 |
|-----|------|
| `useAtomValue(atom)` | 값 읽기 |
| `useAtomSet(atom)` | 쓰기 함수 얻기 |
| `useAtom(atom)` | 읽기 + 쓰기 |
| `useAtomRefresh(atom)` | Effect Atom 재실행 |
| `useAtomSubscribe(atom, fn)` | 변경 구독 |

| 컴포넌트 | 용도 |
|---------|------|
| `RegistryProvider` | 커스텀 Registry 설정 (선택적) |

---

### 섹션 20: 계층 분리 패턴 (Service → Atom → Component)

#### 핵심 원칙

React 상태를 최소화하고, 비즈니스 로직을 React 바깥으로 분리합니다.

```
┌─────────────────────────────────────────┐
│        React Components                 │  ← UI만 (useAtomValue, useAtomSet)
├─────────────────────────────────────────┤
│           Atoms                         │  ← 반응형 상태 연결
├─────────────────────────────────────────┤
│        Effect Services                  │  ← 순수 비즈니스 로직
├─────────────────────────────────────────┤
│           Layers                        │  ← 의존성 조립
└─────────────────────────────────────────┘
```

#### 1단계: Service 정의 - 순수 비즈니스 로직

> 출처: Effect 공식 문서 - Context.Tag 기반 서비스 정의

```typescript
// services/UserService.ts
import { Effect, Context } from "effect"

class UserService extends Context.Tag("UserService")<
  UserService,
  {
    readonly getUser: (id: string) => Effect.Effect<User, UserNotFoundError>
    readonly createUser: (data: CreateUserInput) => Effect.Effect<User, ValidationError>
  }
>() {}
```

**핵심**: Service는 React와 완전히 독립적입니다. Effect만 반환하므로 단독 테스트 가능합니다.

#### 2단계: Layer 구현 - 실제 동작

> 출처: Effect 공식 문서 - Layer.succeed, Effect.provideService

```typescript
// services/UserServiceLive.ts
import { Layer } from "effect"

const UserServiceLive = Layer.succeed(UserService, {
  getUser: (id) => Effect.gen(function*() {
    const response = yield* Effect.tryPromise({
      try: () => fetch(`/api/users/${id}`).then(r => r.json()),
      catch: () => new UserNotFoundError({ id })
    })
    return yield* Schema.decodeUnknown(UserSchema)(response)
  }),
  createUser: (data) => Effect.gen(function*() {
    const validated = yield* Schema.decodeUnknown(CreateUserSchema)(data)
    return yield* Effect.tryPromise({
      try: () => fetch("/api/users", {
        method: "POST",
        body: JSON.stringify(validated)
      }).then(r => r.json()),
      catch: () => new ValidationError({ message: "생성 실패" })
    })
  })
})
```

#### 3단계: Atom 연결 - 반응형 상태

> 출처: effect-atom README - Atom.runtime, runtimeAtom.atom, runtimeAtom.fn

```typescript
// atoms/userAtoms.ts
import { Atom } from "@effect-atom/atom"

// 런타임 생성 (서비스 주입)
const runtimeAtom = Atom.runtime(UserServiceLive)

// UI 상태 (Writable)
const currentUserIdAtom = Atom.make<string | null>(null)

// 서버 데이터 (Effect Atom → Result 타입)
const userAtom = runtimeAtom.atom(
  Effect.gen(function*() {
    const userService = yield* UserService
    return yield* userService.getUser("123")
  })
)

// 뮤테이션 (runtimeAtom.fn)
const createUserAtom = runtimeAtom.fn((data: CreateUserInput) =>
  Effect.gen(function*() {
    const userService = yield* UserService
    return yield* userService.createUser(data)
  })
)
```

#### 4단계: Component - UI만 담당

> 출처: effect-atom README - useAtomValue, useAtomSet, Result.builder

```typescript
// components/UserProfile.tsx
import { Result, useAtomValue } from "@effect-atom/atom-react"

function UserProfile() {
  const result = useAtomValue(userAtom)

  return Result.builder(result)
    .onInitial(() => <Skeleton />)
    .onFailure((cause) => <ErrorMessage cause={cause} />)
    .onSuccess((user) => <UserCard user={user} />)
    .render()
}

// 순수 Presentational 컴포넌트 (props만 받음)
function UserCard({ user }: { user: User }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

#### Component 규칙

- `useState` 최소화 (폼 입력 같은 로컬 UI 상태만)
- 비즈니스 로직 없음
- Atom에서 읽고(`useAtomValue`), Atom에 쓰기(`useAtomSet`)만

#### 각 계층의 역할 요약

| 계층 | 역할 | React 의존 |
|------|------|-----------|
| Service | 비즈니스 로직 정의 (인터페이스) | X |
| Layer | 실제 구현 (API 호출 등) | X |
| Atom | 반응형 상태 + Service 연결 | X |
| Component | UI 렌더링만 | O |

---

### 섹션 21: AtomHttpApi (서버 상태 관리)

> 출처: effect-atom README의 AtomHttpApi 예제 (원문 그대로)

#### AtomHttpApi란?

**React Query/SWR과 유사한 역할**을 Effect 생태계 안에서 수행합니다.

- query: 데이터 조회 + 캐싱
- mutation: 데이터 변경 + 캐시 무효화
- reactivityKeys: 캐시 키 (React Query의 queryKey와 유사)

#### 1. API 정의 (@effect/platform)

```typescript
import {
  HttpApi, HttpApiEndpoint, HttpApiGroup
} from "@effect/platform"
import { Schema } from "effect"

class Api extends HttpApi.make("api").add(
  HttpApiGroup.make("counter").add(
    HttpApiEndpoint.get("count", "/count").addSuccess(Schema.Number)
  ).add(
    HttpApiEndpoint.post("increment", "/increment")
  )
) {}
```

#### 2. 클라이언트 생성 (AtomHttpApi.Tag)

```typescript
import {
  AtomHttpApi,
  Result,
  useAtomSet,
  useAtomValue
} from "@effect-atom/atom-react"
import { FetchHttpClient } from "@effect/platform"

class CountClient extends AtomHttpApi.Tag<CountClient>()("CountClient", {
  api: Api,
  httpClient: FetchHttpClient.layer,
  baseUrl: "http://localhost:3000"
}) {}
```

#### 3. Query + Mutation 사용

```typescript
function Counter() {
  // Query: reactivityKeys로 캐시 키 등록
  const count = useAtomValue(CountClient.query("counter", "count", {
    reactivityKeys: ["count"]
  }))

  // Mutation
  const increment = useAtomSet(CountClient.mutation("counter", "increment"))

  return (
    <div>
      <p>Count: {Result.getOrElse(count, () => 0)}</p>
      <button
        onClick={() =>
          increment({
            payload: void 0,
            reactivityKeys: ["count"]  // mutation 완료 시 "count" 키 무효화
          })}
      >
        Increment
      </button>
    </div>
  )
}
```

#### 동작 흐름

```
1. query("counter", "count", { reactivityKeys: ["count"] })
   → API 호출 → 결과를 Result로 반환 → "count" 키에 등록

2. mutation("counter", "increment") 실행
   → API 호출 → 완료 후 reactivityKeys: ["count"] 무효화

3. "count" 키가 무효화됨
   → query가 자동으로 다시 실행 → UI 갱신
```

#### query 옵션 (소스 확인됨)

| 옵션 | 타입 | 용도 |
|------|------|------|
| `reactivityKeys` | `ReadonlyArray<unknown>` | 캐시 무효화 키 |
| `timeToLive` | `Duration` | 캐시 TTL |
| `withResponse` | `boolean` | 응답 객체 포함 여부 |

#### Atom.withReactivity (소스 확인됨)

AtomHttpApi 없이 일반 Atom에도 반응성을 추가할 수 있습니다.

```typescript
// 소스 시그니처:
// withReactivity(keys: ReadonlyArray<unknown> | ReadonlyRecord<...>)

const myAtom = runtimeAtom.atom(
  Effect.gen(function*() { ... })
).pipe(
  Atom.withReactivity(["count"])
)
```

#### Atom.family (소스 확인됨)

동일 인자에 대해 같은 Atom 인스턴스를 반환합니다. (WeakRef 기반 캐싱)

> 출처: effect-atom README + Atom.ts 소스

```typescript
// README 예제
const userAtom = Atom.family((id: string) =>
  runtimeAtom.atom(
    Effect.gen(function*() {
      const users = yield* Users
      return yield* users.findById(id)
    })
  )
)

// 같은 id → 같은 인스턴스 반환
const atom1 = userAtom("user-1")  // 새 인스턴스
const atom2 = userAtom("user-1")  // 동일 인스턴스 (atom1 === atom2)
```

#### 섹션 21 요약

| API | 용도 | 출처 |
|-----|------|------|
| `AtomHttpApi.Tag` | HTTP 클라이언트 생성 | README |
| `.query(group, endpoint, opts)` | 데이터 조회 + 캐싱 | README |
| `.mutation(group, endpoint)` | 데이터 변경 | README |
| `reactivityKeys` | 캐시 무효화 키 | README + 소스 |
| `timeToLive` | 캐시 TTL | 소스 시그니처 |
| `Atom.withReactivity` | 일반 Atom 반응성 | 소스 시그니처 |
| `Atom.family` | 동적 Atom 캐싱 | README + 소스 |

---

### 섹션 22: 테스트 패턴 (Effect DI 활용)

#### 핵심: Service 분리 = 테스트 용이성

> 출처: Effect 공식 문서 - provideService로 Mock 주입

계층 분리의 가장 큰 이점은 **Service를 교체해서 테스트**할 수 있다는 것입니다.

#### 1. Service 테스트 (React 없이)

```typescript
// 테스트용 Mock 구현
const UserServiceTest = Layer.succeed(UserService, {
  getUser: (id) => Effect.succeed({ id, name: "TestUser", email: "test@test.com" }),
  createUser: (data) => Effect.succeed({ id: "new-1", ...data })
})

// Effect만 테스트 (React 불필요)
describe("UserService", () => {
  it("getUser", async () => {
    const program = Effect.gen(function*() {
      const service = yield* UserService
      return yield* service.getUser("123")
    })

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(UserServiceTest))
    )

    expect(result.name).toBe("TestUser")
  })
})
```

#### 2. 에러 케이스 테스트

```typescript
const UserServiceFailing = Layer.succeed(UserService, {
  getUser: (id) => new UserNotFoundError({ id }),
  createUser: (data) => new ValidationError({ message: "invalid" })
})

it("getUser 실패 시 에러 반환", async () => {
  const program = Effect.gen(function*() {
    const service = yield* UserService
    return yield* service.getUser("없는유저")
  })

  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(UserServiceFailing))
  )

  expect(Exit.isFailure(exit)).toBe(true)
})
```

#### 3. 비즈니스 로직 조합 테스트

```typescript
// 여러 서비스를 조합한 로직
const transferMoney = (from: string, to: string, amount: number) =>
  Effect.gen(function*() {
    const accountService = yield* AccountService
    const notificationService = yield* NotificationService

    yield* accountService.withdraw(from, amount)
    yield* accountService.deposit(to, amount)
    yield* notificationService.send(to, `${amount}원 입금됨`)

    return { from, to, amount }
  })

// 테스트: 두 서비스 모두 Mock
const TestLayer = Layer.mergeAll(
  AccountServiceTest,
  NotificationServiceTest
)

it("이체 성공", async () => {
  const result = await Effect.runPromise(
    transferMoney("A", "B", 1000).pipe(
      Effect.provide(TestLayer)
    )
  )
  expect(result.amount).toBe(1000)
})
```

#### 4. Component는 얇게 유지

```typescript
// Component는 로직이 없으므로 테스트 부담이 작음
function TransferButton({ from, to, amount }: Props) {
  const transfer = useAtomSet(transferAtom, { mode: "promiseExit" })

  return (
    <button onClick={() => transfer({ from, to, amount })}>
      이체
    </button>
  )
}
// → 스냅샷 테스트나 간단한 렌더링 테스트로 충분
```

#### 테스트 전략 요약

| 계층 | 테스트 방법 | 난이도 |
|------|-----------|--------|
| **Service** | `Effect.provide(MockLayer)` → `Effect.runPromise` | 쉬움 |
| **Atom** | Registry 생성 후 Atom 구독 테스트 | 보통 |
| **Component** | 렌더링 + 스냅샷 (로직 없으므로 간단) | 쉬움 |

#### 왜 이 패턴이 효과적인가

```
기존 방식:
  Component (useState + useEffect + 로직 + UI)
  → 테스트하려면 React 렌더링 필요
  → Mock이 어려움
  → 결합도 높음

함수형 분리:
  Service (순수 Effect)    → React 없이 테스트
  Atom (상태 연결)         → Registry로 테스트
  Component (UI만)         → 간단한 렌더링 테스트
```

---

## 학습 완료

Effect TS와 Effect-Atom의 기본 개념부터 아키텍처 패턴까지 학습을 완료했습니다.

### 학습 흐름 요약

```
Part 1: Effect 기초
  Effect → succeed/fail → gen → 에러 처리 → 실행

Part 2: Effect 중급
  Ref → Service → Layer → Schema

Part 3: Effect 심화
  Fiber → Schedule → Scope → Stream → 실무 패턴

Part 4: Effect-Atom
  Atom.make → 파생 Atom → Effect 통합 → React Hooks

Part 5: 함수형 아키텍처
  계층 분리 → AtomHttpApi → 테스트 패턴
```

### 출처

- [Effect 공식 문서](https://effect.website/docs/requirements-management/services)
- [effect-atom GitHub README](https://github.com/tim-smart/effect-atom)
- [effect-atom 소스 코드](https://github.com/tim-smart/effect-atom/tree/main/packages/atom/src)

