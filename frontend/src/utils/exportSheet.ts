import { SheetColumn, SheetRow } from "../types"

function safeFilename(title: string) {
  return (title.trim() || "sheet").replace(/[/\\?%*:|"<>]/g, "_")
}

function filterData(columns: SheetColumn[], rows: SheetRow[]) {
  const activeCols = columns.filter((c) => rows.some((r) => (r.cells[c.id] ?? "").trim() !== ""))
  const activeRows = rows.filter((r) => activeCols.some((c) => (r.cells[c.id] ?? "").trim() !== ""))
  return { columns: activeCols, rows: activeRows }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── CSV ───────────────────────────────────────────────────────────────────────

export function exportCsv(title: string, columns: SheetColumn[], rows: SheetRow[]) {
  ;({ columns, rows } = filterData(columns, rows))
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    columns.map((c) => esc(c.name)).join(","),
    ...rows.map((r) => columns.map((c) => esc(r.cells[c.id] ?? "")).join(",")),
  ]
  download(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" }), `${safeFilename(title)}.csv`)
}

// ── XLSX ──────────────────────────────────────────────────────────────────────

export async function exportXlsx(title: string, columns: SheetColumn[], rows: SheetRow[]) {
  ;({ columns, rows } = filterData(columns, rows))
  const XLSX = await import("xlsx")
  const data = [
    columns.map((c) => c.name),
    ...rows.map((r) => columns.map((c) => r.cells[c.id] ?? "")),
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, (title || "Sheet").slice(0, 31))
  XLSX.writeFile(wb, `${safeFilename(title)}.xlsx`)
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export async function exportPdf(title: string, columns: SheetColumn[], rows: SheetRow[]) {
  ;({ columns, rows } = filterData(columns, rows))
  const { default: jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")
  const doc = new jsPDF({ orientation: "landscape" })
  doc.setFontSize(14)
  doc.text(title || "Sheet", 14, 14)
  autoTable(doc, {
    head: [columns.map((c) => c.name)],
    body: rows.map((r) => columns.map((c) => r.cells[c.id] ?? "")),
    startY: 20,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [127, 119, 221] },
    alternateRowStyles: { fillColor: [249, 248, 245] },
  })
  doc.save(`${safeFilename(title)}.pdf`)
}
