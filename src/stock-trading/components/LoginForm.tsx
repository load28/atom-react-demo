"use client"

import { useAtomValue, useAtomSet } from "@effect-atom/atom-react/Hooks"
import { currentUserAtom, loginAtom, loginErrorAtom, logoutAtom } from "@/src/stock-trading/atoms/auth"

export const LoginForm = () => {
  const currentUser = useAtomValue(currentUserAtom)
  const login = useAtomSet(loginAtom)
  const logout = useAtomSet(logoutAtom)
  const error = useAtomValue(loginErrorAtom)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    login({
      username: formData.get("username") as string,
      password: formData.get("password") as string,
    })
  }

  if (currentUser) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">{currentUser.username}</span>
        <span className="text-sm font-semibold text-blue-600">₩{currentUser.balance.toLocaleString()}</span>
        <button
          onClick={() => logout()}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        name="username"
        placeholder="아이디"
        data-testid="username-input"
        className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <input
        type="password"
        name="password"
        placeholder="비밀번호"
        data-testid="password-input"
        className="w-28 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        type="submit"
        data-testid="login-button"
        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        로그인
      </button>
      {error && <p className="text-xs text-red-500" data-testid="login-error">{error}</p>}
    </form>
  )
}
