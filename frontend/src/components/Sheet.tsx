import { useState } from "react"
import { Sheet as SheetType, SheetColumn, SheetRow, MergeRegion } from "../types"
import { SheetEditor } from "./SheetEditor"

interface SheetCreatePayload {
  title?: string
  columns?: SheetColumn[]
  rows?: SheetRow[]
  merges?: MergeRegion[]
}

interface Props {
  sheets: SheetType[]
  loading: boolean
  error: string | null
  onAdd: (titleOrPayload?: string | SheetCreatePayload) => Promise<SheetType>
  onUpdate: (id: string, patch: { title?: string; columns?: SheetColumn[]; rows?: SheetRow[]; merges?: MergeRegion[] }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const TableIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M3 15h18M9 3v18" />
  </svg>
)

export function Sheet({ sheets, loading, error, onAdd, onUpdate, onDelete }: Props) {
  const [activeId, setActiveId] = useState<string | null>(() => sheets[0]?.id ?? null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const active = sheets.find((s) => s.id === activeId) ?? sheets[0] ?? null

  const handleAdd = async () => {
    const created = await onAdd()
    setActiveId(created.id)
  }

  const handleDelete = async (id: string) => {
    await onDelete(id)
    const remaining = sheets.filter((s) => s.id !== id)
    setActiveId(remaining[0]?.id ?? null)
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0, flex: 1 }}>
      {/* Sheet list sidebar */}
      <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid #E8E6E0", background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #E8E6E0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>Sheets</span>
            <button
              onClick={handleAdd}
              title="New sheet"
              style={{ background: "#F0EFFF", color: "#7F77DD", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
            >
              + New
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: "8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><div className="spinner" /></div>
          ) : sheets.length === 0 ? (
            <div style={{ fontSize: 12, color: "#bbb", padding: "12px 8px" }}>No sheets yet</div>
          ) : (
            sheets.map((s) => {
              const isActive = s.id === (active?.id)
              const isEditing = editingId === s.id
              return (
                <div
                  key={s.id}
                  onClick={() => { if (!isEditing) setActiveId(s.id) }}
                  onDoubleClick={() => { setActiveId(s.id); setEditingId(s.id); setEditingTitle(s.title) }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                    borderRadius: 8, cursor: isEditing ? "default" : "pointer", width: "100%",
                    background: isActive ? "#F0EFFF" : "transparent",
                    color: isActive ? "#7F77DD" : "#555",
                    fontSize: 13, fontWeight: isActive ? 500 : 400,
                    transition: "background 0.12s", boxSizing: "border-box",
                  }}
                >
                  <span style={{ flexShrink: 0, opacity: 0.7 }}><TableIcon /></span>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => {
                        const t = editingTitle.trim() || "Untitled Sheet"
                        if (t !== s.title) onUpdate(s.id, { title: t }).catch(() => {})
                        setEditingId(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                        if (e.key === "Escape") { setEditingTitle(s.title); setEditingId(null) }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1, minWidth: 0, border: "none", outline: "none",
                        background: "transparent", fontFamily: "inherit",
                        fontSize: 13, fontWeight: isActive ? 500 : 400,
                        color: isActive ? "#7F77DD" : "#555", padding: 0,
                      }}
                    />
                  ) : (
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {s.title || "Untitled Sheet"}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Editor panel */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {error && (
          <div style={{ background: "#FDECEA", color: "#C0392B", borderBottom: "1px solid #F5C0BA", padding: "8px 16px", fontSize: 13, flexShrink: 0 }}>
            {error}
          </div>
        )}
        {!loading && sheets.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#999", padding: 40 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D0CEC8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18" />
            </svg>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: "#555", marginBottom: 6 }}>No sheets yet</div>
              <div style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Create a sheet to get started</div>
              <button
                onClick={handleAdd}
                style={{ background: "#7F77DD", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                + New sheet
              </button>
            </div>
          </div>
        ) : active ? (
          <SheetEditor
            key={active.id}
            sheet={active}
            onUpdate={onUpdate}
            onDelete={handleDelete}
            onImport={async (payload) => {
              const created = await onAdd(payload)
              setActiveId(created.id)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
