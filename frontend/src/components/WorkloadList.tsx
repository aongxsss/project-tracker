import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface Item {
  name: string
  color: string
  count: number
}

interface Props {
  title: string
  items: Item[]
  total: number
  emptyText?: string
}

export function WorkloadList({ title, items, total, emptyText = "No data yet" }: Props) {
  const pieData = items
    .filter((i) => i.count > 0)
    .map((i) => ({
      ...i,
      value: i.count,
      pct: total > 0 ? Math.round((i.count / total) * 100) : 0,
    }))

  return (
    <div style={{ background: "#fff", border: "1px solid #E8E6E0", borderRadius: 12, padding: "20px 24px", minHeight: 160 }}>
      <h2 className="section-title" style={{ fontSize: 15, fontWeight: 500, margin: "0 0 4px", color: "#1A1A1A" }}>
        {title}
      </h2>
      {pieData.length === 0 ? (
        <div style={{ fontSize: 13, color: "#999", marginTop: 12 }}>{emptyText}</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={140}>
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
                <span style={{ flex: 1, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                <span style={{ fontWeight: 600, color: "#1A1A1A" }}>{d.value}</span>
                <span style={{ color: "#bbb", minWidth: 32, textAlign: "right" }}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
