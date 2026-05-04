import { useEffect, useRef, useState } from "react"
import { Note, NotePatch } from "../types"
import { RichEditor, RichEditorHandle, FormatCmd } from "./RichEditor"

interface Props {
  note: Note
  onUpdate: (id: string, patch: NotePatch) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onTogglePin: (note: Note) => void
  dragging?: boolean
  onDragStart?: (e: React.DragEvent, id: string) => void
  onDragEnd?: () => void
  onDragOver?: (e: React.DragEvent, id: string) => void
  onDrop?: (e: React.DragEvent, id: string) => void
}

const COLORS = [
  "#FFFFFF", "#F8E5C2", "#FBD8D8", "#E8D5F2",
  "#D4E9F7", "#D4F1E0", "#FFF4B8", "#F0E5D8",
]

const FORMAT_BUTTONS: { cmd: FormatCmd; label: string; title: string; style?: React.CSSProperties }[] = [
  { cmd: "bold",                label: "B",  title: "Bold (Ctrl+B)",      style: { fontWeight: 700 } },
  { cmd: "italic",              label: "I",  title: "Italic (Ctrl+I)",    style: { fontStyle: "italic" } },
  { cmd: "underline",           label: "U",  title: "Underline (Ctrl+U)", style: { textDecoration: "underline" } },
  { cmd: "strikeThrough",       label: "S",  title: "Strikethrough",      style: { textDecoration: "line-through" } },
  { cmd: "insertUnorderedList", label: "•",  title: "Bullet list" },
  { cmd: "insertOrderedList",   label: "1.", title: "Numbered list" },
  { cmd: "removeFormat",        label: "✕",  title: "Clear formatting",   style: { fontSize: 11 } },
]

const PinIcon = ({ filled }: { filled: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14l-1.5-3.5V8a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v5.5L5 17z" />
  </svg>
)

const PaletteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.7 0 3-1.3 3-3 0-.8-.3-1.5-.8-2-.5-.5-.8-1.2-.8-2 0-1.7 1.3-3 3-3h1.8c2 0 3.8-1.6 3.8-3.5C22 5.5 17.5 2 12 2z" />
  </svg>
)

const GripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
  </svg>
)

export function NoteCard({
  note, onUpdate, onDelete, onTogglePin,
  dragging, onDragStart, onDragEnd, onDragOver, onDrop,
}: Props) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [showPalette, setShowPalette] = useState(false)
  const [footerVisible, setFooterVisible] = useState(false)
  const [dragEnabled, setDragEnabled] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [active, setActive] = useState<Record<string, boolean>>({})
  const editorRef = useRef<RichEditorHandle>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSent = useRef({ title: note.title, content: note.content })
  const paletteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    lastSent.current = { title: note.title, content: note.content }
  }, [note.id, note.title, note.content])

  useEffect(() => {
    if (!showPalette) return
    const handler = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) setShowPalette(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showPalette])

  const flush = async (next: { title: string; content: string }) => {
    const patch: NotePatch = {}
    if (next.title !== lastSent.current.title) patch.title = next.title
    if (next.content !== lastSent.current.content) patch.content = next.content
    if (Object.keys(patch).length === 0) return
    lastSent.current = next
    await onUpdate(note.id, patch)
  }

  const queueSave = (next: { title: string; content: string }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => flush(next).catch(() => {}), 600)
  }

  const handleSaveClick = async () => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
    setSaveStatus("saving")
    try {
      await flush({ title, content })
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch {
      setSaveStatus("idle")
    }
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleTitleChange = (v: string) => { setTitle(v); queueSave({ title: v, content }) }
  const handleContentChange = (v: string) => { setContent(v); queueSave({ title, content: v }) }
  const setColor = (color: string) => { onUpdate(note.id, { color }).catch(() => {}); setShowPalette(false) }

  const cardBg = note.color === "#FFFFFF" ? "#fff" : note.color
  const border = note.color === "#FFFFFF" ? "#E8E6E0" : "transparent"

  const updatedAt = new Date(note.updated_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

  return (
    <div
      draggable={dragEnabled}
      onDragStart={(e) => onDragStart?.(e, note.id)}
      onDragEnd={() => { setDragEnabled(false); onDragEnd?.() }}
      onDragOver={(e) => onDragOver?.(e, note.id)}
      onDrop={(e) => onDrop?.(e, note.id)}
      style={{
        background: cardBg, border: `1px solid ${border}`, borderRadius: 12,
        padding: "14px 16px 10px", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.15s, opacity 0.15s",
        opacity: dragging ? 0.4 : 1, position: "relative",
      }}
      className="note-card"
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          onMouseDown={() => setDragEnabled(true)}
          onMouseUp={() => setDragEnabled(false)}
          onTouchStart={() => setDragEnabled(true)}
          onTouchEnd={() => setDragEnabled(false)}
          style={{ color: "#bbb", cursor: "grab", display: "flex", alignItems: "center", flexShrink: 0, padding: 2, borderRadius: 4 }}
          title="Drag to reorder"
        >
          <GripIcon />
        </span>
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onFocus={() => setFooterVisible(true)}
          onBlur={() => setTimeout(() => { setFooterVisible(false); setConfirmDelete(false) }, 150)}
          placeholder="Title"
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontSize: 14, fontWeight: 600, color: "#1A1A1A", fontFamily: "inherit",
            padding: 0, minWidth: 0,
          }}
        />
        <button
          type="button"
          onClick={() => onTogglePin(note)}
          title={note.pinned ? "Unpin" : "Pin"}
          style={{ background: "none", border: "none", cursor: "pointer", color: note.pinned ? "#C07D15" : "#bbb", padding: 4, display: "flex", alignItems: "center", flexShrink: 0, borderRadius: 6 }}
        >
          <PinIcon filled={note.pinned} />
        </button>
      </div>

      {/* Content */}
      <RichEditor
        ref={editorRef}
        value={content}
        onChange={handleContentChange}
        onActiveChange={setActive}
        onFocusChange={(f) => { if (f) setFooterVisible(true); else setTimeout(() => { setFooterVisible(false); setConfirmDelete(false) }, 150) }}
        placeholder="Take a note…"
        minHeight={50}
      />

      {/* Timestamp */}
      <div style={{ fontSize: 11, color: "#bbb", marginTop: 8 }}>Edited {updatedAt}</div>

      {/* Footer */}
      <div
        style={{
          marginTop: 10,
          opacity: footerVisible || showPalette ? 1 : 0,
          transition: "opacity 0.15s",
        }}
        className="note-card-footer"
      >
        {/* Toolbar — single row, Save+Delete pinned right */}
        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Format buttons */}
          {FORMAT_BUTTONS.map(({ cmd, label, title, style }) => (
            <button
              key={cmd}
              type="button"
              title={title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editorRef.current?.exec(cmd)}
              style={{
                background: active[cmd] ? "rgba(0,0,0,0.08)" : "transparent",
                border: "none", cursor: "pointer",
                padding: "2px 5px", borderRadius: 4,
                fontSize: 11, color: active[cmd] ? "#1A1A1A" : "#666",
                fontFamily: "inherit", minWidth: 20, minHeight: 20, lineHeight: 1,
                ...style,
              }}
            >
              {label}
            </button>
          ))}

          {/* Divider */}
          <span style={{ width: 1, height: 14, background: "#E8E6E0", margin: "0 3px", flexShrink: 0 }} />

          {/* Palette */}
          <div style={{ position: "relative", flexShrink: 0 }} ref={paletteRef}>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowPalette((s) => !s)}
              title="Background color"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#666", padding: "2px 4px", display: "flex", alignItems: "center", borderRadius: 4 }}
            >
              <PaletteIcon />
            </button>
            {showPalette && (
              <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 6, background: "#fff", border: "1px solid #E8E6E0", borderRadius: 10, padding: 8, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", zIndex: 10 }}>
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setColor(c)} title={c}
                    style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: note.color === c ? "2px solid #1A1A1A" : "1px solid #E8E6E0", cursor: "pointer", padding: 0 }} />
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Save + Delete */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={saveStatus === "saving"}
              style={{
                background: saveStatus === "saved" ? "#E8F5EE" : "#F0EFFF",
                color: saveStatus === "saved" ? "#1D9E75" : "#7F77DD",
                border: "none", borderRadius: 5, padding: "2px 9px",
                fontSize: 11, fontWeight: 500, cursor: saveStatus === "saving" ? "default" : "pointer",
                fontFamily: "inherit", minHeight: 20, lineHeight: 1, transition: "background 0.2s, color 0.2s",
              }}
            >
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => { if (!title.trim() && !content.replace(/<[^>]+>/g, "").trim()) { onDelete(note.id); return } setConfirmDelete(true) }}
              style={{ background: "#FDECEA", color: "#C0392B", border: "none", borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", minHeight: 20, lineHeight: 1 }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Delete confirm row */}
        {confirmDelete && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: "#555" }}>Delete this note?</span>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              style={{ background: "#F0EEE8", color: "#555", border: "none", borderRadius: 6, padding: "3px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", minHeight: 24 }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onDelete(note.id)}
              style={{ background: "#C0392B", color: "#fff", border: "none", borderRadius: 6, padding: "3px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", minHeight: 24 }}
            >
              Yes, delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
