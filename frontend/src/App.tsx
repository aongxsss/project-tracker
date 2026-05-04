import { useState, useEffect } from "react"
import { Sidebar } from "./components/Sidebar"
import { Overview } from "./components/Overview"
import { Tracking } from "./components/Tracking"
import { ManageModal } from "./components/ManageModal"
import { LoginPage } from "./components/LoginPage"
import { useProjects } from "./hooks/useProjects"
import { useFilters } from "./hooks/useFilters"
import { useConfig } from "./hooks/useConfig"
import { useAuth } from "./hooks/useAuth"

type Page = "overview" | "tracking"

export default function App() {
  const [page, setPage] = useState<Page>("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const { user, loading: authLoading, login, register, logout, saveNotes } = useAuth()
  const isAuthenticated = !authLoading && !!user
  const { projects, loading, error, addProject, updateProject, deleteProject } = useProjects(isAuthenticated)
  const { brands, statuses, addBrand, updateBrand, deleteBrand, addStatus, updateStatus, deleteStatus } = useConfig(isAuthenticated)
  const { activeBrands, toggleBrand, filteredProjects } = useFilters(brands)

  const filtered = filteredProjects(projects)

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F4F1", fontFamily: "'DM Sans', sans-serif" }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={login} onRegister={register} />
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F5F4F1", fontFamily: "'DM Sans', sans-serif" }}>
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        brands={brands}
        activeBrands={activeBrands}
        onToggleBrand={toggleBrand}
        trackingCount={projects.length}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onManage={() => setManageOpen(true)}
        user={user}
        onLogout={logout}
      />

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile header */}
        <div
          className="mobile-header"
          style={{ display: "none", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", borderBottom: "1px solid #E8E6E0" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, minHeight: 44, minWidth: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <img src="/favicon.svg" alt="" width={30} height={30} />
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1A1A1A" }}>Project Tracker</span>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="spinner" />
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#C0392B", fontSize: 14, padding: 32, textAlign: "center" }}>
            Could not reach the API: {error}. Is the backend running?
          </div>
        ) : page === "overview" ? (
          <Overview projects={filtered} allProjects={projects} brands={brands} statuses={statuses} notes={user?.notes ?? ""} onSaveNotes={saveNotes} />
        ) : (
          <Tracking
            projects={filtered}
            totalCount={projects.length}
            brands={brands}
            statuses={statuses}
            currentUserName={user.display_name}
            onAdd={addProject}
            onUpdate={updateProject}
            onDelete={deleteProject}
          />
        )}
      </main>

      {manageOpen && (
        <ManageModal
          brands={brands}
          statuses={statuses}
          projects={projects}
          onAddBrand={addBrand}
          onUpdateBrand={updateBrand}
          onDeleteBrand={deleteBrand}
          onAddStatus={addStatus}
          onUpdateStatus={updateStatus}
          onDeleteStatus={deleteStatus}
          onClose={() => setManageOpen(false)}
        />
      )}
    </div>
  )
}
