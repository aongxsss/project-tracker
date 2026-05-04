import { ConfigItem } from "../types"
import { AuthUser } from "../hooks/useAuth"

function hexBg(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},0.13)`
  } catch {
    return "#F5F4F1"
  }
}

type Page = "overview" | "tracking" | "notes"

interface Props {
  activePage: Page
  onNavigate: (page: Page) => void
  brands: ConfigItem[]
  activeBrands: string[]
  onToggleBrand: (brand: string) => void
  trackingCount: number
  isOpen: boolean
  onClose: () => void
  onManage: () => void
  user: AuthUser
  onLogout: () => void
}

const NavIcon = ({ page }: { page: Page }) => {
  if (page === "overview") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    )
  }
  if (page === "notes") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
    </svg>
  )
}

const GearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export function Sidebar({
  activePage, onNavigate,
  brands, activeBrands, onToggleBrand,
  trackingCount, isOpen, onClose, onManage,
  user, onLogout,
}: Props) {
  const navItem = (page: Page, label: string) => {
    const active = activePage === page
    return (
      <button
        onClick={() => { onNavigate(page); onClose() }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 12px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          width: "100%",
          background: active ? "#F0EFFF" : "transparent",
          color: active ? "#7F77DD" : "#555",
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: active ? 500 : 400,
          textAlign: "left",
          transition: "background 0.15s",
          minHeight: 44,
        }}
        aria-label={label}
      >
        <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          <NavIcon page={page} />
        </span>
        <span className="sidebar-label">{label}</span>
        {page === "tracking" && (
          <span
            className="sidebar-label"
            style={{
              marginLeft: "auto",
              background: active ? "#7F77DD" : "#E8E6E0",
              color: active ? "#fff" : "#666",
              borderRadius: 999,
              padding: "0 7px",
              fontSize: 11,
              fontWeight: 600,
              minWidth: 20,
              textAlign: "center",
              lineHeight: "18px",
            }}
          >
            {trackingCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99 }}
          className="mobile-backdrop"
        />
      )}
      <aside
        className={`sidebar${isOpen ? " sidebar-open" : ""}`}
        style={{
          width: 240,
          height: "100vh",
          position: "sticky",
          top: 0,
          overflowY: "auto",
          background: "#fff",
          borderRight: "1px solid #E8E6E0",
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px 16px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 32, paddingLeft: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="sidebar-label">
            <img src="/favicon.svg" alt="" width={36} height={36} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: "#1A1A1A" }}>Project Tracker</span>
          </div>
          <div className="sidebar-icon-only" style={{ display: "none" }}>
            <img src="/favicon.svg" alt="Project Tracker" width={36} height={36} />
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navItem("overview", "Overview")}
          {navItem("tracking", "Tracking")}
          {navItem("notes", "Notes")}
        </nav>

        {/* Filters */}
        <div className="sidebar-label" style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#999", letterSpacing: "0.08em", marginBottom: 12, paddingLeft: 4 }}>
            FILTERS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {brands.map((brand) => {
              const checked = activeBrands.includes(brand.name)
              return (
                <button
                  key={brand.name}
                  onClick={() => onToggleBrand(brand.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: checked ? hexBg(brand.color) : "transparent",
                    border: "none",
                    width: "100%",
                    textAlign: "left",
                    transition: "background 0.15s",
                    minHeight: 40,
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: checked ? `2px solid ${brand.color}` : "2px solid #D0CEC8",
                      background: checked ? brand.color : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: checked ? brand.color : "#555" }}>
                    {brand.name}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Manage button */}
        <button
          onClick={onManage}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 8,
            padding: "11px 16px",
            borderRadius: 10,
            border: "1.5px solid #E8E6E0",
            cursor: "pointer",
            width: "100%",
            background: "#fff",
            color: "#555",
            fontFamily: "inherit",
            fontSize: 14,
            fontWeight: 500,
            textAlign: "center",
            transition: "background 0.15s, border-color 0.15s",
            minHeight: 44,
            marginTop: 8,
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#F0EFFF"
            e.currentTarget.style.borderColor = "#7F77DD"
            e.currentTarget.style.color = "#7F77DD"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff"
            e.currentTarget.style.borderColor = "#E8E6E0"
            e.currentTarget.style.color = "#555"
          }}
        >
          <GearIcon />
          <span className="sidebar-label">Manage</span>
        </button>

        {/* User card */}
        <div
          className="sidebar-label"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: "#F5F4F1",
            borderRadius: 10,
            marginTop: 8,
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "#7F77DD", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 600, flexShrink: 0,
          }}>
            {user.display_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.display_name}</div>
            <div style={{ fontSize: 11, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", padding: 4, display: "flex", alignItems: "center", flexShrink: 0, minHeight: 28, minWidth: 28 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#C0392B")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

      </aside>
    </>
  )
}
