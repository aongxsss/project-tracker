import { useState, useEffect, useRef } from "react"

export interface ProjectPreview {
  id: string
  name: string
  customer_name: string
  internal_status: string
  statusColor: string
  due_date: string
}

interface Props {
  itemName: string
  description: string
  affectedProjects?: ProjectPreview[]
  onConfirm: () => Promise<void>
  onClose: () => void
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function DeleteConfirmModal({ itemName, description, affectedProjects = [], onConfirm, onClose }: Props) {
  const [typed, setTyped] = useState("")
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const hasProjects = affectedProjects.length > 0
  const matches = typed === itemName

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [onClose])

  const handleConfirm = async () => {
    if (!matches || deleting) return
    setDeleting(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      className="modal-backdrop"
    >
      <div
        className="modal-sheet"
        style={{ background: "#fff", width: "100%", maxWidth: 480, borderRadius: 16, padding: "28px 28px 32px", boxSizing: "border-box", boxShadow: "0 8px 40px rgba(0,0,0,0.2)", maxHeight: "85vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FDECEA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>Delete "{itemName}"?</h2>
            <p style={{ margin: 0, fontSize: 13, color: "#666", lineHeight: 1.5 }}>{description}</p>
          </div>
        </div>

        {/* Affected projects — shown as warning, not a blocker */}
        {hasProjects && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#FDECEA", border: "1px solid #F5C6C2", borderRadius: 10, marginBottom: 10 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontSize: 13, color: "#C0392B", fontWeight: 500 }}>
                {affectedProjects.length} task{affectedProjects.length !== 1 ? "s" : ""} will also be permanently deleted.
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto", paddingRight: 2 }}>
              {affectedProjects.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#F9F8F5", borderRadius: 8, border: "1px solid #F0EEE8" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.statusColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{p.customer_name} · Due {formatDate(p.due_date)}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "#888", background: "#EFEFEF", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0 }}>{p.internal_status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Type-to-confirm — always shown */}
        <div style={{ background: "#FFF8F8", border: "1px solid #F5D0CC", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#888" }}>
            Type <strong style={{ color: "#1A1A1A", fontWeight: 600 }}>{itemName}</strong> to confirm:
          </p>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleConfirm() }}
            placeholder={itemName}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: `1.5px solid ${typed.length > 0 ? (matches ? "#1D9E75" : "#C0392B") : "#E8E6E0"}`,
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              boxSizing: "border-box",
              background: "#fff",
              color: "#1A1A1A",
              transition: "border-color 0.15s",
            }}
          />
          {typed.length > 0 && !matches && (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#C0392B" }}>Name does not match</p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "10px 20px", border: "1px solid #E8E6E0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 14, color: "#555", minHeight: 44 }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!matches || deleting}
            style={{
              padding: "10px 20px",
              border: "none",
              borderRadius: 8,
              background: matches ? "#C0392B" : "#E8C5C0",
              color: "#fff",
              cursor: matches && !deleting ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 500,
              minHeight: 44,
              transition: "background 0.15s",
            }}
          >
            {deleting
              ? "Deleting…"
              : hasProjects
              ? `Delete brand & ${affectedProjects.length} task${affectedProjects.length !== 1 ? "s" : ""}`
              : "Delete brand"}
          </button>
        </div>
      </div>
    </div>
  )
}
