"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import {
  currentUserAtom,
  loginAtom,
  loginErrorAtom,
  logoutAtom,
  usernameInputAtom,
  passwordInputAtom,
} from "@/src/stock-trading/atoms/auth"

export const LoginForm = () => {
  const currentUser = useAtomValue(currentUserAtom)
  const login = useAtomSet(loginAtom)
  const logout = useAtomSet(logoutAtom)
  const error = useAtomValue(loginErrorAtom)
  const username = useAtomValue(usernameInputAtom)
  const setUsername = useAtomSet(usernameInputAtom)
  const password = useAtomValue(passwordInputAtom)
  const setPassword = useAtomSet(passwordInputAtom)

  if (currentUser) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">{currentUser.username}</span>
        <span className="text-sm font-semibold text-blue-600">₩{currentUser.balance.toLocaleString("ko-KR")}</span>
        <button
          onClick={() => logout()}
          aria-label="로그아웃"
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); login() }}>
      <label htmlFor="login-username" className="sr-only">아이디</label>
      <input
        id="login-username"
        type="text"
        placeholder="아이디"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") login() }}
        data-testid="username-input"
        autoComplete="username"
        className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <label htmlFor="login-password" className="sr-only">비밀번호</label>
      <input
        id="login-password"
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") login() }}
        data-testid="password-input"
        autoComplete="current-password"
        className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        type="submit"
        data-testid="login-button"
        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        로그인
      </button>
      {error && <p className="text-xs text-red-500" role="alert" data-testid="login-error">{error}</p>}
    </form>
  )
}
