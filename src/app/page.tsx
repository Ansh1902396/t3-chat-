"use client"

import { useState } from "react"
import { ChatInterface } from "~/components/chat-interface"
import { LoginPage } from "~/components/login-page"

interface User {
  id: string
  name: string
  email: string
  avatar: string
  plan: string
  credits: number
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null)

  const handleLogin = (userData: User) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <ChatInterface user={user} onLogout={handleLogout} />
}
