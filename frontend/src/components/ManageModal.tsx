import { useState, useEffect, useRef } from "react"
import { ConfigItem, Project } from "../types"
import { DeleteConfirmModal, ProjectPreview } from "./DeleteConfirmModal"

const PALETTE = [
  "#7F77DD", "#1D9E75", "#D85A30", "#2B7FD4",
  "#C07D15", "#C0392B", "#8E44AD", "#E67E22",
  "#16A085", "#E91E63", "#607D8B", "#795548",
]

interface SectionProps {
  title: string
  items: ConfigItem[]
  name: string
  onNameChange: (v: string) => void
  color: string
  onColorChange: (v: string) => void
  onAdd: () => void
  onDelete: (name: string) => void
  onUpdateColor: (name: string, color: string) => Promise<void>
  addBusy: boolean
  deletingName: string | null
}

function Section({
  title, items,
  name, onNameChange,
  color, onColorChange,
  onAdd, onDelete, onUpdateColor,
  addBusy, deletingName,
}: SectionProps) {
  const [editingColor, setEditingColor] = useState<string | null>(null)
  const [savingColor, setSavingColor] = useState(false)

  const handleColorPick = async (itemName: string, newColor: string) => {
    setSavingColor(true)
    try {
      await onUpdateColor(itemName, newColor)
    } finally {
      setSavingColor(false)
      setEditingColor(null)
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", margin: "0 0 10px" }}>{title}</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {items.length === 0 && <div style={{ fontSize: 13, color: "#aaa" }}>None yet</div>}
        {items.map((item) => (
          <div key={item.name}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "#F9F8F5", borderRadius: editingColor === item.name ? "8px 8px 0 0" : 8 }}>
              {/* Clickable color dot */}
              <button
                onClick={() => setEditingColor(editingColor === item.name ? null : item.name)}
                title="Change color"
                style={{ width: 18, height: 18, borderRadius: "50%", background: item.color, flexShrink: 0, border: editingColor === item.name ? "2px solid #1A1A1A" : "2px solid transparent", cursor: "pointer", padding: 0, minHeight: 18, minWidth: 18 }}
              />
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: "#333" }}>{item.name}</span>
              <button
                onClick={() => onDelete(item.name)}
                disabled={deletingName === item.name}
                title="Delete"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 18, padding: "2px 6px", lineHeight: 1, borderRadius: 6, minHeight: 30, minWidth: 30 }}
              >
                ×
              </button>
            </div>

            {/* Inline color picker */}
            {editingColor === item.name && (
              <div style={{ background: "#F0EFF9", border: "1px solid #E0DFF5", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "10px 12px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorPick(item.name, c)}
                    disabled={savingColor}
                    style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: item.color === c ? "2.5px solid #1A1A1A" : "2.5px solid transparent", cursor: savingColor ? "not-allowed" : "pointer", padding: 0, minHeight: 22, minWidth: 22, outline: "none" }}
                  />
                ))}
                <input
                  type="color"
                  defaultValue={item.color}
                  onChange={(e) => handleColorPick(item.name, e.target.value)}
                  title="Custom color"
                  style={{ width: 22, height: 22, padding: 0, border: "none", borderRadius: "50%", cursor: "pointer", background: "none", minHeight: 22, minWidth: 22 }}
                />
                <button
                  onClick={() => setEditingColor(null)}
                  style={{ marginLeft: "auto", fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder={`New ${title.toLowerCase().replace(/s$/, "")} name…`}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onAdd() }}
            style={{
              flex: 1,
              padding: "7px 10px",
              border: "1px solid #E8E6E0",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
              minWidth: 120,
              minHeight: 36,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={onAdd}
            disabled={!name.trim() || addBusy}
            style={{
              padding: "7px 14px",
              background: !name.trim() ? "#C5C3F0" : "#7F77DD",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: !name.trim() ? "not-allowed" : "pointer",
              fontSize: 13,
              fontFamily: "inherit",
              fontWeight: 500,
              whiteSpace: "nowrap",
              minHeight: 36,
            }}
          >
            {addBusy ? "…" : "Add"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              title={c}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: c,
                border: color === c ? "2.5px solid #1A1A1A" : "2.5px solid transparent",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
                minHeight: 22,
                minWidth: 22,
                outline: "none",
              }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            title="Custom color"
            style={{ width: 22, height: 22, padding: 0, border: "none", borderRadius: "50%", cursor: "pointer", background: "none", minHeight: 22, minWidth: 22 }}
          />
        </div>
      </div>
    </div>
  )
}

interface Props {
  brands: ConfigItem[]
  statuses: ConfigItem[]
  projects: Project[]
  onAddBrand: (name: string, color: string) => Promise<void>
  onUpdateBrand: (name: string, color: string) => Promise<void>
  onDeleteBrand: (name: string, force?: boolean) => Promise<void>
  onAddStatus: (name: string, color: string) => Promise<void>
  onUpdateStatus: (name: string, color: string) => Promise<void>
  onDeleteStatus: (name: string) => Promise<void>
  onClose: () => void
}

export function ManageModal({
  brands, statuses, projects,
  onAddBrand, onUpdateBrand, onDeleteBrand,
  onAddStatus, onUpdateStatus, onDeleteStatus,
  onClose,
}: Props) {
  const [brandName, setBrandName] = useState("")
  const [brandColor, setBrandColor] = useState(PALETTE[0])
  const [statusName, setStatusName] = useState("")
  const [statusColor, setStatusColor] = useState(PALETTE[3])
  const [error, setError] = useState<string | null>(null)
  const [brandAddBusy, setBrandAddBusy] = useState(false)
  const [statusAddBusy, setStatusAddBusy] = useState(false)
  const [brandToDelete, setBrandToDelete] = useState<string | null>(null)
  const [deletingStatus, setDeletingStatus] = useState<string | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [onClose])

  const handleAddBrand = async () => {
    if (!brandName.trim()) return
    setError(null)
    setBrandAddBusy(true)
    try {
      await onAddBrand(brandName.trim(), brandColor)
      setBrandName("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setBrandAddBusy(false)
    }
  }

  const handleAddStatus = async () => {
    if (!statusName.trim()) return
    setError(null)
    setStatusAddBusy(true)
    try {
      await onAddStatus(statusName.trim(), statusColor)
      setStatusName("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setStatusAddBusy(false)
    }
  }

  const handleDeleteBrand = async (name: string, force = false) => {
    setError(null)
    try {
      await onDeleteBrand(name, force)
      setBrandToDelete(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
      setBrandToDelete(null)
    }
  }

  const handleDeleteStatus = async (name: string) => {
    setError(null)
    setDeletingStatus(name)
    try {
      await onDeleteStatus(name)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed")
    } finally {
      setDeletingStatus(null)
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      className="modal-backdrop"
    >
      <div
        className="modal-sheet"
        style={{ background: "#fff", width: "100%", maxWidth: 460, borderRadius: 16, padding: "24px 24px 28px", boxSizing: "border-box", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1A1A1A" }}>Manage Brands & Statuses</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#999", minHeight: 44, minWidth: 44, lineHeight: 1 }}>×</button>
        </div>

        {error && (
          <div style={{ background: "#FDECEA", color: "#C0392B", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Section
            title="Brands"
            items={brands}
            name={brandName}
            onNameChange={setBrandName}
            color={brandColor}
            onColorChange={setBrandColor}
            onAdd={handleAddBrand}
            onDelete={(name) => setBrandToDelete(name)}
            onUpdateColor={onUpdateBrand}
            addBusy={brandAddBusy}
            deletingName={null}
          />
          <div style={{ height: 1, background: "#E8E6E0" }} />
          <Section
            title="Statuses"
            items={statuses}
            name={statusName}
            onNameChange={setStatusName}
            color={statusColor}
            onColorChange={setStatusColor}
            onAdd={handleAddStatus}
            onDelete={handleDeleteStatus}
            onUpdateColor={onUpdateStatus}
            addBusy={statusAddBusy}
            deletingName={deletingStatus}
          />
        </div>
      </div>

      {brandToDelete && (() => {
        const sc = (name: string) => statuses.find((s) => s.name === name)?.color ?? "#888888"
        const affected: ProjectPreview[] = projects
          .filter((p) => p.brand === brandToDelete)
          .map((p) => ({ id: p.id, name: p.name, pm: p.pm, status: p.status, statusColor: sc(p.status), due_date: p.due_date }))
        const force = affected.length > 0
        const description = force
          ? `Brand "${brandToDelete}" and all its tasks will be permanently deleted. This action cannot be undone.`
          : `Brand "${brandToDelete}" will be permanently deleted. This action cannot be undone.`
        return (
          <DeleteConfirmModal
            itemName={brandToDelete}
            description={description}
            affectedProjects={affected}
            onConfirm={() => handleDeleteBrand(brandToDelete, force)}
            onClose={() => setBrandToDelete(null)}
          />
        )
      })()}
    </div>
  )
}
