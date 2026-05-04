import { useState, useEffect, useCallback } from "react"
import { Note, NoteInput, NotePatch } from "../types"

const API = import.meta.env.VITE_API_URL
const CREDS: RequestInit = { credentials: "include" }

async function errDetail(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({})) as { detail?: string }
  throw new Error(body.detail || fallback)
}

export function useNotes(enabled = true) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/notes`, CREDS)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Note[] = await res.json()
      setNotes(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch notes")
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const addNote = async (data: Partial<NoteInput> = {}): Promise<Note> => {
    const res = await fetch(`${API}/api/notes`, {
      ...CREDS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "", content: "", color: "#FFFFFF", pinned: false, ...data }),
    })
    if (!res.ok) await errDetail(res, "Failed to create note")
    const created: Note = await res.json()
    setNotes((prev) => [created, ...prev])
    return created
  }

  const updateNote = async (id: string, patch: NotePatch): Promise<void> => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
    const res = await fetch(`${API}/api/notes/${id}`, {
      ...CREDS,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      await fetchNotes()
      await errDetail(res, "Failed to update note")
    } else {
      const updated: Note = await res.json()
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)))
    }
  }

  const deleteNote = async (id: string): Promise<void> => {
    const prev = notes
    setNotes((p) => p.filter((n) => n.id !== id))
    const res = await fetch(`${API}/api/notes/${id}`, { ...CREDS, method: "DELETE" })
    if (!res.ok) {
      setNotes(prev)
      await errDetail(res, "Failed to delete note")
    }
  }

  const reorder = async (items: { id: string; position: number; pinned: boolean }[]): Promise<void> => {
    setNotes((prev) => {
      const map = new Map(items.map((i) => [i.id, i]))
      return [...prev]
        .map((n) => {
          const m = map.get(n.id)
          return m ? { ...n, position: m.position, pinned: m.pinned } : n
        })
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.position - b.position)
    })
    const res = await fetch(`${API}/api/notes/reorder/batch`, {
      ...CREDS,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) {
      await fetchNotes()
      await errDetail(res, "Failed to reorder notes")
    }
  }

  return { notes, loading, error, addNote, updateNote, deleteNote, reorder, refetch: fetchNotes }
}
