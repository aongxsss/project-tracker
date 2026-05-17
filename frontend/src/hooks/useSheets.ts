import { useState, useEffect, useCallback } from "react"
import { Sheet, SheetColumn, SheetRow, MergeRegion } from "../types"

const API = import.meta.env.VITE_API_URL
const CREDS: RequestInit = { credentials: "include" }

async function errDetail(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({})) as { detail?: string }
  throw new Error(body.detail || fallback)
}

interface SheetPatch {
  title?: string
  columns?: SheetColumn[]
  rows?: SheetRow[]
  merges?: MergeRegion[]
}

interface SheetCreatePayload {
  title?: string
  columns?: SheetColumn[]
  rows?: SheetRow[]
  merges?: MergeRegion[]
}

function uid() { return Math.random().toString(36).slice(2, 10) }

const DEFAULT_COL_COUNT = 8
const DEFAULT_ROW_COUNT = 20

export function useSheets(enabled = true) {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSheets = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/sheets`, CREDS)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSheets(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch sheets")
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { fetchSheets() }, [fetchSheets])

  const addSheet = async (titleOrPayload: string | SheetCreatePayload = "Untitled Sheet"): Promise<Sheet> => {
    const payload: SheetCreatePayload = typeof titleOrPayload === "string"
      ? { title: titleOrPayload }
      : titleOrPayload
    const title = payload.title ?? "Untitled Sheet"
    const columns: SheetColumn[] = payload.columns ?? Array.from({ length: DEFAULT_COL_COUNT }, (_, i) => ({ id: uid(), name: `Column ${i + 1}` }))
    const rows: SheetRow[] = payload.rows ?? Array.from({ length: DEFAULT_ROW_COUNT }, () => ({ id: uid(), cells: {} }))
    const merges: MergeRegion[] = payload.merges ?? []
    const res = await fetch(`${API}/api/sheets`, {
      ...CREDS, method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, columns, rows, merges }),
    })
    if (!res.ok) await errDetail(res, "Failed to create sheet")
    const created: Sheet = await res.json()
    setSheets((prev) => [...prev, created])
    return created
  }

  const updateSheet = async (id: string, patch: SheetPatch): Promise<void> => {
    setSheets((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s))
    const res = await fetch(`${API}/api/sheets/${id}`, {
      ...CREDS, method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      await fetchSheets()
      await errDetail(res, "Failed to update sheet")
    } else {
      const updated: Sheet = await res.json()
      setSheets((prev) => prev.map((s) => s.id === id ? updated : s))
    }
  }

  const deleteSheet = async (id: string): Promise<void> => {
    const prev = sheets
    setSheets((p) => p.filter((s) => s.id !== id))
    const res = await fetch(`${API}/api/sheets/${id}`, { ...CREDS, method: "DELETE" })
    if (!res.ok) {
      setSheets(prev)
      await errDetail(res, "Failed to delete sheet")
    }
  }

  return { sheets, loading, error, addSheet, updateSheet, deleteSheet }
}
