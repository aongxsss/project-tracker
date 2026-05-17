import { useState, useEffect, useRef } from "react"
import { Project, ProjectInput, ConfigItem } from "../types"
import { BrandBadge } from "./BrandBadge"
import { StatusBadge } from "./StatusBadge"
import { ProjectModal } from "./ProjectModal"
import { ProjectDetail } from "./ProjectDetail"

type SortKey = "due_date" | "brand" | "priority" | "start_date"
type SortDir = "asc" | "desc"

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function isOverdue(due: string, status: string) {
  if (status === "Done") return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(due + "T00:00:00") < today
}

function daysDiff(due: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(due + "T00:00:00").getTime() - today.getTime()) / 86400000)
}

function daysLabel(due: string, status: string): { text: string; color: string } | null {
  if (status === "Done") return null
  const diff = daysDiff(due)
  if (diff === 0) return { text: "Today", color: "#C07D15" }
  if (diff > 0) return { text: `in ${diff}d`, color: diff <= 3 ? "#C07D15" : "#999" }
  return { text: `${Math.abs(diff)}d overdue`, color: "#C0392B" }
}

function toInput(p: Project): ProjectInput {
  return {
    brand: p.brand,
    customer_name: p.customer_name,
    name: p.name,
    start_date: p.start_date,
    due_date: p.due_date,
    internal_status: p.internal_status,
    client_status: p.client_status,
    assignee: p.assignee,
    priority: p.priority,
    comment: p.comment,
    description: p.description,
  }
}

// ──────── inline editors ────────

interface DropdownProps {
  current: string
  options: ConfigItem[]
  onSelect: (next: string) => Promise<void>
  children: React.ReactNode
  allowEmpty?: boolean
}

function BadgeDropdown({ current, options, onSelect, children, allowEmpty }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", handler)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", esc)
    }
  }, [open])

  const select = async (name: string) => {
    if (name === current) { setOpen(false); return }
    setSaving(true)
    try {
      await onSelect(name)
    } finally {
      setSaving(false)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        title="Click to change"
        style={{ background: "none", border: "none", padding: 0, cursor: saving ? "wait" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
      >
        {children}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 100,
            background: "#fff",
            border: "1px solid #E8E6E0",
            borderRadius: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
            padding: 4,
            minWidth: 160,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {allowEmpty && (
            <button
              type="button"
              onClick={() => select("")}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
                background: current === "" ? "#F5F4FA" : "none", border: "none", borderRadius: 6,
                cursor: "pointer", fontFamily: "inherit", fontSize: 13, textAlign: "left", color: "#888",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ddd", flexShrink: 0 }} />
              <span>— None</span>
            </button>
          )}
          {options.map((o) => (
            <button
              type="button"
              key={o.name}
              onClick={() => select(o.name)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
                background: current === o.name ? "#F5F4FA" : "none", border: "none", borderRadius: 6,
                cursor: "pointer", fontFamily: "inherit", fontSize: 13, textAlign: "left", color: "#1A1A1A",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: o.color, flexShrink: 0 }} />
              <span>{o.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface InlineDateProps {
  value: string | null
  required?: boolean
  onSave: (next: string | null) => Promise<void>
  children: React.ReactNode
}

function InlineDate({ value, required, onSave, children }: InlineDateProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const commit = async (next: string) => {
    const normalized = next || null
    if (required && !normalized) { setEditing(false); return }
    if (normalized === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(normalized) } finally { setSaving(false); setEditing(false) }
  }

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={value ?? ""}
        disabled={saving}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); setEditing(false) }
          if (e.key === "Enter") { e.preventDefault(); commit((e.target as HTMLInputElement).value) }
        }}
        onChange={(e) => commit(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        style={{
          padding: "4px 6px", border: "1px solid #7F77DD", borderRadius: 6,
          fontFamily: "inherit", fontSize: 13, background: "#fff", color: "#1A1A1A", outline: "none",
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      title="Click to change date"
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "inherit" }}
    >
      {children}
    </button>
  )
}

interface InlineTextProps {
  value: string
  onSave: (next: string) => Promise<void>
  placeholder?: string
  display: React.ReactNode
  width?: number | string
}

function InlineText({ value, onSave, placeholder, display, width }: InlineTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (editing) setDraft(value) }, [editing, value])

  const commit = async () => {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft) } finally { setSaving(false); setEditing(false) }
  }

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={draft}
        disabled={saving}
        placeholder={placeholder}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); setEditing(false) }
          if (e.key === "Enter") { e.preventDefault(); commit() }
        }}
        onBlur={commit}
        style={{
          width: width ?? "100%",
          padding: "4px 6px", border: "1px solid #7F77DD", borderRadius: 6,
          fontFamily: "inherit", fontSize: 13, background: "#fff", color: "#1A1A1A", outline: "none",
          boxSizing: "border-box",
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      title="Click to edit"
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "inherit", display: "block", width: "100%" }}
    >
      {display}
    </button>
  )
}

// ──────── Tracking ────────

interface Props {
  projects: Project[]
  totalCount: number
  brands: ConfigItem[]
  statuses: ConfigItem[]
  clientStatuses: ConfigItem[]
  assignees: ConfigItem[]
  priorities: ConfigItem[]
  onAdd: (data: ProjectInput) => Promise<void>
  onUpdate: (id: string, data: ProjectInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function Tracking({ projects, totalCount, brands, statuses, clientStatuses, assignees, priorities, onAdd, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "due_date", dir: "asc" })
  const [modalOpen, setModalOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [viewProjectId, setViewProjectId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const viewProject = viewProjectId ? projects.find((p) => p.id === viewProjectId) ?? null : null

  const bc = (name: string) => brands.find((b) => b.name === name)?.color ?? "#888888"
  const sc = (name: string) => statuses.find((s) => s.name === name)?.color ?? "#888888"
  const csc = (name: string) => clientStatuses.find((s) => s.name === name)?.color ?? "#888888"
  const pc = (name: string) => priorities.find((p) => p.name === name)?.color ?? "#888888"

  const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

  const patch = (p: Project, partial: Partial<ProjectInput>) => onUpdate(p.id, { ...toInput(p), ...partial })

  const filtered = projects
    .filter((p) => {
      if (statusFilter && p.internal_status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.customer_name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1
      if (sort.key === "due_date") return (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0) * dir
      if (sort.key === "start_date") {
        const as = a.start_date ?? ""
        const bs = b.start_date ?? ""
        return (as < bs ? -1 : as > bs ? 1 : 0) * dir
      }
      if (sort.key === "priority") {
        const ao = PRIORITY_ORDER[a.priority] ?? 99
        const bo = PRIORITY_ORDER[b.priority] ?? 99
        return (ao - bo) * dir
      }
      return a.brand.localeCompare(b.brand) * dir
    })

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }))

  const sortArrow = (key: SortKey) => {
    if (sort.key !== key) return <span style={{ color: "#ccc", marginLeft: 4 }}>↕</span>
    return <span style={{ color: "#7F77DD", marginLeft: 4 }}>{sort.dir === "asc" ? "↑" : "↓"}</span>
  }

  const handleSave = async (data: ProjectInput) => {
    if (editProject) await onUpdate(editProject.id, data)
    else await onAdd(data)
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    border: "1px solid #E8E6E0",
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    background: "#fff",
    color: "#1A1A1A",
    minHeight: 44,
    boxSizing: "border-box",
  }

  const ARROW = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")"

  return (
    <div className="page-content" style={{ padding: "32px 32px 48px", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", flex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "#1A1A1A" }}>Tracking</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#999" }}>{filtered.length} of {totalCount} projects</p>
      </div>

      {/* Controls */}
      <div className="tracking-controls" style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by project name, customer, or brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="tracking-search"
          style={{ ...inputStyle, minWidth: 260, flex: "1 1 260px" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputStyle, minWidth: 160, appearance: "none", backgroundImage: ARROW, backgroundRepeat: "no-repeat", backgroundPosition: "calc(100% - 12px) center", paddingRight: 36 }}
        >
          <option value="">All Status</option>
          {statuses.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <button
          className="add-project-btn"
          onClick={() => { setEditProject(null); setModalOpen(true) }}
          style={{ padding: "8px 18px", background: "#7F77DD", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", minHeight: 44 }}
        >
          + Add Project
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
          {projects.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#555", marginBottom: 6 }}>No projects yet</div>
              <div style={{ fontSize: 13 }}>Click '+ Add Project' to get started.</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#999" }}>No projects match your filters.</div>
          )}
        </div>
      ) : (
        <>
          {/* Desktop/Tablet table */}
          <div className="table-wrapper" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, overflow: "hidden" }}>
              <thead>
                <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E6E0" }}>
                  <th onClick={() => toggleSort("start_date")} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#666", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>Start Date {sortArrow("start_date")}</th>
                  <th onClick={() => toggleSort("due_date")} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#666", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>Final Date {sortArrow("due_date")}</th>
                  <th onClick={() => toggleSort("brand")} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#666", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>Brand {sortArrow("brand")}</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#666" }}>Customer</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#666" }}>Project Name</th>
                  <th onClick={() => toggleSort("priority")} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#666", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>Priority {sortArrow("priority")}</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#666", whiteSpace: "nowrap" }}>Int. Status</th>
                  <th className="comment-col" style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#666", whiteSpace: "nowrap" }}>Client Status</th>
                  <th className="comment-col" style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#666" }}>Comment</th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 500, color: "#666" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const overdue = isOverdue(p.due_date, p.internal_status)
                  return (
                    <tr key={p.id} className="table-row" style={{ borderBottom: "1px solid #F0EEE8" }}>
                      <td style={{ padding: "11px 14px", color: "#666", whiteSpace: "nowrap" }}>
                        <InlineDate
                          value={p.start_date}
                          onSave={(next) => patch(p, { start_date: next })}
                          children={<span style={{ color: p.start_date ? "#666" : "#bbb" }}>{formatDate(p.start_date)}</span>}
                        />
                      </td>
                      <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                        <InlineDate
                          value={p.due_date}
                          required
                          onSave={(next) => next ? patch(p, { due_date: next }) : Promise.resolve()}
                          children={
                            <>
                              <div style={{ color: overdue ? "#C0392B" : "#333", fontWeight: overdue ? 500 : 400 }}>{formatDate(p.due_date)}</div>
                              {(() => { const lbl = daysLabel(p.due_date, p.internal_status); return lbl ? <div style={{ fontSize: 11, color: lbl.color, marginTop: 1 }}>{lbl.text}</div> : null })()}
                            </>
                          }
                        />
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <BadgeDropdown
                          current={p.brand}
                          options={brands}
                          onSelect={(next) => patch(p, { brand: next })}
                        >
                          <BrandBadge brand={p.brand} color={bc(p.brand)} />
                        </BadgeDropdown>
                      </td>
                      <td style={{ padding: "11px 14px", color: "#333", maxWidth: 140 }}>
                        <InlineText
                          value={p.customer_name}
                          placeholder="Customer…"
                          onSave={(next) => next.trim() ? patch(p, { customer_name: next.trim() }) : Promise.resolve()}
                          display={
                            <span title={p.customer_name} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: p.customer_name ? "#333" : "#bbb" }}>
                              {p.customer_name || "—"}
                            </span>
                          }
                        />
                      </td>
                      <td style={{ padding: "11px 14px", maxWidth: 200 }}>
                        <InlineText
                          value={p.name}
                          placeholder="Project name…"
                          onSave={(next) => next.trim() ? patch(p, { name: next.trim() }) : Promise.resolve()}
                          display={
                            <span title={p.name} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1A1A1A" }}>{p.name}</span>
                          }
                        />
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <BadgeDropdown
                          current={p.priority}
                          options={priorities}
                          allowEmpty
                          onSelect={(next) => patch(p, { priority: next })}
                        >
                          {p.priority ? <StatusBadge status={p.priority} color={pc(p.priority)} /> : <span style={{ color: "#ccc" }}>—</span>}
                        </BadgeDropdown>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <BadgeDropdown
                          current={p.internal_status}
                          options={statuses}
                          onSelect={(next) => patch(p, { internal_status: next })}
                        >
                          <StatusBadge status={p.internal_status} color={sc(p.internal_status)} />
                        </BadgeDropdown>
                      </td>
                      <td className="comment-col" style={{ padding: "11px 14px" }}>
                        <BadgeDropdown
                          current={p.client_status}
                          options={clientStatuses}
                          allowEmpty
                          onSelect={(next) => patch(p, { client_status: next })}
                        >
                          {p.client_status ? <StatusBadge status={p.client_status} color={csc(p.client_status)} /> : <span style={{ color: "#ccc" }}>—</span>}
                        </BadgeDropdown>
                      </td>
                      <td className="comment-col" style={{ padding: "11px 14px", color: "#999", maxWidth: 160 }}>
                        <InlineText
                          value={p.comment}
                          placeholder="Add comment…"
                          onSave={(next) => patch(p, { comment: next })}
                          display={
                            <span title={p.comment || undefined} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: p.comment ? "#666" : "#bbb" }}>
                              {p.comment || "—"}
                            </span>
                          }
                        />
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ padding: "11px 14px" }}>
                        {confirmDeleteId === p.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 12, color: "#555" }}>Sure?</span>
                            <button onClick={async () => { await onDelete(p.id); setConfirmDeleteId(null) }} style={{ padding: "3px 10px", background: "#C0392B", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit", minHeight: 28 }}>Yes</button>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "3px 10px", background: "#F0EEE8", color: "#555", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit", minHeight: 28 }}>No</button>
                          </div>
                        ) : (
                          <div className="row-actions" style={{ display: "flex", gap: 6, opacity: 0, transition: "opacity 0.15s" }}>
                            <button onClick={() => setViewProjectId(p.id)} title="Open" style={{ padding: "5px 8px", border: "1px solid #E8E6E0", borderRadius: 6, background: "#fff", cursor: "pointer", minHeight: 32, minWidth: 32 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            </button>
                            <button onClick={() => { setEditProject(p); setModalOpen(true) }} title="Edit (full)" style={{ padding: "5px 8px", border: "1px solid #E8E6E0", borderRadius: 6, background: "#fff", cursor: "pointer", minHeight: 32, minWidth: 32 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                            <button onClick={() => setConfirmDeleteId(p.id)} title="Delete" style={{ padding: "5px 8px", border: "1px solid #F5D0CC", borderRadius: 6, background: "#fff", cursor: "pointer", minHeight: 32, minWidth: 32 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="mobile-cards" style={{ display: "none", flexDirection: "column", gap: 12 }}>
            {filtered.map((p) => {
              const overdue = isOverdue(p.due_date, p.internal_status)
              return (
                <div key={p.id} style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <BadgeDropdown current={p.brand} options={brands} onSelect={(next) => patch(p, { brand: next })}>
                      <BrandBadge brand={p.brand} color={bc(p.brand)} />
                    </BadgeDropdown>
                    <BadgeDropdown current={p.internal_status} options={statuses} onSelect={(next) => patch(p, { internal_status: next })}>
                      <StatusBadge status={p.internal_status} color={sc(p.internal_status)} />
                    </BadgeDropdown>
                    <BadgeDropdown current={p.priority} options={priorities} allowEmpty onSelect={(next) => patch(p, { priority: next })}>
                      {p.priority ? <StatusBadge status={p.priority} color={pc(p.priority)} /> : <span style={{ display: "inline-block", padding: "3px 10px", border: "1px dashed #ddd", borderRadius: 12, color: "#bbb", fontSize: 11 }}>+ Priority</span>}
                    </BadgeDropdown>
                    <BadgeDropdown current={p.client_status} options={clientStatuses} allowEmpty onSelect={(next) => patch(p, { client_status: next })}>
                      {p.client_status ? <StatusBadge status={p.client_status} color={csc(p.client_status)} /> : <span style={{ display: "inline-block", padding: "3px 10px", border: "1px dashed #ddd", borderRadius: 12, color: "#bbb", fontSize: 11 }}>+ Client</span>}
                    </BadgeDropdown>
                  </div>
                  <div style={{ marginBottom: 2 }}>
                    <InlineText
                      value={p.name}
                      placeholder="Project name…"
                      onSave={(next) => next.trim() ? patch(p, { name: next.trim() }) : Promise.resolve()}
                      display={
                        <span style={{ fontWeight: 500, fontSize: 14, color: "#1A1A1A", whiteSpace: "normal" }}>{p.name}</span>
                      }
                    />
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <InlineText
                      value={p.customer_name}
                      placeholder="Customer…"
                      onSave={(next) => next.trim() ? patch(p, { customer_name: next.trim() }) : Promise.resolve()}
                      display={
                        <span style={{ fontSize: 12, color: p.customer_name ? "#777" : "#bbb" }}>{p.customer_name || "+ Customer"}</span>
                      }
                    />
                  </div>
                  <div style={{ fontSize: 12, color: "#999", marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span>Start:</span>
                    <InlineDate
                      value={p.start_date}
                      onSave={(next) => patch(p, { start_date: next })}
                      children={<span style={{ color: p.start_date ? "#666" : "#bbb" }}>{formatDate(p.start_date)}</span>}
                    />
                    <span>· Final:</span>
                    <InlineDate
                      value={p.due_date}
                      required
                      onSave={(next) => next ? patch(p, { due_date: next }) : Promise.resolve()}
                      children={<span style={{ color: overdue ? "#C0392B" : "#999", fontWeight: overdue ? 500 : 400 }}>{formatDate(p.due_date)}</span>}
                    />
                    {(() => { const lbl = daysLabel(p.due_date, p.internal_status); return lbl ? <span style={{ color: lbl.color }}>· {lbl.text}</span> : null })()}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <InlineText
                      value={p.comment}
                      placeholder="Add comment…"
                      onSave={(next) => patch(p, { comment: next })}
                      display={
                        <span style={{ fontSize: 12, color: p.comment ? "#555" : "#bbb", fontStyle: p.comment ? "italic" : "normal" }}>
                          {p.comment || "+ Add comment"}
                        </span>
                      }
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setViewProjectId(p.id)} style={{ flex: 1, padding: "8px", border: "1px solid #E8E6E0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, minHeight: 44 }}>Open</button>
                    <button onClick={() => { setEditProject(p); setModalOpen(true) }} style={{ flex: 1, padding: "8px", border: "1px solid #E8E6E0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, minHeight: 44 }}>Edit</button>
                    <button onClick={() => setConfirmDeleteId(p.id)} style={{ flex: 1, padding: "8px", border: "1px solid #F5D0CC", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#C0392B", minHeight: 44 }}>Delete</button>
                  </div>
                  {confirmDeleteId === p.id && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={async () => { await onDelete(p.id); setConfirmDeleteId(null) }} style={{ flex: 1, padding: "8px", background: "#C0392B", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, minHeight: 44 }}>Confirm Delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: "8px", border: "1px solid #E8E6E0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, minHeight: 44 }}>Cancel</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {viewProject && !modalOpen && (
        <ProjectDetail
          project={viewProject}
          brands={brands}
          statuses={statuses}
          clientStatuses={clientStatuses}
          priorities={priorities}
          onEdit={() => { setEditProject(viewProject); setModalOpen(true) }}
          onDelete={async () => { await onDelete(viewProject.id); setViewProjectId(null) }}
          onUpdate={onUpdate}
          onClose={() => setViewProjectId(null)}
        />
      )}

      {modalOpen && (
        <ProjectModal
          project={editProject}
          brands={brands}
          statuses={statuses}
          clientStatuses={clientStatuses}
          assignees={assignees}
          priorities={priorities}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditProject(null) }}
        />
      )}
    </div>
  )
}
