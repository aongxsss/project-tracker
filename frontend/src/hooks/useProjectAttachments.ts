import { useState, useEffect, useCallback } from "react"
import { Attachment } from "../types"

const API = import.meta.env.VITE_API_URL
const CREDS: RequestInit = { credentials: "include" }

export function useProjectAttachments(projectId: string | null) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!projectId) { setAttachments([]); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/projects/${projectId}/attachments`, CREDS)
      if (res.ok) setAttachments(await res.json())
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { refetch() }, [refetch])

  const upload = async (file: File): Promise<Attachment> => {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch(`${API}/api/projects/${projectId}/attachments`, {
      ...CREDS,
      method: "POST",
      body: form,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { detail?: string }
      throw new Error(body.detail || "Upload failed")
    }
    const a: Attachment = await res.json()
    setAttachments((prev) => [a, ...prev])
    return a
  }

  const remove = async (attachmentId: string): Promise<void> => {
    await fetch(`${API}/api/projects/${projectId}/attachments/${attachmentId}`, { ...CREDS, method: "DELETE" })
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
  }

  const downloadUrl = (attachmentId: string) =>
    `${API}/api/projects/${projectId}/attachments/${attachmentId}/download`

  return { attachments, loading, upload, remove, downloadUrl, refetch }
}
