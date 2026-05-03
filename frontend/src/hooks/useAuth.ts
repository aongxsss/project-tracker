import { useState, useEffect, useCallback } from "react"

const API = import.meta.env.VITE_API_URL

export interface AuthUser {
  id: string
  username: string
  display_name: string
  notes: string
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
    if (!res.ok) throw new Error((await res.json()).detail)
    const me = await fetch(`${API}/api/auth/me`, { credentials: "include" })
    const full: AuthUser = await me.json()
    setUser(full)
  }

  const register = async (username: string, display_name: string, password: string): Promise<void> => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ username, display_name, password }),
    })
    if (!res.ok) throw new Error((await res.json()).detail)
    const data: AuthUser = await res.json()
    setUser(data)
  }

  const logout = async () => {
    await fetch(`${API}/api/auth/logout`, { method: "POST", credentials: "include" })
    setUser(null)
  }

  const saveNotes = async (notes: string): Promise<void> => {
    await fetch(`${API}/api/auth/notes`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ notes }),
    })
    setUser((u) => u ? { ...u, notes } : u)
  }

  return { user, loading, login, register, logout, saveNotes }
}
