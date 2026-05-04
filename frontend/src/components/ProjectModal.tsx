import { useState, useEffect, useRef } from "react"
import { Project, ProjectInput, ConfigItem } from "../types"

interface Props {
  project: Project | null
  brands: ConfigItem[]
  statuses: ConfigItem[]
  clientStatuses: ConfigItem[]
  assignees: ConfigItem[]
  priorities: ConfigItem[]
  onSave: (data: ProjectInput) => Promise<void>
  onClose: () => void
}

const EMPTY = (
  brands: ConfigItem[],
  statuses: ConfigItem[],
  priorities: ConfigItem[],
): ProjectInput => ({
  brand: brands[0]?.name ?? "",
  customer_name: "",
  name: "",
  start_date: null,
  due_date: "",
  internal_status: statuses[0]?.name ?? "",
  client_status: statuses[0]?.name ?? "",
  assignee: "",
  priority: priorities[0]?.name ?? "",
  comment: "",
  description: "",
})

export function ProjectModal({ project, brands, statuses, clientStatuses, assignees, priorities, onSave, onClose }: Props) {
  const [form, setForm] = useState<ProjectInput>(
    project
      ? {
          brand: project.brand,
          customer_name: project.customer_name,
          name: project.name,
          start_date: project.start_date,
          due_date: project.due_date,
          internal_status: project.internal_status,
          client_status: project.client_status,
          assignee: project.assignee,
          priority: project.priority,
          comment: project.comment,
          description: project.description,
        }
      : EMPTY(brands, statuses, priorities)
  )
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectInput, string>>>({})
  const [saving, setSaving] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)
  // tracks if user explicitly chose a client status — if not, stay in sync with internal_status
  const clientStatusTouched = useRef(!!project)

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [onClose])

  useEffect(() => {
    if (!project) {
      setForm((prev) => {
        const newInternal = prev.internal_status || statuses[0]?.name || ""
        return {
          ...prev,
          brand: prev.brand || brands[0]?.name || "",
          internal_status: newInternal,
          client_status: clientStatusTouched.current ? prev.client_status : newInternal,
          priority: prev.priority || priorities[0]?.name || "",
        }
      })
    }
  }, [brands, statuses, priorities, project])

  const validate = (): boolean => {
    const e: Partial<Record<keyof ProjectInput, string>> = {}
    if (!form.customer_name.trim()) e.customer_name = "Customer name is required"
    if (!form.name.trim()) e.name = "Project name is required"
    if (!form.due_date) e.due_date = "Final date is required"
    if (!form.brand) e.brand = "Brand is required"
    if (!form.internal_status) e.internal_status = "Internal status is required"
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

  const err = (key: keyof ProjectInput) => errors[key] ? "#C0392B" : "#E8E6E0"

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      className="modal-backdrop"
    >
      <div
        className="modal-sheet"
        style={{ background: "#fff", width: "100%", maxWidth: 520, borderRadius: 16, padding: "28px 28px 32px", boxSizing: "border-box", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#1A1A1A" }}>
            {project ? "Edit Project" : "Add Project"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#999", minHeight: 44, minWidth: 44, lineHeight: 1 }} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Row 1: Brand + Priority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {field("Brand", (
              <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} style={{ ...selectStyle, borderColor: err("brand") }}>
                {brands.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
              </select>
            ), "brand")}
            {field("Priority", (
              priorities.length === 0
                ? <div style={{ fontSize: 12, color: "#C07D15", background: "#FFF8EC", borderRadius: 8, padding: "9px 12px", border: "1px solid #F0DDB0" }}>No priorities yet — add in <strong>Manage</strong></div>
                : <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ ...selectStyle, borderColor: err("priority") }}>
                    <option value="">— None —</option>
                    {priorities.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
            ))}
          </div>

          {/* Row 2: Internal Status + Client Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {field("Internal Status", (
              <select
                value={form.internal_status}
                onChange={(e) => {
                  const val = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    internal_status: val,
                    client_status: clientStatusTouched.current ? prev.client_status : val,
                  }))
                }}
                style={{ ...selectStyle, borderColor: err("internal_status") }}
              >
                {statuses.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            ), "internal_status")}
            {field("Client Status", (
              clientStatuses.length === 0
                ? <div style={{ fontSize: 12, color: "#C07D15", background: "#FFF8EC", borderRadius: 8, padding: "9px 12px", border: "1px solid #F0DDB0" }}>No client statuses yet — add in <strong>Manage</strong></div>
                : <select
                    value={form.client_status}
                    onChange={(e) => { clientStatusTouched.current = true; setForm({ ...form, client_status: e.target.value }) }}
                    style={{ ...selectStyle }}
                  >
                    <option value="">— None —</option>
                    {clientStatuses.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
            ))}
          </div>

          {/* Row 3: Assignee (full width) */}
          {field("Assignee", (
            assignees.length === 0
              ? <div style={{ fontSize: 12, color: "#C07D15", background: "#FFF8EC", borderRadius: 8, padding: "9px 12px", border: "1px solid #F0DDB0" }}>No assignees yet — add in <strong>Manage</strong></div>
              : <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} style={{ ...selectStyle }}>
                  <option value="">— Unassigned —</option>
                  {assignees.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select>
          ))}

          {/* Row 4: Customer Name */}
          {field("Customer Name", (
            <input
              type="text"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              placeholder="Enter customer name"
              style={{ ...inputStyle, borderColor: err("customer_name") }}
            />
          ), "customer_name")}

          {/* Row 5: Project Name */}
          {field("Project Name", (
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter project name"
              style={{ ...inputStyle, borderColor: err("name") }}
            />
          ), "name")}

          {/* Row 6: Start Date + Final Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {field("Start Date", (
              <input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
                style={{ ...inputStyle }}
              />
            ))}
            {field("Final Date", (
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                style={{ ...inputStyle, borderColor: err("due_date") }}
              />
            ), "due_date")}
          </div>

          {/* Row 7: Comment */}
          {field("Comment (optional)", (
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="Add a note…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
            />
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
