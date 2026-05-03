import { useState, useEffect, useRef, FormEvent } from "react"

const API = import.meta.env.VITE_API_URL

interface Props {
  onLogin: (username: string, password: string) => Promise<void>
  onRegister: (username: string, displayName: string, password: string) => Promise<void>
}

export function LoginPage({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [usernameTaken, setUsernameTaken] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setUsernameTaken(null)
    if (mode !== "register" || username.trim().length < 2) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    setCheckingUsername(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/auth/check-username?username=${encodeURIComponent(username.trim())}`)
        const data = await res.json()
        setUsernameTaken(data.taken)
      } catch {
        // ignore
      } finally {
        setCheckingUsername(false)
      }
    }, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [username, mode])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (mode === "register" && (usernameTaken || !usernameFormatOk)) return
    setError(null)
    setLoading(true)
    try {
      if (mode === "login") {
        await onLogin(username, password)
      } else {
        await onRegister(username, displayName, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (invalid?: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${invalid ? "#C0392B" : "#E8E6E0"}`,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    background: "#fff",
    color: "#1A1A1A",
    boxSizing: "border-box",
    minHeight: 46,
  })

  const usernameFormatOk = /^[a-zA-Z0-9._-]+$/.test(username.trim())
  const usernameInvalid = mode === "register" && (usernameTaken === true || (username.trim().length >= 2 && !usernameFormatOk))

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4F1", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E8E6E0", padding: "40px 36px 36px", width: "100%", maxWidth: 400, boxSizing: "border-box", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <img src="/favicon.svg" alt="" width={40} height={40} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1A1A1A" }}>Project Tracker</div>
            <div style={{ fontSize: 12, color: "#999" }}>AE Team</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "#F5F4F1", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {(["login", "register"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(null); setUsername(""); setUsernameTaken(null) }}
              style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: mode === m ? 600 : 400, background: mode === m ? "#fff" : "transparent", color: mode === m ? "#1A1A1A" : "#888", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "#FDECEA", color: "#C0392B", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Username */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#444" }}>Username</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your.username"
                required
                autoFocus
                style={{ ...inputStyle(usernameInvalid), paddingRight: 36 }}
              />
              {/* Availability indicator */}
              {mode === "register" && username.trim().length >= 2 && (
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, lineHeight: 1 }}>
                  {checkingUsername ? (
                    <span style={{ fontSize: 11, color: "#999" }}>…</span>
                  ) : usernameTaken === false ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : usernameTaken === true ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : null}
                </span>
              )}
            </div>
            {mode === "register" && username.trim().length >= 2 && !usernameFormatOk && (
              <span style={{ fontSize: 12, color: "#C0392B" }}>English letters, numbers, . _ - only</span>
            )}
            {mode === "register" && usernameFormatOk && usernameTaken === true && (
              <span style={{ fontSize: 12, color: "#C0392B" }}>Username already taken</span>
            )}
            {mode === "register" && usernameFormatOk && usernameTaken === false && (
              <span style={{ fontSize: 12, color: "#1D9E75" }}>Username available</span>
            )}
          </div>

          {mode === "register" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#444" }}>Display name</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name (shown as AE)" required style={inputStyle()} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#444" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "register" ? "Min. 6 characters" : "••••••••"} required style={inputStyle()} />
          </div>

          <button
            type="submit"
            disabled={loading || (mode === "register" && (usernameTaken === true || (username.trim().length >= 2 && !usernameFormatOk)))}
            style={{ marginTop: 4, padding: "12px 0", background: loading || (mode === "register" && usernameTaken === true) ? "#9E9AE8" : "#7F77DD", color: "#fff", border: "none", borderRadius: 10, cursor: loading || (mode === "register" && usernameTaken === true) ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 600, minHeight: 48, transition: "background 0.15s" }}
          >
            {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  )
}
