import { useCallback, useEffect, useRef, useState } from "react"
import { Sheet, SheetColumn, SheetRow } from "../types"
import { exportCsv, exportXlsx, exportPdf } from "../utils/exportSheet"

interface Props {
  sheet: Sheet
  onUpdate: (id: string, patch: { title?: string; columns?: SheetColumn[]; rows?: SheetRow[] }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

const DEFAULT_COL_WIDTH = 140

export function SheetEditor({ sheet, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(sheet.title)
  const [columns, setColumns] = useState<SheetColumn[]>(sheet.columns)
  const [rows, setRows] = useState<SheetRow[]>(sheet.rows)
  const [selected, setSelected] = useState<{ rowIdx: number; colIdx: number } | null>(null)
  const [editingHeader, setEditingHeader] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [colCount, setColCount] = useState(1)
  const [rowCount, setRowCount] = useState(1)
  const [showExport, setShowExport] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSent = useRef({ title: sheet.title, columns: sheet.columns, rows: sheet.rows })
  const gridRef = useRef<HTMLDivElement>(null)

  // Sync when sheet prop changes (switching sheets)
  useEffect(() => {
    setTitle(sheet.title)
    setColumns(sheet.columns)
    setRows(sheet.rows)
    setSelected(null)
    setEditingHeader(null)
    lastSent.current = { title: sheet.title, columns: sheet.columns, rows: sheet.rows }
  }, [sheet.id])

  const queueSave = useCallback((next: { title: string; columns: SheetColumn[]; rows: SheetRow[] }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const patch: { title?: string; columns?: SheetColumn[]; rows?: SheetRow[] } = {}
      if (next.title !== lastSent.current.title) patch.title = next.title
      if (JSON.stringify(next.columns) !== JSON.stringify(lastSent.current.columns)) patch.columns = next.columns
      if (JSON.stringify(next.rows) !== JSON.stringify(lastSent.current.rows)) patch.rows = next.rows
      if (Object.keys(patch).length === 0) return
      lastSent.current = { ...next }
      onUpdate(sheet.id, patch).catch(() => {})
    }, 600)
  }, [sheet.id, onUpdate])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  useEffect(() => {
    if (!showExport) return
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showExport])

  const update = (next: { title?: string; columns?: SheetColumn[]; rows?: SheetRow[] }) => {
    const merged = {
      title: next.title ?? title,
      columns: next.columns ?? columns,
      rows: next.rows ?? rows,
    }
    if (next.title !== undefined) setTitle(merged.title)
    if (next.columns !== undefined) setColumns(merged.columns)
    if (next.rows !== undefined) setRows(merged.rows)
    queueSave(merged)
  }

  const addColumn = () => {
    const n = Math.max(1, colCount)
    const newCols = Array.from({ length: n }, (_, i) => ({ id: uid(), name: `Column ${columns.length + i + 1}` }))
    update({ columns: [...columns, ...newCols] })
  }

  const addRow = () => {
    const n = Math.max(1, rowCount)
    const newRows = Array.from({ length: n }, () => ({ id: uid(), cells: {} }))
    update({ rows: [...rows, ...newRows] })
  }

  const deleteColumn = (colId: string) => {
    const nextCols = columns.filter((c) => c.id !== colId)
    const nextRows = rows.map((r) => {
      const cells = { ...r.cells }
      delete cells[colId]
      return { ...r, cells }
    })
    update({ columns: nextCols, rows: nextRows })
    setSelected(null)
  }

  const deleteRow = (rowId: string) => {
    update({ rows: rows.filter((r) => r.id !== rowId) })
    setSelected(null)
  }

  const setCell = (rowId: string, colId: string, value: string) => {
    const nextRows = rows.map((r) =>
      r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r
    )
    update({ rows: nextRows })
  }

  const renameColumn = (colId: string, name: string) => {
    update({ columns: columns.map((c) => c.id === colId ? { ...c, name } : c) })
  }

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const nextCol = e.shiftKey ? colIdx - 1 : colIdx + 1
      if (nextCol >= 0 && nextCol < columns.length) setSelected({ rowIdx, colIdx: nextCol })
      else if (!e.shiftKey && nextCol === columns.length && rowIdx < rows.length - 1) setSelected({ rowIdx: rowIdx + 1, colIdx: 0 })
      else if (e.shiftKey && nextCol < 0 && rowIdx > 0) setSelected({ rowIdx: rowIdx - 1, colIdx: columns.length - 1 })
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (rowIdx < rows.length - 1) setSelected({ rowIdx: rowIdx + 1, colIdx })
      else { addRow(); setSelected({ rowIdx: rowIdx + 1, colIdx }) }
    } else if (e.key === "Escape") {
      setSelected(null)
    } else if (e.key === "ArrowUp" && rowIdx > 0) {
      e.preventDefault(); setSelected({ rowIdx: rowIdx - 1, colIdx })
    } else if (e.key === "ArrowDown" && rowIdx < rows.length - 1) {
      e.preventDefault(); setSelected({ rowIdx: rowIdx + 1, colIdx })
    }
  }

  const isSelected = (ri: number, ci: number) => selected?.rowIdx === ri && selected?.colIdx === ci

  const cellStyle = (ri: number, ci: number): React.CSSProperties => ({
    border: `1px solid ${isSelected(ri, ci) ? "#7F77DD" : "#E8E6E0"}`,
    outline: isSelected(ri, ci) ? "1px solid #7F77DD" : "none",
    outlineOffset: -1,
    padding: 0,
    minWidth: DEFAULT_COL_WIDTH,
    maxWidth: DEFAULT_COL_WIDTH,
    background: isSelected(ri, ci) ? "#FAF9FF" : "#fff",
    position: "relative",
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Sheet title + actions bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px 12px", borderBottom: "1px solid #E8E6E0", background: "#fff", flexShrink: 0 }}>
        <input
          value={title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Untitled Sheet"
          style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", flex: 1, minWidth: 0 }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#F0EFFF", borderRadius: 7, padding: "2px 4px 2px 10px" }}>
          <input
            type="number"
            min={1}
            max={100}
            value={colCount}
            onChange={(e) => setColCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            style={{ width: 36, border: "none", background: "transparent", fontSize: 12, fontWeight: 500, color: "#7F77DD", fontFamily: "inherit", outline: "none", textAlign: "center", padding: 0 }}
          />
          <button
            onClick={addColumn}
            style={{ background: "#7F77DD", color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            + {colCount === 1 ? "Column" : "Columns"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#F0EFFF", borderRadius: 7, padding: "2px 4px 2px 10px" }}>
          <input
            type="number"
            min={1}
            max={1000}
            value={rowCount}
            onChange={(e) => setRowCount(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
            style={{ width: 36, border: "none", background: "transparent", fontSize: 12, fontWeight: 500, color: "#7F77DD", fontFamily: "inherit", outline: "none", textAlign: "center", padding: 0 }}
          />
          <button
            onClick={addRow}
            style={{ background: "#7F77DD", color: "#fff", border: "none", borderRadius: 5, padding: "4px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            + {rowCount === 1 ? "Row" : "Rows"}
          </button>
        </div>
        {/* Export dropdown */}
        <div style={{ position: "relative", flexShrink: 0 }} ref={exportRef}>
          <button
            onClick={() => setShowExport((s) => !s)}
            style={{ background: "#F5F4F1", color: "#555", border: "1px solid #E8E6E0", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            Export ▾
          </button>
          {showExport && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#fff", border: "1px solid #E8E6E0", borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 20, minWidth: 120, overflow: "hidden" }}>
              {([
                { label: "CSV", action: () => { exportCsv(title, columns, rows); setShowExport(false) } },
                { label: "XLSX", action: () => { exportXlsx(title, columns, rows); setShowExport(false) } },
                { label: "PDF", action: () => { exportPdf(title, columns, rows); setShowExport(false) } },
              ] as const).map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{ display: "block", width: "100%", padding: "9px 16px", background: "none", border: "none", textAlign: "left", fontSize: 13, color: "#1A1A1A", cursor: "pointer", fontFamily: "inherit" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F4F1")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {confirmDelete ? (
          <>
            <span style={{ fontSize: 12, color: "#555" }}>Delete sheet?</span>
            <button onClick={() => onDelete(sheet.id)} style={{ background: "#C0392B", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Yes</button>
            <button onClick={() => setConfirmDelete(false)} style={{ background: "#F0EEE8", color: "#555", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ background: "#FDECEA", color: "#C0392B", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Delete
          </button>
        )}
      </div>

      {/* Grid */}
      <div ref={gridRef} style={{ flex: 1, overflow: "auto", padding: "16px 24px 32px" }}>
        {columns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 13 }}>
            Click <strong style={{ color: "#7F77DD" }}>+ Column</strong> to add your first column.
          </div>
        ) : (
          <table style={{ borderCollapse: "collapse", tableLayout: "fixed", fontSize: 13 }}>
            <thead>
              <tr>
                {/* Row number header */}
                <th style={{ width: 40, minWidth: 40, border: "1px solid #E8E6E0", background: "#F5F4F1", padding: 0 }} />
                {columns.map((col) => (
                  <th
                    key={col.id}
                    style={{ border: "1px solid #E8E6E0", background: "#F5F4F1", padding: 0, minWidth: DEFAULT_COL_WIDTH, maxWidth: DEFAULT_COL_WIDTH, position: "relative" }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {editingHeader === col.id ? (
                        <input
                          autoFocus
                          value={col.name}
                          onChange={(e) => renameColumn(col.id, e.target.value)}
                          onBlur={() => setEditingHeader(null)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingHeader(null) }}
                          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 12, fontWeight: 600, color: "#1A1A1A", fontFamily: "inherit", padding: "6px 8px" }}
                        />
                      ) : (
                        <span
                          onDoubleClick={() => setEditingHeader(col.id)}
                          style={{ flex: 1, padding: "6px 8px", fontSize: 12, fontWeight: 600, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "default", userSelect: "none" }}
                          title={`${col.name} — double-click to rename`}
                        >
                          {col.name}
                        </span>
                      )}
                      <button
                        onClick={() => deleteColumn(col.id)}
                        title="Delete column"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: "2px 4px", fontSize: 13, lineHeight: 1, flexShrink: 0, marginRight: 2 }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#C0392B")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#ccc")}
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row.id}>
                  {/* Row number + delete */}
                  <td style={{ width: 40, minWidth: 40, border: "1px solid #E8E6E0", background: "#F5F4F1", textAlign: "center", position: "relative" }} className="sheet-row-num">
                    <span className="sheet-row-label" style={{ fontSize: 11, color: "#bbb", userSelect: "none" }}>{ri + 1}</span>
                    <button
                      onClick={() => deleteRow(row.id)}
                      title="Delete row"
                      className="sheet-row-del"
                      style={{ display: "none", position: "absolute", inset: 0, width: "100%", height: "100%", background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 13 }}
                    >
                      ×
                    </button>
                  </td>
                  {columns.map((col, ci) => (
                    <td key={col.id} style={cellStyle(ri, ci)} onClick={() => setSelected({ rowIdx: ri, colIdx: ci })}>
                      <input
                        value={row.cells[col.id] ?? ""}
                        onChange={(e) => setCell(row.id, col.id, e.target.value)}
                        onFocus={() => setSelected({ rowIdx: ri, colIdx: ci })}
                        onKeyDown={(e) => handleCellKeyDown(e, ri, ci)}
                        style={{
                          width: "100%", border: "none", outline: "none", background: "transparent",
                          fontSize: 13, color: "#1A1A1A", fontFamily: "inherit",
                          padding: "6px 8px", boxSizing: "border-box",
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
