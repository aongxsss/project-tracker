function hexBg(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},0.13)`
  } catch {
    return "#F0F0F0"
  }
}

interface Props {
  brand: string
  color: string
}

export function BrandBadge({ brand, color }: Props) {
  return (
    <span
      style={{
        background: hexBg(color),
        color,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {brand}
    </span>
  )
}
