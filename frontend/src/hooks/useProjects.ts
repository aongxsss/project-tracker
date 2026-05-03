import { useState, useEffect, useCallback } from "react"
import { Project, ProjectInput } from "../types"

const API = import.meta.env.VITE_API_URL
const CREDS: RequestInit = { credentials: "include" }

export function useProjects(enabled = true) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/projects`, CREDS)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Project[] = await res.json()
      setProjects(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch projects")
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const addProject = async (data: ProjectInput): Promise<Project> => {
    const res = await fetch(`${API}/api/projects`, {
      ...CREDS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to create project")
    const created: Project = await res.json()
    setProjects((prev) => [created, ...prev])
    return created
  }

  const updateProject = async (id: string, data: ProjectInput): Promise<Project> => {
    const res = await fetch(`${API}/api/projects/${id}`, {
      ...CREDS,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to update project")
    const updated: Project = await res.json()
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }

  const deleteProject = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/api/projects/${id}`, { ...CREDS, method: "DELETE" })
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to delete project")
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  return { projects, loading, error, addProject, updateProject, deleteProject, refetch: fetchProjects }
}
