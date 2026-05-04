import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, Cell,
} from "recharts"
import { Project, ConfigItem } from "../types"

interface Props {
  projects: Project[]
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

function dueByMonth(projects: Project[], months: ReturnType<typeof last6Months>) {
  return months.map(({ key, label }) => {
    const inMonth = projects.filter((p) => p.due_date.slice(0, 7) === key)
    return {
      label,
      Done: inMonth.filter((p) => p.internal_status === "Done").length,
      Open: inMonth.filter((p) => p.internal_status !== "Done").length,
    }
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

const PRIORITY_COLORS: Record<string, string> = {
  low: "#1D9E75",
  medium: "#C07D15",
  high: "#D85A30",
  urgent: "#C0392B",
  critical: "#C0392B",
}

function priorityColor(name: string): string {
  return PRIORITY_COLORS[name.trim().toLowerCase()] ?? "#7F77DD"
}

function priorityCounts(projects: Project[]) {
  const map = new Map<string, number>()
  projects.forEach((p) => {
    const k = (p.priority || "Unset").trim() || "Unset"
    map.set(k, (map.get(k) ?? 0) + 1)
  })
  const order = ["Urgent", "Critical", "High", "Medium", "Low", "Unset"]
  return [...map.entries()]
    .map(([name, Tasks]) => ({ name, Tasks, color: priorityColor(name) }))
    .sort((a, b) => {
      const ai = order.findIndex((o) => o.toLowerCase() === a.name.toLowerCase())
      const bi = order.findIndex((o) => o.toLowerCase() === b.name.toLowerCase())
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
}

function upcomingBuckets(projects: Project[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const open = projects.filter((p) => p.internal_status !== "Done")
  const buckets = [
    { name: "Overdue", min: -Infinity, max: -1, color: "#C0392B" },
    { name: "Today", min: 0, max: 0, color: "#D85A30" },
    { name: "≤3d", min: 1, max: 3, color: "#C07D15" },
    { name: "≤7d", min: 4, max: 7, color: "#2B7FD4" },
    { name: "≤14d", min: 8, max: 14, color: "#7F77DD" },
    { name: "14d+", min: 15, max: Infinity, color: "#1D9E75" },
  ]
  return buckets.map((b) => ({
    name: b.name,
    Tasks: open.filter((p) => {
      const diff = Math.round((new Date(p.due_date + "T00:00:00").getTime() - today.getTime()) / 86400000)
      return diff >= b.min && diff <= b.max
    }).length,
    color: b.color,
  }))
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

function assigneeCompletion(projects: Project[]) {
  const map = new Map<string, { total: number; done: number }>()
  projects.forEach((p) => {
    const key = (p.assignee || "Unassigned").trim() || "Unassigned"
    const r = map.get(key) ?? { total: 0, done: 0 }
    r.total++
    if (p.internal_status === "Done") r.done++
    map.set(key, r)
  })
  const palette = ["#7F77DD", "#2B7FD4", "#1D9E75", "#C07D15", "#D85A30", "#C0392B", "#8E44AD", "#16A085"]
  return [...map.entries()]
    .map(([name, r], i) => ({
      name,
      Rate: r.total > 0 ? Math.round((r.done / r.total) * 100) : 0,
      total: r.total,
      color: palette[i % palette.length],
    }))
    .sort((a, b) => b.total - a.total)
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

export function InsightCharts({ projects, brands }: Props) {
  if (projects.length === 0) return null

  const months = last6Months()
  const dueData = dueByMonth(projects, months)
  const trendData = createdVsDone(projects, months)
  const aging = agingBuckets(projects)
  const priorities = priorityCounts(projects)
  const upcoming = upcomingBuckets(projects)
  const brandComp = brandCompletion(projects, brands)
  const assigneeComp = assigneeCompletion(projects)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>

      {/* Row 1: Created vs Completed | Aging Open Tasks */}
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

      {/* Row 2: Priority Breakdown | Upcoming Deadlines */}
      <div className="insight-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "stretch" }}>
        <div style={CARD}>
          <h2 style={T}>Priority Breakdown</h2>
          <span style={SUB}>How many tasks fall into each priority level?</span>
          {priorities.length === 0 ? (
            <div style={{ fontSize: 13, color: "#999" }}>No priority data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorities} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "#555" }} axisLine={false} tickLine={false} width={72} />
                <Tooltip content={<Tip />} cursor={{ fill: "#F9F8F5" }} />
                <Bar dataKey="Tasks" radius={[0, 6, 6, 0]}>
                  {priorities.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={CARD}>
          <h2 style={T}>Upcoming Deadlines</h2>
          <span style={SUB}>Open tasks bucketed by days until due.</span>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={upcoming} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} width={24} />
              <Tooltip content={<Tip />} cursor={{ fill: "#F9F8F5" }} />
              <Bar dataKey="Tasks" radius={[6, 6, 0, 0]}>
                {upcoming.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Tasks by Due Month — full width, Open vs Done */}
      <div style={CARD}>
        <h2 style={T}>Tasks by Due Month</h2>
        <span style={SUB}>Open vs completed tasks per month.</span>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dueData} barSize={28} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} width={24} />
            <Tooltip content={<Tip />} cursor={{ fill: "#F9F8F5" }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="Open" stackId="a" fill="#7F77DD" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Done" stackId="a" fill="#1D9E75" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Row 4: Completion Rate per Brand | Completion Rate per Assignee */}
      <div className="insight-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        {brandComp.length > 0 && (
          <div style={CARD}>
            <h2 style={T}>Completion Rate per Brand</h2>
            <span style={SUB}>Which brand has the most done tasks? Which is dragging?</span>
            <ResponsiveContainer width="100%" height={Math.max(140, brandComp.length * 44)}>
              <BarChart data={brandComp} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "#555" }} axisLine={false} tickLine={false} width={72} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Completion Rate"]} cursor={{ fill: "#F9F8F5" }} />
                <Bar dataKey="Rate" radius={[0, 6, 6, 0]}>
                  {brandComp.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {assigneeComp.length > 0 && (
          <div style={CARD}>
            <h2 style={T}>Completion Rate per Assignee</h2>
            <span style={SUB}>Who is closing out their tasks?</span>
            <ResponsiveContainer width="100%" height={Math.max(140, assigneeComp.length * 44)}>
              <BarChart data={assigneeComp} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE8" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: "#999" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: "#555" }} axisLine={false} tickLine={false} width={84} />
                <Tooltip formatter={(v: number, _n, p) => [`${v}% (${(p?.payload as { total: number })?.total ?? 0} tasks)`, "Completion Rate"]} cursor={{ fill: "#F9F8F5" }} />
                <Bar dataKey="Rate" radius={[0, 6, 6, 0]}>
                  {assigneeComp.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  )
}
