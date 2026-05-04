import { useState, useEffect, useRef, useCallback } from "react"

type NoteItem =
  | { type: "text"; content: string }
  | { type: "check"; content: string; checked: boolean }

function parse(raw: string): NoteItem[] {
  if (!raw.trim()) return []
  return raw.split("\n").map((line) => {
    if (line.startsWith("[ ] ")) return { type: "check", content: line.slice(4), checked: false }
    if (line.startsWith("[x] ")) return { type: "check", content: line.slice(4), checked: true }
    return { type: "text", content: line }
  })
}

function serialize(items: NoteItem[]): string {
  return items.map((item) => {
    if (item.type === "check") return item.checked ? `[x] ${item.content}` : `[ ] ${item.content}`
    return item.content
  }).join("\n")
}

interface Props {
  initialValue: string
  onSave: (notes: string) => Promise<void>
}

export function NoteCanvas({ initialValue, onSave }: Props) {
  const [items, setItems] = useState<NoteItem[]>(() => parse(initialValue))
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef(initialValue)

  const triggerSave = useCallback((newItems: NoteItem[]) => {
    const text = serialize(newItems)
    if (text === lastSaved.current) return
    setStatus("idle")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setStatus("saving")
      try {
        await onSave(text)
        lastSaved.current = text
        setStatus("saved")
        setTimeout(() => setStatus("idle"), 2000)
      } catch {
        setStatus("error")
        setTimeout(() => setStatus("idle"), 3000)
      }
    }, 800)
  }, [onSave])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const update = (newItems: NoteItem[]) => {
    setItems(newItems)
    triggerSave(newItems)
  }

  const toggleCheck = (i: number) => {
    const next = items.map((item, idx) =>
      idx === i && item.type === "check" ? { ...item, checked: !item.checked } : item
    )
    update(next)
  }

  const updateContent = (i: number, content: string) => {
    update(items.map((item, idx) => idx === i ? { ...item, content } : item))
  }

  const deleteItem = (i: number) => update(items.filter((_, idx) => idx !== i))

  const addText = () => update([...items, { type: "text", content: "" }])
  const addCheck = () => update([...items, { type: "check", content: "", checked: false }])

  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const cur = items[i]
      const newItem: NoteItem = cur.type === "check"
        ? { type: "check", content: "", checked: false }
        : { type: "text", content: "" }
      const next = [...items.slice(0, i + 1), newItem, ...items.slice(i + 1)]
      setItems(next)
      triggerSave(next)
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>(".note-input")
        inputs[i + 1]?.focus()
      }, 10)
    }
    if (e.key === "Backspace" && items[i].content === "" && items.length > 1) {
      e.preventDefault()
      const next = items.filter((_, idx) => idx !== i)
      setItems(next)
      triggerSave(next)
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>(".note-input")
        inputs[Math.max(0, i - 1)]?.focus()
      }, 10)
    }
  }

  const inputStyle: React.CSSProperties = {
    border: "none",
    outline: "none",
    flex: 1,
    fontSize: 13,
    fontFamily: "inherit",
    color: "#333",
    background: "transparent",
    padding: 0,
    lineHeight: 1.6,
    minWidth: 0,
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: "20px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0, color: "#1A1A1A" }}>📝 Notes</h2>
        <span style={{ fontSize: 11, color: status === "saving" ? "#C07D15" : status === "saved" ? "#1D9E75" : status === "error" ? "#C0392B" : "transparent", transition: "color 0.3s" }}>
          {status === "saving" ? "Saving…" : status === "error" ? "✗ Failed to save" : "✓ Saved"}
        </span>
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minHeight: 60 }}>
        {items.length === 0 && (
          <div style={{ fontSize: 13, color: "#ccc", padding: "4px 0" }}>Click below to add a note or task…</div>
        )}
        {items.map((item, i) => (
          <div key={i} className="note-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", borderRadius: 6 }}>
            {item.type === "check" ? (
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleCheck(i)}
                style={{ width: 15, height: 15, accentColor: "#7F77DD", flexShrink: 0, cursor: "pointer" }}
              />
            ) : (
              <span style={{ width: 15, flexShrink: 0, color: "#ccc", fontSize: 11, userSelect: "none" }}>—</span>
            )}
            <input
              className="note-input"
              type="text"
              value={item.content}
              onChange={(e) => updateContent(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              placeholder={item.type === "check" ? "Task…" : "Note…"}
              style={{
                ...inputStyle,
                textDecoration: item.type === "check" && item.checked ? "line-through" : "none",
                color: item.type === "check" && item.checked ? "#bbb" : "#333",
              }}
            />
            <button
              onClick={() => deleteItem(i)}
              className="note-del"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 16, padding: "0 2px", lineHeight: 1, flexShrink: 0, opacity: 0, transition: "opacity 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#C0392B")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#ddd")}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0EEE8" }}>
        <button onClick={addText} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#888", background: "none", border: "1px solid #E8E6E0", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit" }}>
          + Note
        </button>
        <button onClick={addCheck} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#7F77DD", background: "#F0EFFF", border: "1px solid #E0DEFA", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontFamily: "inherit" }}>
          ☑ Task
        </button>
      </div>
    </div>
  )
}
