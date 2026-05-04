import { useState, useEffect, useCallback } from "react"
import { ConfigItem } from "../types"

const API = import.meta.env.VITE_API_URL
const C: RequestInit = { credentials: "include" }
const J = { "Content-Type": "application/json" }

async function errDetail(res: Response, fallback = "Request failed"): Promise<never> {
  const body = await res.json().catch(() => ({})) as { detail?: string }
  throw new Error(body.detail || fallback)
}

function useConfigSection(endpoint: string, enabled: boolean) {
  const [items, setItems] = useState<ConfigItem[]>([])

  const fetch_ = useCallback(async () => {
    if (!enabled) return
    const res = await fetch(`${API}${endpoint}`, C)
    setItems(res.ok ? await res.json() : [])
  }, [endpoint, enabled])

  const add = async (name: string, color: string): Promise<void> => {
    const res = await fetch(`${API}${endpoint}`, { ...C, method: "POST", headers: J, body: JSON.stringify({ name, color }) })
    if (!res.ok) await errDetail(res)
    const created: ConfigItem = await res.json()
    setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const update = async (name: string, color: string): Promise<void> => {
    const res = await fetch(`${API}${endpoint}/${encodeURIComponent(name)}`, { ...C, method: "PATCH", headers: J, body: JSON.stringify({ color }) })
    if (!res.ok) await errDetail(res)
    setItems((prev) => prev.map((item) => (item.name === name ? { ...item, color } : item)))
  }

  const remove = async (name: string, force = false): Promise<void> => {
    const url = `${API}${endpoint}/${encodeURIComponent(name)}${force ? "?force=true" : ""}`
    const res = await fetch(url, { ...C, method: "DELETE" })
    if (!res.ok) await errDetail(res)
    setItems((prev) => prev.filter((item) => item.name !== name))
  }

  return { items, setItems, fetch_, add, update, remove }
}

export function useConfig(enabled = true) {
  const [loading, setLoading] = useState(true)

  const brandsSection = useConfigSection("/api/brands", enabled)
  const statusesSection = useConfigSection("/api/statuses", enabled)
  const clientStatusesSection = useConfigSection("/api/client-statuses", enabled)
  const assigneesSection = useConfigSection("/api/assignees", enabled)
  const prioritiesSection = useConfigSection("/api/priorities", enabled)

  useEffect(() => {
    if (!enabled) return
    setLoading(true)
    Promise.all([
      brandsSection.fetch_(),
      statusesSection.fetch_(),
      clientStatusesSection.fetch_(),
      assigneesSection.fetch_(),
      prioritiesSection.fetch_(),
    ]).finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return {
    brands: brandsSection.items,
    statuses: statusesSection.items,
    clientStatuses: clientStatusesSection.items,
    assignees: assigneesSection.items,
    priorities: prioritiesSection.items,
    loading,
    addBrand: brandsSection.add,
    updateBrand: brandsSection.update,
    deleteBrand: brandsSection.remove,
    addStatus: statusesSection.add,
    updateStatus: statusesSection.update,
    deleteStatus: statusesSection.remove,
    addClientStatus: clientStatusesSection.add,
    updateClientStatus: clientStatusesSection.update,
    deleteClientStatus: clientStatusesSection.remove,
    addAssignee: assigneesSection.add,
    updateAssignee: assigneesSection.update,
    deleteAssignee: assigneesSection.remove,
    addPriority: prioritiesSection.add,
    updatePriority: prioritiesSection.update,
    deletePriority: prioritiesSection.remove,
  }
}
