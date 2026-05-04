import { useState } from "react"
import { Project, ConfigItem } from "../types"

interface Props {
  projects: Project[]
  brands: ConfigItem[]
  statuses: ConfigItem[]
  compact?: boolean
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function todayKey(): string {
  return toKey(new Date())
}

function getMonthGrid(year: number, month: number): { date: Date; current: boolean }[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDow = (first.getDay() + 6) % 7 // Mon = 0

  const grid: { date: Date; current: boolean }[] = []
  for (let i = startDow; i > 0; i--)
    grid.push({ date: new Date(year, month, 1 - i), current: false })
  for (let d = 1; d <= last.getDate(); d++)
    grid.push({ date: new Date(year, month, d), current: true })
  while (grid.length < 42)
    grid.push({ date: new Date(year, month + 1, grid.length - startDow - last.getDate() + 1), current: false })
  return grid
}

function getWeekDays(ref: Date): Date[] {
  const dow = (ref.getDay() + 6) % 7
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ref)
    d.setDate(ref.getDate() - dow + i)
    return d
  })
}

export function ProjectCalendar({ projects, brands, statuses, compact = false }: Props) {
  const [view, setView] = useState<"month" | "week">("month")
  const [ref, setRef] = useState(() => new Date())
  const [selected, setSelected] = useState<string | null>(null)

  const bc = (name: string) => brands.find((b) => b.name === name)?.color ?? "#888"
  const sc = (name: string) => statuses.find((s) => s.name === name)?.color ?? "#888"
  const tk = todayKey()

  const tasksOn = (date: Date) =>
    projects.filter((p) => p.due_date === toKey(date))

  const navigate = (dir: number) => {
    const d = new Date(ref)
    if (view === "month") d.setMonth(d.getMonth() + dir)
    else d.setDate(d.getDate() + dir * 7)
    setRef(d)
    setSelected(null)
  }

  const title =
    view === "month"
      ? ref.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : (() => {
          const days = getWeekDays(ref)
          const s = days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })
          const e = days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          return `${s} – ${e}`
        })()

  const selectedTasks = selected ? projects.filter((p) => p.due_date === selected) : []

  // ── Month view ────────────────────────────────────────────────────────────

  const MonthView = () => {
    const grid = getMonthGrid(ref.getFullYear(), ref.getMonth())
    return (
      <div>
        {/* Weekday headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#999", padding: "4px 0" }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {grid.map(({ date, current }, i) => {
            const key = toKey(date)
            const tasks = tasksOn(date)
            const isToday = key === tk
            const isSel = key === selected
            const isWeekend = i % 7 >= 5

            return (
              <div
                key={i}
                onClick={() => setSelected(isSel ? null : key)}
                style={{
                  minHeight: compact ? 44 : 68,
                  borderRadius: 8,
                  padding: compact ? "4px 6px" : "6px 8px",
                  cursor: "pointer",
                  background: isSel ? "#F0EFFF" : isToday ? "#FAFAF7" : "#fff",
                  border: isSel ? "1.5px solid #7F77DD" : isToday ? "1.5px solid #E8E6E0" : "1px solid #F0EEE8",
                  transition: "background 0.1s",
                  opacity: current ? 1 : 0.3,
                }}
              >
                <div style={{
                  fontSize: compact ? 11 : 12,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? "#7F77DD" : isWeekend ? "#C0392B" : "#555",
                  marginBottom: 3,
                  textAlign: compact ? "center" : "left",
                }}>
                  {date.getDate()}
                </div>
                {/* Dots only in compact mode */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: compact ? "center" : "flex-start" }}>
                  {tasks.slice(0, compact ? 4 : 3).map((t) => (
                    <span key={t.id} title={t.name} style={{
                      width: compact ? 6 : 8, height: compact ? 6 : 8,
                      borderRadius: "50%", background: bc(t.brand),
                      flexShrink: 0, opacity: t.internal_status === "Done" ? 0.4 : 1,
                    }} />
                  ))}
                  {tasks.length > (compact ? 4 : 3) && (
                    <span style={{ fontSize: 8, color: "#999", lineHeight: compact ? "6px" : "8px" }}>
                      +{tasks.length - (compact ? 4 : 3)}
                    </span>
                  )}
                </div>
                {/* Name pills only in non-compact mode */}
                {!compact && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3 }}>
                    {tasks.slice(0, 2).map((t) => (
                      <div key={t.id} style={{
                        fontSize: 10, lineHeight: 1.3,
                        background: bc(t.brand) + "22", color: bc(t.brand),
                        borderRadius: 4, padding: "1px 4px",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        fontWeight: 500,
                      }}>
                        {t.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Week view ─────────────────────────────────────────────────────────────

  const WeekView = () => {
    const days = getWeekDays(ref)
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {days.map((date, i) => {
          const key = toKey(date)
          const tasks = tasksOn(date)
          const isToday = key === tk
          const isWeekend = i >= 5
          return (
            <div key={i} style={{
              borderRadius: 10,
              border: isToday ? "1.5px solid #7F77DD" : "1px solid #F0EEE8",
              background: isToday ? "#FAFAFF" : "#fff",
              padding: "10px 8px",
              minHeight: 160,
            }}>
              <div style={{ marginBottom: 8, textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: isWeekend ? "#C0392B" : "#999" }}>
                  {WEEKDAYS[i]}
                </div>
                <div style={{
                  fontSize: 16, fontWeight: isToday ? 700 : 500,
                  color: isToday ? "#7F77DD" : "#1A1A1A",
                  lineHeight: 1.2,
                }}>
                  {date.getDate()}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {tasks.length === 0 && (
                  <div style={{ fontSize: 11, color: "#ddd", textAlign: "center", marginTop: 8 }}>—</div>
                )}
                {tasks.map((t) => {
                  const isOverdue = t.internal_status !== "Done" && t.due_date < tk
                  return (
                    <div key={t.id} style={{
                      borderRadius: 6, padding: "4px 6px",
                      background: bc(t.brand) + "18",
                      borderLeft: `3px solid ${bc(t.brand)}`,
                      opacity: t.internal_status === "Done" ? 0.5 : 1,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: isOverdue ? "#C0392B" : "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 10, color: "#999", marginTop: 1 }}>{t.customer_name}</div>
                      <div style={{ marginTop: 3 }}>
                        <span style={{ fontSize: 10, background: sc(t.internal_status) + "22", color: sc(t.internal_status), borderRadius: 4, padding: "1px 5px", fontWeight: 500 }}>
                          {t.internal_status}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: "20px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0, color: "#1A1A1A" }}>📅 Task Calendar</h2>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#555" }}>{title}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* View toggle — hidden in compact mode */}
          {!compact && (
            <div style={{ display: "flex", background: "#F5F4F1", borderRadius: 8, padding: 3, gap: 2 }}>
              {(["month", "week"] as const).map((v) => (
                <button key={v} onClick={() => { setView(v); setSelected(null) }}
                  style={{
                    padding: "4px 10px", border: "none", borderRadius: 6, cursor: "pointer",
                    fontSize: 12, fontFamily: "inherit", fontWeight: view === v ? 600 : 400,
                    background: view === v ? "#fff" : "transparent",
                    color: view === v ? "#1A1A1A" : "#888",
                    boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}>
                  {v === "month" ? "Month" : "Week"}
                </button>
              ))}
            </div>
          )}
          {/* Navigation */}
          <button onClick={() => { setRef(new Date()); setSelected(null) }}
            style={{ fontSize: 12, padding: "4px 10px", border: "1px solid #E8E6E0", borderRadius: 7, background: "#fff", cursor: "pointer", fontFamily: "inherit", color: "#555" }}>
            Today
          </button>
          {[["‹", -1], ["›", 1]].map(([label, dir]) => (
            <button key={String(dir)} onClick={() => navigate(Number(dir))}
              style={{ width: 28, height: 28, border: "1px solid #E8E6E0", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 16, color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Brand legend — hidden in compact mode */}
      {!compact && brands.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          {brands.map((b) => (
            <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#555" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
              {b.name}
            </div>
          ))}
        </div>
      )}

      {view === "month" ? <MonthView /> : <WeekView />}

      {/* Selected day detail */}
      {selected && selectedTasks.length > 0 && (
        <div style={{ marginTop: 16, padding: "14px 16px", background: "#F9F8F5", borderRadius: 10, border: "1px solid #E8E6E0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A", marginBottom: 10 }}>
            {new Date(selected + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "#999" }}>{selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedTasks.map((t) => {
              const isOverdue = t.internal_status !== "Done" && t.due_date < tk
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#fff", borderRadius: 8, border: "1px solid #F0EEE8", borderLeft: `4px solid ${bc(t.brand)}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: isOverdue ? "#C0392B" : "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{t.customer_name} · <span style={{ color: bc(t.brand) }}>{t.brand}</span></div>
                  </div>
                  <span style={{ fontSize: 11, background: sc(t.internal_status) + "22", color: sc(t.internal_status), borderRadius: 999, padding: "2px 8px", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {t.internal_status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {selected && selectedTasks.length === 0 && (
        <div style={{ marginTop: 12, fontSize: 13, color: "#999", textAlign: "center", padding: "8px 0" }}>
          No tasks due on {new Date(selected + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </div>
      )}
    </div>
  )
}
