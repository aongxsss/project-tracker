import { useState, useEffect, useCallback } from "react"
import { ConfigItem } from "../types"

const API = import.meta.env.VITE_API_URL
const C: RequestInit = { credentials: "include" }
const J = { "Content-Type": "application/json" }

export function useConfig(enabled = true) {
  const [brands, setBrands] = useState<ConfigItem[]>([])
  const [statuses, setStatuses] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConfig = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const [b, s] = await Promise.all([
        fetch(`${API}/api/brands`, C).then((r) => r.ok ? r.json() : []),
        fetch(`${API}/api/statuses`, C).then((r) => r.ok ? r.json() : []),
      ])
      setBrands(b)
      setStatuses(s)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const updateBrand = async (name: string, color: string): Promise<void> => {
    const res = await fetch(`${API}/api/brands/${encodeURIComponent(name)}`, { ...C, method: "PATCH", headers: J, body: JSON.stringify({ color }) })
    if (!res.ok) throw new Error((await res.json()).detail)
    setBrands((prev) => prev.map((b) => (b.name === name ? { ...b, color } : b)))
  }

  const updateStatus = async (name: string, color: string): Promise<void> => {
    const res = await fetch(`${API}/api/statuses/${encodeURIComponent(name)}`, { ...C, method: "PATCH", headers: J, body: JSON.stringify({ color }) })
    if (!res.ok) throw new Error((await res.json()).detail)
    setStatuses((prev) => prev.map((s) => (s.name === name ? { ...s, color } : s)))
  }

  const addBrand = async (name: string, color: string): Promise<void> => {
    const res = await fetch(`${API}/api/brands`, { ...C, method: "POST", headers: J, body: JSON.stringify({ name, color }) })
    if (!res.ok) throw new Error((await res.json()).detail)
    const created: ConfigItem = await res.json()
    setBrands((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const deleteBrand = async (name: string, force = false): Promise<void> => {
    const url = `${API}/api/brands/${encodeURIComponent(name)}${force ? "?force=true" : ""}`
    const res = await fetch(url, { ...C, method: "DELETE" })
    if (!res.ok) throw new Error((await res.json()).detail)
    setBrands((prev) => prev.filter((b) => b.name !== name))
  }

  const addStatus = async (name: string, color: string): Promise<void> => {
    const res = await fetch(`${API}/api/statuses`, { ...C, method: "POST", headers: J, body: JSON.stringify({ name, color }) })
    if (!res.ok) throw new Error((await res.json()).detail)
    const created: ConfigItem = await res.json()
    setStatuses((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const deleteStatus = async (name: string): Promise<void> => {
    const res = await fetch(`${API}/api/statuses/${encodeURIComponent(name)}`, { ...C, method: "DELETE" })
    if (!res.ok) throw new Error((await res.json()).detail)
    setStatuses((prev) => prev.filter((s) => s.name !== name))
  }

  return { brands, statuses, loading, addBrand, updateBrand, deleteBrand, addStatus, updateStatus, deleteStatus }
}
