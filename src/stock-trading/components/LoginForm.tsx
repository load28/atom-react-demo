"use client"

import { useState } from "react"
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { Exit } from "effect"
import { currentUserAtom, loginAtom, logoutAtom } from "@/src/stock-trading/atoms/auth"

export const LoginForm = () => {
  // 가이드 섹션 20: Component는 UI만 담당, useState는 로컬 폼 상태만
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const currentUser = useAtomValue(currentUserAtom)
  const login = useAtomSet(loginAtom, { mode: "promiseExit" })
  const logout = useAtomSet(logoutAtom)

  const handleLogin = async () => {
    setError("")
    const exit = await login({ username, password })
    if (Exit.isFailure(exit)) {
      setError("로그인 실패: 아이디 또는 비밀번호를 확인하세요")
    }
  }

  if (currentUser) {
    return (
      <div className="login-info">
        <span>{currentUser.username}</span>
        <span>₩{currentUser.balance.toLocaleString()}</span>
        <button onClick={() => logout()}>로그아웃</button>
      </div>
    )
  }

  return (
    <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleLogin() }}>
      <input
        type="text"
        placeholder="아이디"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        data-testid="username-input"
      />
      <input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        data-testid="password-input"
      />
      <button type="submit" data-testid="login-button">로그인</button>
      {error && <p className="error" data-testid="login-error">{error}</p>}
    </form>
  )
}
