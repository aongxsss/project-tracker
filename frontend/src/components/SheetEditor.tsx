import { useCallback, useEffect, useRef, useState } from "react"
import { Sheet, SheetColumn, SheetRow, MergeRegion } from "../types"
import { exportCsv, exportXlsx, exportPdf } from "../utils/exportSheet"

interface SheetCreatePayload {
  title?: string
  columns?: SheetColumn[]
  rows?: SheetRow[]
  merges?: MergeRegion[]
}

interface Props {
  sheet: Sheet
  onUpdate: (id: string, patch: { title?: string; columns?: SheetColumn[]; rows?: SheetRow[]; merges?: MergeRegion[] }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onImport?: (payload: SheetCreatePayload) => Promise<void>
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

const DEFAULT_COL_WIDTH = 140

interface Range { r1: number; c1: number; r2: number; c2: number }

const norm = (r: Range): Range => ({
  r1: Math.min(r.r1, r.r2),
  c1: Math.min(r.c1, r.c2),
  r2: Math.max(r.r1, r.r2),
  c2: Math.max(r.c1, r.c2),
})

const intersects = (a: Range, b: Range) =>
  a.r1 <= b.r2 && a.r2 >= b.r1 && a.c1 <= b.c2 && a.c2 >= b.c1

const contains = (a: Range, r: number, c: number) =>
  r >= a.r1 && r <= a.r2 && c >= a.c1 && c <= a.c2

async function parseImportFile(file: File): Promise<SheetCreatePayload | null> {
  const XLSX = await import("xlsx")
  const buf = await file.arrayBuffer()
  const isText = /\.(csv|tsv|txt)$/i.test(file.name)
  const wb = isText
    ? XLSX.read(new TextDecoder("utf-8").decode(buf), { type: "string" })
    : XLSX.read(buf, { type: "array", codepage: 65001 })
  const wsName = wb.SheetNames[0]
  if (!wsName) return null
  const ws = wb.Sheets[wsName]
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" })
  if (aoa.length === 0) return { title: stripExt(file.name), columns: [], rows: [], merges: [] }

  const headerRow = (aoa[0] as unknown[]).map((v) => String(v ?? ""))
  const dataRows = aoa.slice(1) as unknown[][]
  const maxCols = Math.max(headerRow.length, ...dataRows.map((r) => r.length), 0)

  const columns: SheetColumn[] = []
  for (let i = 0; i < maxCols; i++) {
    columns.push({ id: uid(), name: (headerRow[i] || "").trim() || `Column ${i + 1}` })
  }

  const rows: SheetRow[] = dataRows.map((row) => {
    const cells: Record<string, string> = {}
    for (let i = 0; i < columns.length; i++) {
      const v = row[i]
      cells[columns[i].id] = v === undefined || v === null ? "" : String(v)
    }
    return { id: uid(), cells }
  })

  const merges: MergeRegion[] = []
  const wsMerges = (ws["!merges"] as { s: { r: number; c: number }; e: { r: number; c: number } }[] | undefined) ?? []
  for (const m of wsMerges) {
    if (m.e.r === 0) continue
    const r1 = Math.max(0, m.s.r - 1)
    const r2 = m.e.r - 1
    if (r2 < r1) continue
    merges.push({ r1, c1: m.s.c, r2, c2: m.e.c })
  }

  return { title: stripExt(file.name), columns, rows, merges }
}

function stripExt(name: string) {
  return name.replace(/\.[^.]+$/, "") || "Imported Sheet"
}

export function SheetEditor({ sheet, onUpdate, onDelete, onImport }: Props) {
  const [title, setTitle] = useState(sheet.title)
  const [columns, setColumns] = useState<SheetColumn[]>(sheet.columns)
  const [rows, setRows] = useState<SheetRow[]>(sheet.rows)
  const [merges, setMerges] = useState<MergeRegion[]>(sheet.merges ?? [])
  const [selection, setSelection] = useState<Range | null>(null)
  const [editingHeader, setEditingHeader] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [colCount, setColCount] = useState(1)
  const [rowCount, setRowCount] = useState(1)
  const [showExport, setShowExport] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSent = useRef({ title: sheet.title, columns: sheet.columns, rows: sheet.rows, merges: sheet.merges ?? [] })
  const gridRef = useRef<HTMLDivElement>(null)
  const dragAnchorRef = useRef<{ r: number; c: number } | null>(null)

  useEffect(() => {
    const up = () => { dragAnchorRef.current = null }
    window.addEventListener("mouseup", up)
    return () => window.removeEventListener("mouseup", up)
  }, [])

  useEffect(() => {
    setTitle(sheet.title)
    setColumns(sheet.columns)
    setRows(sheet.rows)
    setMerges(sheet.merges ?? [])
    setSelection(null)
    setEditingHeader(null)
    lastSent.current = { title: sheet.title, columns: sheet.columns, rows: sheet.rows, merges: sheet.merges ?? [] }
  }, [sheet.id])

  const queueSave = useCallback((next: { title: string; columns: SheetColumn[]; rows: SheetRow[]; merges: MergeRegion[] }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const patch: { title?: string; columns?: SheetColumn[]; rows?: SheetRow[]; merges?: MergeRegion[] } = {}
      if (next.title !== lastSent.current.title) patch.title = next.title
      if (JSON.stringify(next.columns) !== JSON.stringify(lastSent.current.columns)) patch.columns = next.columns
      if (JSON.stringify(next.rows) !== JSON.stringify(lastSent.current.rows)) patch.rows = next.rows
      if (JSON.stringify(next.merges) !== JSON.stringify(lastSent.current.merges)) patch.merges = next.merges
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

  const update = (next: { title?: string; columns?: SheetColumn[]; rows?: SheetRow[]; merges?: MergeRegion[] }) => {
    const merged = {
      title: next.title ?? title,
      columns: next.columns ?? columns,
      rows: next.rows ?? rows,
      merges: next.merges ?? merges,
    }
    if (next.title !== undefined) setTitle(merged.title)
    if (next.columns !== undefined) setColumns(merged.columns)
    if (next.rows !== undefined) setRows(merged.rows)
    if (next.merges !== undefined) setMerges(merged.merges)
    queueSave(merged)
  }

  const findMergeAt = (r: number, c: number) => merges.find((m) => contains(m, r, c))

  const expandSelection = (s: Range): Range => {
    let cur = norm(s)
    let changed = true
    while (changed) {
      changed = false
      for (const m of merges) {
        if (intersects(cur, m)) {
          const next = {
            r1: Math.min(cur.r1, m.r1), c1: Math.min(cur.c1, m.c1),
            r2: Math.max(cur.r2, m.r2), c2: Math.max(cur.c2, m.c2),
          }
          if (next.r1 !== cur.r1 || next.r2 !== cur.r2 || next.c1 !== cur.c1 || next.c2 !== cur.c2) {
            cur = next; changed = true
          }
        }
      }
    }
    return cur
  }

  const expanded = selection ? expandSelection(selection) : null

  const inSelection = (r: number, c: number) => expanded ? contains(expanded, r, c) : false
  const isFocusCell = (r: number, c: number) => selection !== null && r === selection.r1 && c === selection.c1 && r === selection.r2 && c === selection.c2

  const canMerge = (() => {
    if (!expanded) return false
    if (expanded.r1 === expanded.r2 && expanded.c1 === expanded.c2) return false
    const fits = merges.some((m) => m.r1 === expanded.r1 && m.r2 === expanded.r2 && m.c1 === expanded.c1 && m.c2 === expanded.c2)
    return !fits
  })()

  const canUnmerge = expanded ? merges.some((m) => intersects(m, expanded)) : false

  const doMerge = () => {
    if (!expanded || !canMerge) return
    const e = expanded
    const remaining = merges.filter((m) => !(m.r1 >= e.r1 && m.r2 <= e.r2 && m.c1 >= e.c1 && m.c2 <= e.c2))
    update({ merges: [...remaining, e] })
    setSelection(e)
  }

  const doUnmerge = () => {
    if (!expanded || !canUnmerge) return
    const e = expanded
    const remaining = merges.filter((m) => !intersects(m, e))
    update({ merges: remaining })
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
    const ci = columns.findIndex((c) => c.id === colId)
    if (ci < 0) return
    const nextCols = columns.filter((c) => c.id !== colId)
    const nextRows = rows.map((r) => {
      const cells = { ...r.cells }
      delete cells[colId]
      return { ...r, cells }
    })
    const nextMerges = merges
      .map<MergeRegion | null>((m) => {
        if (ci < m.c1) return { ...m, c1: m.c1 - 1, c2: m.c2 - 1 }
        if (ci > m.c2) return m
        if (m.c1 === m.c2) return null
        return { ...m, c2: m.c2 - 1 }
      })
      .filter((m): m is MergeRegion => m !== null && (m.r1 < m.r2 || m.c1 < m.c2))
    update({ columns: nextCols, rows: nextRows, merges: nextMerges })
    setSelection(null)
  }

  const deleteRow = (rowId: string) => {
    const ri = rows.findIndex((r) => r.id === rowId)
    if (ri < 0) return
    const nextRows = rows.filter((r) => r.id !== rowId)
    const nextMerges = merges
      .map<MergeRegion | null>((m) => {
        if (ri < m.r1) return { ...m, r1: m.r1 - 1, r2: m.r2 - 1 }
        if (ri > m.r2) return m
        if (m.r1 === m.r2) return null
        return { ...m, r2: m.r2 - 1 }
      })
      .filter((m): m is MergeRegion => m !== null && (m.r1 < m.r2 || m.c1 < m.c2))
    update({ rows: nextRows, merges: nextMerges })
    setSelection(null)
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
      if (nextCol >= 0 && nextCol < columns.length) setSelection({ r1: rowIdx, c1: nextCol, r2: rowIdx, c2: nextCol })
      else if (!e.shiftKey && nextCol === columns.length && rowIdx < rows.length - 1) setSelection({ r1: rowIdx + 1, c1: 0, r2: rowIdx + 1, c2: 0 })
      else if (e.shiftKey && nextCol < 0 && rowIdx > 0) setSelection({ r1: rowIdx - 1, c1: columns.length - 1, r2: rowIdx - 1, c2: columns.length - 1 })
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (rowIdx < rows.length - 1) setSelection({ r1: rowIdx + 1, c1: colIdx, r2: rowIdx + 1, c2: colIdx })
      else { addRow(); setSelection({ r1: rowIdx + 1, c1: colIdx, r2: rowIdx + 1, c2: colIdx }) }
    } else if (e.key === "Escape") {
      setSelection(null)
    } else if (e.key === "ArrowUp" && rowIdx > 0) {
      e.preventDefault(); setSelection({ r1: rowIdx - 1, c1: colIdx, r2: rowIdx - 1, c2: colIdx })
    } else if (e.key === "ArrowDown" && rowIdx < rows.length - 1) {
      e.preventDefault(); setSelection({ r1: rowIdx + 1, c1: colIdx, r2: rowIdx + 1, c2: colIdx })
    }
  }

  const handleImportPick = async (file: File | null) => {
    if (!file || !onImport) return
    setImportBusy(true)
    setImportError(null)
    try {
      const payload = await parseImportFile(file)
      if (!payload) { setImportError("Empty file"); return }
      await onImport(payload)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImportBusy(false)
    }
  }

  const cellStyle = (ri: number, ci: number): React.CSSProperties => {
    const selected = inSelection(ri, ci)
    const focus = isFocusCell(ri, ci)
    return {
      border: `1px solid ${selected ? "#7F77DD" : "#E8E6E0"}`,
      outline: focus ? "1px solid #7F77DD" : "none",
      outlineOffset: -1,
      padding: 0,
      minWidth: DEFAULT_COL_WIDTH,
      background: selected ? "#FAF9FF" : "#fff",
      position: "relative",
      verticalAlign: "top",
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 24px 12px", borderBottom: "1px solid #E8E6E0", background: "#fff", flexShrink: 0, flexWrap: "wrap" }}>
        <input
          value={title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Untitled Sheet"
          style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", flex: 1, minWidth: 160 }}
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

        {/* Merge / Unmerge */}
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={doMerge}
            disabled={!canMerge}
            title="Merge selected cells (Shift+click to extend selection)"
            style={{
              background: canMerge ? "#fff" : "#FAFAF8", color: canMerge ? "#7F77DD" : "#bbb",
              border: `1px solid ${canMerge ? "#D4D1F0" : "#E8E6E0"}`, borderRadius: 7,
              padding: "5px 12px", fontSize: 12, fontWeight: 500,
              cursor: canMerge ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            ⊟ Merge
          </button>
          <button
            onClick={doUnmerge}
            disabled={!canUnmerge}
            title="Unmerge cells in selection"
            style={{
              background: canUnmerge ? "#fff" : "#FAFAF8", color: canUnmerge ? "#7F77DD" : "#bbb",
              border: `1px solid ${canUnmerge ? "#D4D1F0" : "#E8E6E0"}`, borderRadius: 7,
              padding: "5px 12px", fontSize: 12, fontWeight: 500,
              cursor: canUnmerge ? "pointer" : "not-allowed", fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            ⊞ Unmerge
          </button>
        </div>

        {/* Import */}
        {onImport && (
          <>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                handleImportPick(f)
                e.target.value = ""
              }}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={importBusy}
              title="Import XLSX / CSV as new sheet"
              style={{
                background: "#fff", color: "#555", border: "1px solid #E8E6E0", borderRadius: 7,
                padding: "5px 12px", fontSize: 12, fontWeight: 500,
                cursor: importBusy ? "wait" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                opacity: importBusy ? 0.6 : 1,
              }}
            >
              {importBusy ? "Importing…" : "↑ Import"}
            </button>
          </>
        )}

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

      {importError && (
        <div style={{ background: "#FDECEA", color: "#C0392B", borderBottom: "1px solid #F5C0BA", padding: "8px 24px", fontSize: 13, flexShrink: 0 }}>
          Import error: {importError}
        </div>
      )}

      {/* Grid */}
      <div ref={gridRef} style={{ flex: 1, overflow: "auto", padding: "16px 24px 32px" }}>
        {columns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#bbb", fontSize: 13 }}>
            Click <strong style={{ color: "#7F77DD" }}>+ Column</strong> to add your first column, or <strong style={{ color: "#7F77DD" }}>↑ Import</strong> a file.
          </div>
        ) : (
          <table style={{ borderCollapse: "collapse", tableLayout: "fixed", fontSize: 13 }}>
            <thead>
              <tr>
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
                  {columns.map((col, ci) => {
                    const m = findMergeAt(ri, ci)
                    if (m && !(m.r1 === ri && m.c1 === ci)) return null
                    const rowSpan = m ? m.r2 - m.r1 + 1 : 1
                    const colSpan = m ? m.c2 - m.c1 + 1 : 1
                    return (
                      <td
                        key={col.id}
                        rowSpan={rowSpan}
                        colSpan={colSpan}
                        style={cellStyle(ri, ci)}
                        onMouseDown={(e) => {
                          if (e.target !== e.currentTarget) return
                          const input = e.currentTarget.querySelector("input")
                          if (e.shiftKey) {
                            e.preventDefault()
                            if (selection) setSelection({ r1: selection.r1, c1: selection.c1, r2: ri, c2: ci })
                            else setSelection({ r1: ri, c1: ci, r2: ri, c2: ci })
                            return
                          }
                          e.preventDefault()
                          dragAnchorRef.current = { r: ri, c: ci }
                          setSelection({ r1: ri, c1: ci, r2: ri, c2: ci })
                          input?.focus()
                        }}
                        onMouseEnter={() => {
                          const a = dragAnchorRef.current
                          if (!a) return
                          if (a.r === ri && a.c === ci) return
                          setSelection({ r1: a.r, c1: a.c, r2: ri, c2: ci })
                        }}
                      >
                        <input
                          value={row.cells[col.id] ?? ""}
                          onChange={(e) => setCell(row.id, col.id, e.target.value)}
                          onMouseDown={(e) => {
                            if (e.shiftKey) {
                              e.preventDefault()
                              if (selection) setSelection({ r1: selection.r1, c1: selection.c1, r2: ri, c2: ci })
                              else setSelection({ r1: ri, c1: ci, r2: ri, c2: ci })
                              return
                            }
                            // If already focused in this cell, let cursor positioning work.
                            if (document.activeElement === e.currentTarget) return
                            e.preventDefault()
                            dragAnchorRef.current = { r: ri, c: ci }
                            setSelection({ r1: ri, c1: ci, r2: ri, c2: ci })
                            e.currentTarget.focus()
                          }}
                          onFocus={() => { if (!selection || !isFocusCell(ri, ci)) setSelection({ r1: ri, c1: ci, r2: ri, c2: ci }) }}
                          onKeyDown={(e) => handleCellKeyDown(e, ri, ci)}
                          style={{
                            width: "100%", border: "none", outline: "none", background: "transparent",
                            fontSize: 13, color: "#1A1A1A", fontFamily: "inherit",
                            padding: "6px 8px", boxSizing: "border-box",
                          }}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
