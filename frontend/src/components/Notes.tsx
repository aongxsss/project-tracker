import { useMemo, useState } from "react"
import { Note } from "../types"
import { NoteCard } from "./NoteCard"

interface Props {
  notes: Note[]
  loading: boolean
  error: string | null
  onAdd: (data?: Partial<{ title: string; content: string; color: string; pinned: boolean }>) => Promise<Note>
  onUpdate: (id: string, patch: Partial<Pick<Note, "title" | "content" | "color" | "pinned">>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (items: { id: string; position: number; pinned: boolean }[]) => Promise<void>
}

export function Notes({ notes, loading, error, onAdd, onUpdate, onDelete, onReorder }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const { pinned, others } = useMemo(() => {
    const p = notes.filter((n) => n.pinned).sort((a, b) => a.position - b.position)
    const o = notes.filter((n) => !n.pinned).sort((a, b) => a.position - b.position)
    return { pinned: p, others: o }
  }, [notes])

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = "move"
    try { e.dataTransfer.setData("text/plain", id) } catch { /* ignore */ }
  }

  const handleDragEnd = () => setDraggingId(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const reorderWithin = (list: Note[], fromId: string, toId: string): Note[] => {
    const fromIdx = list.findIndex((n) => n.id === fromId)
    const toIdx = list.findIndex((n) => n.id === toId)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return list
    const next = [...list]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    return next
  }

  const handleDrop = (_e: React.DragEvent, targetId: string) => {
    if (!draggingId || draggingId === targetId) return
    const dragged = notes.find((n) => n.id === draggingId)
    const target = notes.find((n) => n.id === targetId)
    if (!dragged || !target) return
    if (dragged.pinned !== target.pinned) {
      // Cross-section drop: change pin state and append to end of target section
      const targetSection = target.pinned ? pinned : others
      const next = [...targetSection.filter((n) => n.id !== dragged.id), { ...dragged, pinned: target.pinned }]
      const items = next.map((n, i) => ({ id: n.id, position: i, pinned: target.pinned }))
      onReorder(items)
    } else {
      const list = dragged.pinned ? pinned : others
      const reordered = reorderWithin(list, dragged.id, target.id)
      const items = reordered.map((n, i) => ({ id: n.id, position: i, pinned: dragged.pinned }))
      onReorder(items)
    }
    setDraggingId(null)
  }

  const handleTogglePin = async (note: Note) => {
    const targetSection = note.pinned ? others : pinned
    const newPinned = !note.pinned
    const newSectionList = [...targetSection, { ...note, pinned: newPinned }]
    const items = newSectionList.map((n, i) => ({ id: n.id, position: i, pinned: newPinned }))
    // Also re-index originating section
    const originList = note.pinned ? pinned.filter((n) => n.id !== note.id) : others.filter((n) => n.id !== note.id)
    const originItems = originList.map((n, i) => ({ id: n.id, position: i, pinned: note.pinned }))
    await onReorder([...items, ...originItems])
  }

  const renderCard = (n: Note) => (
    <NoteCard
      key={n.id}
      note={n}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onTogglePin={handleTogglePin}
      dragging={draggingId === n.id}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => handleDragOver(e)}
      onDrop={handleDrop}
    />
  )

  return (
    <div className="page-content" style={{ padding: "32px 32px 48px", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: "#1A1A1A" }}>Notes</h1>
        <button
          onClick={() => onAdd().catch(() => {})}
          className="add-project-btn"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#7F77DD", color: "#fff", border: "none",
            borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit", minHeight: 40,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New note
        </button>
      </div>

      {error && (
        <div style={{ background: "#FDECEA", color: "#C0392B", border: "1px solid #F5C0BA", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#999", fontSize: 14 }}>
          No notes yet. Click <strong style={{ color: "#7F77DD" }}>New note</strong> to create your first one.
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.08em", margin: "0 0 12px" }}>
                PINNED
              </div>
              <div className="notes-grid" style={{ columnGap: 16 }}>
                {pinned.map(renderCard)}
              </div>
            </>
          )}

          {others.length > 0 && (
            <>
              {pinned.length > 0 && (
                <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.08em", margin: "20px 0 12px" }}>
                  OTHERS
                </div>
              )}
              <div className="notes-grid" style={{ columnGap: 16 }}>
                {others.map(renderCard)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
