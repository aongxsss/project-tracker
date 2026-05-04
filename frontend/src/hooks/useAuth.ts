import { useState, useEffect, useCallback } from "react"

const API = import.meta.env.VITE_API_URL

async function errDetail(res: Response, fallback = "Request failed"): Promise<never> {
  const body = await res.json().catch(() => ({})) as { detail?: string }
  throw new Error(body.detail || fallback)
}

export interface AuthUser {
  id: string
  username: string
  display_name: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/auth/me`, { credentials: "include" })
      setUser(res.ok ? await res.json() : null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (username: string, password: string): Promise<void> => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ username, password }),
    })
    if (!res.ok) await errDetail(res)
    const full: AuthUser = await res.json()
    setUser(full)
  }

  const register = async (username: string, display_name: string, password: string): Promise<void> => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ username, display_name, password }),
    })
    if (!res.ok) await errDetail(res)
    const data: AuthUser = await res.json()
    setUser(data)
  }

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" })
    setUser(null)
  }

  return { user, loading, login, register, logout }
}
