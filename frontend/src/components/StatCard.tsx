interface Props {
  label: string
  value: number
  children?: React.ReactNode
}

export function StatCard({ label, value, children }: Props) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E8E6E0",
        borderRadius: 12,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 13, color: "#888", fontWeight: 400 }}>{label}</span>
      <span className="stat-value" style={{ fontSize: 28, fontWeight: 600, color: "#1A1A1A", lineHeight: 1 }}>
        {value}
      </span>
      {children}
    </div>
  )
}
