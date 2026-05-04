import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ComposedChart, Cell,
} from "recharts"
import { Project, ConfigItem } from "../types"

interface Props {
  projects: Project[]
  statuses: ConfigItem[]
  brands: ConfigItem[]
}

// ── helpers ───────────────────────────────────────────────────────────────────

function last6Months() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
    }
  })
}

function dueByMonth(projects: Project[], months: ReturnType<typeof last6Months>, statuses: ConfigItem[]) {
  return months.map(({ key, label }) => {
    const row: Record<string, string | number> = { label }
    statuses.forEach((s) => {
      row[s.name] = projects.filter((p) => p.due_date.slice(0, 7) === key && p.internal_status === s.name).length
    })
    return row
  })
}

function createdVsDone(projects: Project[], months: ReturnType<typeof last6Months>) {
  return months.map(({ key, label }) => ({
    label,
    Created: projects.filter((p) => p.created_at.slice(0, 7) === key).length,
    Completed: projects.filter((p) => p.created_at.slice(0, 7) === key && p.internal_status === "Done").length,
  }))
}

function agingBuckets(projects: Project[]) {
  const open = projects.filter((p) => p.internal_status !== "Done")
  const today = Date.now()
  return [
    { name: "0–3d", min: 0, max: 3, color: "#1D9E75" },
    { name: "4–7d", min: 4, max: 7, color: "#2B7FD4" },
    { name: "8–14d", min: 8, max: 14, color: "#C07D15" },
    { name: "15–30d", min: 15, max: 30, color: "#D85A30" },
    { name: "30+d", min: 31, max: Infinity, color: "#C0392B" },
  ].map((b) => ({
    name: b.name,
    Tasks: open.filter((p) => {
      const age = Math.floor((today - new Date(p.created_at).getTime()) / 86400000)
      return age >= b.min && age <= b.max
    }).length,
    color: b.color,
  }))
}

function aeByStatus(projects: Project[], statuses: ConfigItem[]) {
  const aes = [...new Set(projects.map((p) => p.customer_name))].sort()
  return aes.map((ae) => {
    const row: Record<string, string | number> = { name: ae.split(" ")[0] }
    statuses.forEach((s) => { row[s.name] = projects.filter((p) => p.customer_name === ae && p.internal_status === s.name).length })
    return row
  })
}

function aeWorkloadVsOutput(projects: Project[]) {
  const map = new Map<string, { name: string; Total: number; Completed: number }>()
  projects.forEach((p) => {
    if (!map.has(p.customer_name)) map.set(p.customer_name, { name: p.customer_name.split(" ")[0], Total: 0, Completed: 0 })
    const r = map.get(p.customer_name)!
    r.Total++
    if (p.internal_status === "Done") r.Completed++
  })
  return [...map.values()].sort((a, b) => b.Total - a.Total)
}

function brandCompletion(projects: Project[], brands: ConfigItem[]) {
  return brands
    .map((b) => {
      const total = projects.filter((p) => p.brand === b.name).length
      const done = projects.filter((p) => p.brand === b.name && p.internal_status === "Done").length
      return { name: b.name, Rate: total > 0 ? Math.round((done / total) * 100) : 0, color: b.color, total }
    })
    .filter((d) => d.total > 0)
}

// ── shared ────────────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = { background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: "20px 24px" }
const T: React.CSSProperties = { fontSize: 15, fontWeight: 500, margin: "0 0 6px", color: "#1A1A1A" }
const SUB: React.CSSProperties = { fontSize: 12, color: "#999", margin: "0 0 16px", display: "block" }

const Tip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 10, padding: "10px 14px", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,.1)" }}>
      {label && <div style={{ fontWeight: 600, marginBottom: 6, color: "#1A1A1A" }}>{label}</div>}
      {payload.filter((p) => p.value > 0).map((p) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, color: "#555", marginBottom: 3 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          {p.name}: <strong style={{ color: "#1A1A1A", marginLeft: 2 }}>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// ── component ──────────────────────────────────────────────────────────────────

export function InsightCharts({ projects, statuses, brands }: Props) {
  if (projects.length === 0) return null

  const months = last6Months()
  const dueData = dueByMonth(projects, months, statuses)
  const trendData = createdVsDone(projects, months)
  const aging = agingBuckets(projects)
  const aeStatus = aeByStatus(projects, statuses)
  const aePerf = aeWorkloadVsOutput(projects)
  const brandComp = brandCompletion(projects, brands)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>

      {/* Row 1: Created vs Completed | Aging */}
      <div className="insight-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={CARD}>
          <h2 style={T}>Created vs Completed</h2>
          <span style={SUB}>Is the team keeping up with incoming work?</span>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<Tip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Line type="monotone" dataKey="Created" stroke="#7F77DD" strokeWidth={2.5} dot={{ r: 4, fill: "#7F77DD" }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Completed" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 4, fill: "#1D9E75" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={CARD}>
          <h2 style={T}>Aging Open Tasks</h2>
          <span style={SUB}>How long have unfinished tasks been open?</span>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={aging} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<Tip />} cursor={{ fill: "#F9F8F5" }} />
              <Bar dataKey="Tasks" radius={[6, 6, 0, 0]}>
                {aging.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Tasks per AE by Status | Workload vs Output */}
      <div className="insight-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        <div style={CARD}>
          <h2 style={T}>Tasks per AE by Status</h2>
          <span style={SUB}>Who is working on what type of tasks?</span>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={aeStatus} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<Tip />} cursor={{ fill: "#F9F8F5" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              {statuses.map((s, i) => (
                <Bar key={s.name} dataKey={s.name} stackId="a" fill={s.color}
                  radius={i === statuses.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={CARD}>
          <h2 style={T}>Workload vs Output per AE</h2>
          <span style={SUB}>Who is busy but delivering? Who is accumulating?</span>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={aePerf} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<Tip />} cursor={{ fill: "#F9F8F5" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="Total" fill="#E0DEFA" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Completed" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 5, fill: "#1D9E75" }} activeDot={{ r: 7 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Tasks by Due Month — full width */}
      <div style={CARD}>
        <h2 style={T}>Tasks by Due Month</h2>
        <span style={SUB}>Workload breakdown per status across upcoming months</span>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dueData} barSize={24} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} width={24} />
            <Tooltip content={<Tip />} cursor={{ fill: "#F9F8F5" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            {statuses.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} stackId="a" fill={s.color}
                radius={i === statuses.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 4: Completion Rate per Brand — last */}
      {brandComp.length > 0 && (
        <div style={CARD}>
          <h2 style={T}>Completion Rate per Brand</h2>
          <span style={SUB}>Which brand has the most done tasks? Which one is dragging?</span>
          <ResponsiveContainer width="100%" height={Math.max(100, brandComp.length * 52)}>
            <BarChart data={brandComp} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "#555" }} axisLine={false} tickLine={false} width={56} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Completion Rate"]} cursor={{ fill: "#F9F8F5" }} />
              <Bar dataKey="Rate" radius={[0, 6, 6, 0]}>
                {brandComp.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  )
}
