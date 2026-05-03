import { useState, useEffect, useRef } from "react"
import { Project, ProjectInput, ConfigItem } from "../types"

interface Props {
  project: Project | null
  brands: ConfigItem[]
  statuses: ConfigItem[]
  defaultAE?: string
  onSave: (data: ProjectInput) => Promise<void>
  onClose: () => void
}

const EMPTY = (brands: ConfigItem[], statuses: ConfigItem[], defaultAE = ""): ProjectInput => ({
  brand: brands[0]?.name ?? "",
  pm: defaultAE,
  name: "",
  due_date: "",
  status: statuses[0]?.name ?? "",
  comment: "",
})

export function ProjectModal({ project, brands, statuses, defaultAE = "", onSave, onClose }: Props) {
  const [form, setForm] = useState<ProjectInput>(
    project
      ? { brand: project.brand, pm: project.pm, name: project.name, due_date: project.due_date, status: project.status, comment: project.comment }
      : EMPTY(brands, statuses, defaultAE)
  )
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectInput, string>>>({})
  const [saving, setSaving] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [onClose])

  // Auto-set brand/status defaults once config loads
  useEffect(() => {
    if (!project) {
      setForm((prev) => ({
        ...prev,
        brand: prev.brand || brands[0]?.name || "",
        status: prev.status || statuses[0]?.name || "",
      }))
    }
  }, [brands, statuses, project])

  const validate = (): boolean => {
    const e: Partial<Record<keyof ProjectInput, string>> = {}
    if (!form.pm.trim()) e.pm = "AE is required"
    if (!form.name.trim()) e.name = "Project name is required"
    if (!form.due_date) e.due_date = "Due date is required"
    if (!form.brand) e.brand = "Brand is required"
    if (!form.status) e.status = "Status is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, children: React.ReactNode, errorKey?: keyof ProjectInput) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "#444" }}>{label}</label>
      {children}
      {errorKey && errors[errorKey] && (
        <span style={{ fontSize: 12, color: "#C0392B" }}>{errors[errorKey]}</span>
      )}
    </div>
  )

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    border: "1px solid #E8E6E0",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    background: "#fff",
    color: "#1A1A1A",
    boxSizing: "border-box",
    width: "100%",
    minHeight: 44,
  }

  const ARROW = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")"

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: "none",
    backgroundImage: ARROW,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "calc(100% - 12px) center",
    paddingRight: 36,
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      className="modal-backdrop"
    >
      <div
        className="modal-sheet"
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 480,
          borderRadius: 16,
          padding: "28px 28px 32px",
          boxSizing: "border-box",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#1A1A1A" }}>
            {project ? "Edit Task" : "Add Task"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#999", minHeight: 44, minWidth: 44, lineHeight: 1 }} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {field("Brand", (
              <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} style={{ ...selectStyle, borderColor: errors.brand ? "#C0392B" : "#E8E6E0" }}>
                {brands.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            ), "brand")}
            {field("Status", (
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...selectStyle, borderColor: errors.status ? "#C0392B" : "#E8E6E0" }}>
                {statuses.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            ), "status")}
          </div>

          {field("AE", (
            <input type="text" value={form.pm} onChange={(e) => setForm({ ...form, pm: e.target.value })} placeholder="Account Executive name" style={{ ...inputStyle, borderColor: errors.pm ? "#C0392B" : "#E8E6E0" }} />
          ), "pm")}

          {field("Task Name", (
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter task name" style={{ ...inputStyle, borderColor: errors.name ? "#C0392B" : "#E8E6E0" }} />
          ), "name")}

          {field("Due Date", (
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={{ ...inputStyle, borderColor: errors.due_date ? "#C0392B" : "#E8E6E0" }} />
          ), "due_date")}

          {field("Comment (optional)", (
            <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Add a note..." rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} />
          ))}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #E8E6E0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: "#555", minHeight: 44 }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: saving ? "#9E9AE8" : "#7F77DD", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500, minHeight: 44 }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
