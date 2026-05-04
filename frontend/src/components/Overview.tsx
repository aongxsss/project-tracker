import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Project, ConfigItem } from "../types"
import { StatCard } from "./StatCard"
import { BrandBadge } from "./BrandBadge"
import { InsightCharts } from "./InsightCharts"
import { NoteCanvas } from "./NoteCanvas"
import { ProjectCalendar } from "./ProjectCalendar"

function hexBg(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},0.13)`
  } catch { return "#F0F0F0" }
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function daysLabel(due: string, status: string): { text: string; color: string } | null {
  if (status === "Done") return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(due + "T00:00:00").getTime() - today.getTime()) / 86400000)
  if (diff === 0) return { text: "Today", color: "#C07D15" }
  if (diff > 0) return { text: `in ${diff}d`, color: diff <= 3 ? "#C07D15" : "#aaa" }
  return { text: `${Math.abs(diff)}d overdue`, color: "#C0392B" }
}

interface Props {
  projects: Project[]
  allProjects: Project[]
  brands: ConfigItem[]
  statuses: ConfigItem[]
  notes: string
  onSaveNotes: (notes: string) => Promise<void>
}

export function Overview({ projects, allProjects, brands, statuses, notes, onSaveNotes }: Props) {
  const bc = (name: string) => brands.find((b) => b.name === name)?.color ?? "#888888"
  const sc = (name: string) => statuses.find((s) => s.name === name)?.color ?? "#888888"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const total = projects.length
  const done = projects.filter((p) => p.internal_status === "Done").length
  const inProgress = projects.filter((p) => p.internal_status === "In Progress").length
  const urgent = projects.filter((p) => {
    const due = new Date(p.due_date + "T00:00:00")
    return due < today && p.internal_status !== "Done"
  }).length
  const donePct = total > 0 ? Math.round((done / total) * 100) : 0

  const brandCounts = brands.map((b) => ({ brand: b, count: projects.filter((p) => p.brand === b.name).length }))
  const maxBrand = Math.max(...brandCounts.map((b) => b.count), 1)


  const recent = [...projects].sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()).slice(0, 5)

  if (total === 0 && allProjects.length === 0) {
    return (
      <div className="page-content" style={{ padding: "40px 32px", width: "100%", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 24px", color: "#1A1A1A" }}>Overview</h1>
        <div style={{ textAlign: "center", padding: "60px 0", color: "#999", fontSize: 14 }}>
          No tasks yet. Add your first task in Tracking.
        </div>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ padding: "32px 32px 48px", width: "100%", boxSizing: "border-box" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 24px", color: "#1A1A1A" }}>Overview</h1>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Tasks" value={total}>
          <span style={{ fontSize: 12, color: "#888", background: "#F0EFF9", borderRadius: 999, padding: "2px 10px", display: "inline-block", marginTop: 4 }}>All brands</span>
        </StatCard>
        <StatCard label="Completed" value={done}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            <div style={{ height: 6, background: "#E8F5EE", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${donePct}%`, background: "#1D9E75", borderRadius: 999, transition: "width 0.4s" }} />
            </div>
            <span style={{ fontSize: 12, color: "#1D9E75" }}>{donePct}% done</span>
          </div>
        </StatCard>
        <StatCard label="In Progress" value={inProgress}>
          <span style={{ fontSize: 12, color: "#2B7FD4", background: "#E0EDFC", borderRadius: 999, padding: "2px 10px", display: "inline-block", marginTop: 4 }}>Active now</span>
        </StatCard>
        <StatCard label="Urgent" value={urgent}>
          <span style={{ fontSize: 12, color: "#C0392B", background: "#FDECEA", borderRadius: 999, padding: "2px 10px", display: "inline-block", marginTop: 4 }}>Priority</span>
        </StatCard>
      </div>

      {/* Main columns: Left = Notes + Calendar | Right = Recent Activity + Brand Workload + Status Distribution */}
      <div className="overview-columns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <NoteCanvas initialValue={notes} onSave={onSaveNotes} />
          <ProjectCalendar projects={projects} brands={brands} statuses={statuses} compact />
        </div>

        {/* Right: Recent Activity → Brand Workload → Status Distribution */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* 1. Recent Activity */}
          <div style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: "20px 24px" }}>
            <h2 className="section-title" style={{ fontSize: 15, fontWeight: 500, margin: "0 0 16px", color: "#1A1A1A" }}>Recent Activity</h2>
            {recent.length === 0 ? (
              <div style={{ fontSize: 13, color: "#999" }}>No tasks yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {recent.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: sc(p.internal_status), flexShrink: 0, marginTop: 4 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <BrandBadge brand={p.brand} color={bc(p.brand)} /> · {p.customer_name} · Due {formatDate(p.due_date)}
                        {(() => { const l = daysLabel(p.due_date, p.internal_status); return l ? <span style={{ color: l.color, marginLeft: 2 }}>· {l.text}</span> : null })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Brand Workload */}
          <div style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: "20px 24px" }}>
            <h2 className="section-title" style={{ fontSize: 15, fontWeight: 500, margin: "0 0 16px", color: "#1A1A1A" }}>Brand Workload</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {brandCounts.map(({ brand, count }) => (
                <div key={brand.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 56, fontSize: 12, fontWeight: 500, color: brand.color, flexShrink: 0 }}>{brand.name}</span>
                  <div style={{ flex: 1, height: 8, background: hexBg(brand.color), borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(count / maxBrand) * 100}%`, background: brand.color, borderRadius: 999, transition: "width 0.4s" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#555", minWidth: 20, textAlign: "right" }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Status Distribution */}
          {(() => {
            const pieData = statuses.map((s) => ({
              name: s.name,
              value: projects.filter((p) => p.internal_status === s.name).length,
              color: s.color,
              pct: String(Math.round(projects.filter((p) => p.internal_status === s.name).length / (total || 1) * 100)),
            })).filter((d) => d.value > 0)
            return (
              <div style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: "20px 24px" }}>
                <h2 className="section-title" style={{ fontSize: 15, fontWeight: 500, margin: "0 0 4px", color: "#1A1A1A" }}>Status Distribution</h2>
                {pieData.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#999", marginTop: 12 }}>No data yet</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius="48%" outerRadius="78%" paddingAngle={2} dataKey="value">
                          {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [v, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                      {pieData.map((d) => (
                        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: "#555" }}>{d.name}</span>
                          <span style={{ fontWeight: 600, color: "#1A1A1A" }}>{d.value}</span>
                          <span style={{ color: "#bbb", minWidth: 32, textAlign: "right" }}>{d.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })()}

        </div>
      </div>

      <InsightCharts projects={projects} statuses={statuses} brands={brands} />
    </div>
  )
}
