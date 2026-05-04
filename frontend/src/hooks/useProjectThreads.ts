import { useState, useEffect, useCallback } from "react"
import { Thread } from "../types"

const API = import.meta.env.VITE_API_URL
const CREDS: RequestInit = { credentials: "include" }

export function useProjectThreads(projectId: string | null) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!projectId) { setThreads([]); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/threads`, CREDS)
      if (res.ok) setThreads(await res.json())
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { refetch() }, [refetch])

  const postThread = async (message: string): Promise<Thread> => {
    const res = await fetch(`${API}/api/projects/${projectId}/threads`, {
      ...CREDS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) throw new Error("Failed to post message")
    const t: Thread = await res.json()
    setThreads((prev) => [...prev, t])
    return t
  }

  const deleteThread = async (threadId: string): Promise<void> => {
    await fetch(`${API}/api/projects/${projectId}/threads/${threadId}`, { ...CREDS, method: "DELETE" })
    setThreads((prev) => prev.filter((t) => t.id !== threadId))
  }

  return { threads, loading, postThread, deleteThread, refetch }
}
