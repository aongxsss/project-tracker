import { useState } from "react"
import { Project, ProjectInput, ConfigItem } from "../types"
import { BrandBadge } from "./BrandBadge"
import { StatusBadge } from "./StatusBadge"
import { ProjectModal } from "./ProjectModal"

type SortKey = "due_date" | "brand"
type SortDir = "asc" | "desc"

function formatDate(d: string) {
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
  const d = new Date(due + "T00:00:00")
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

function daysLabel(due: string, status: string): { text: string; color: string } | null {
  if (status === "Done") return null
  const diff = daysDiff(due)
  if (diff === 0) return { text: "Today", color: "#C07D15" }
  if (diff > 0) {
    const color = diff <= 3 ? "#C07D15" : "#999"
    return { text: `in ${diff} day${diff !== 1 ? "s" : ""}`, color }
  }
  const abs = Math.abs(diff)
  return { text: `${abs} day${abs !== 1 ? "s" : ""} overdue`, color: "#C0392B" }
}

interface Props {
  projects: Project[]
  totalCount: number
  brands: ConfigItem[]
  statuses: ConfigItem[]
  currentUserName: string
  onAdd: (data: ProjectInput) => Promise<void>
  onUpdate: (id: string, data: ProjectInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function Tracking({ projects, totalCount, brands, statuses, currentUserName, onAdd, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "due_date", dir: "asc" })
  const [modalOpen, setModalOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const bc = (name: string) => brands.find((b) => b.name === name)?.color ?? "#888888"
  const sc = (name: string) => statuses.find((s) => s.name === name)?.color ?? "#888888"

  const filtered = projects
    .filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return p.name.toLowerCase().includes(q) || p.pm.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1
      if (sort.key === "due_date") return (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0) * dir
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

  return (
    <div style={{ padding: "32px 32px 48px", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", flex: 1 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "#1A1A1A" }}>Task Tracking</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#999" }}>{filtered.length} of {totalCount} tasks</p>
      </div>

      {/* Controls */}
      <div className="tracking-controls" style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input type="text" placeholder="Search by name or AE…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, minWidth: 220, flex: "1 1 220px" }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, minWidth: 160, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "calc(100% - 12px) center", paddingRight: 36 }}>
          <option value="">All Status</option>
          {statuses.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <button
          className="add-project-btn"
          onClick={() => { setEditProject(null); setModalOpen(true) }}
          style={{ padding: "8px 18px", background: "#7F77DD", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", minHeight: 44 }}
        >
          + Add Task
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
          {projects.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#555", marginBottom: 6 }}>No tasks found</div>
              <div style={{ fontSize: 13 }}>Click '+ Add Task' to get started.</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#999" }}>No tasks match your filters.</div>
          )}
        </div>
      ) : (
        <>
          {/* Desktop/Tablet table */}
          <div className="table-wrapper" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, overflow: "hidden" }}>
              <thead>
                <tr style={{ background: "#FAFAF8", borderBottom: "1px solid #E8E6E0" }}>
                  <th onClick={() => toggleSort("brand")} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#666", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>Brand {sortArrow("brand")}</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#666" }}>AE</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#666" }}>Task Name</th>
                  <th onClick={() => toggleSort("due_date")} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#666", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>Due Date {sortArrow("due_date")}</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#666" }}>Status</th>
                  <th className="comment-col" style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#666" }}>Comment</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: 500, color: "#666" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const overdue = isOverdue(p.due_date, p.status)
                  return (
                    <tr key={p.id} className="table-row" style={{ borderBottom: "1px solid #F0EEE8" }}>
                      <td style={{ padding: "12px 16px" }}><BrandBadge brand={p.brand} color={bc(p.brand)} /></td>
                      <td style={{ padding: "12px 16px", color: "#333" }}>{p.pm}</td>
                      <td style={{ padding: "12px 16px", maxWidth: 220 }}>
                        <span title={p.name} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1A1A1A" }}>{p.name}</span>
                      </td>
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ color: overdue ? "#C0392B" : "#333", fontWeight: overdue ? 500 : 400 }}>{formatDate(p.due_date)}</div>
                        {(() => { const lbl = daysLabel(p.due_date, p.status); return lbl ? <div style={{ fontSize: 11, color: lbl.color, marginTop: 2 }}>{lbl.text}</div> : null })()}
                      </td>
                      <td style={{ padding: "12px 16px" }}><StatusBadge status={p.status} color={sc(p.status)} /></td>
                      <td className="comment-col" style={{ padding: "12px 16px", color: "#999", maxWidth: 180 }}>
                        <span title={p.comment || undefined} style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.comment || "—"}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {confirmDeleteId === p.id ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                            <span style={{ fontSize: 12, color: "#555" }}>Are you sure?</span>
                            <button onClick={async () => { await onDelete(p.id); setConfirmDeleteId(null) }} style={{ padding: "3px 10px", background: "#C0392B", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit", minHeight: 28 }}>Confirm</button>
                            <button onClick={() => setConfirmDeleteId(null)} style={{ padding: "3px 10px", background: "#F0EEE8", color: "#555", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit", minHeight: 28 }}>Cancel</button>
                          </div>
                        ) : (
                          <div className="row-actions" style={{ display: "flex", gap: 6, opacity: 0, transition: "opacity 0.15s" }}>
                            <button onClick={() => { setEditProject(p); setModalOpen(true) }} title="Edit" style={{ padding: "5px 8px", border: "1px solid #E8E6E0", borderRadius: 6, background: "#fff", cursor: "pointer", minHeight: 32, minWidth: 32 }}>
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
              const overdue = isOverdue(p.due_date, p.status)
              return (
                <div key={p.id} style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <BrandBadge brand={p.brand} color={bc(p.brand)} />
                    <StatusBadge status={p.status} color={sc(p.status)} />
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 14, color: "#1A1A1A", marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "#999", marginBottom: 12 }}>
                    {p.pm} · Due <span style={{ color: overdue ? "#C0392B" : "#999", fontWeight: overdue ? 500 : 400 }}>{formatDate(p.due_date)}</span>
                    {(() => { const lbl = daysLabel(p.due_date, p.status); return lbl ? <span style={{ color: lbl.color, marginLeft: 4 }}>· {lbl.text}</span> : null })()}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setEditProject(p); setModalOpen(true) }} style={{ flex: 1, padding: "8px", border: "1px solid #E8E6E0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, minHeight: 44 }}>Edit</button>
                    <button onClick={() => setConfirmDeleteId(p.id)} style={{ flex: 1, padding: "8px", border: "1px solid #F5D0CC", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#C0392B", minHeight: 44 }}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {modalOpen && (
        <ProjectModal
          project={editProject}
          brands={brands}
          statuses={statuses}
          defaultAE={currentUserName}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditProject(null) }}
        />
      )}


    </div>
  )
}
