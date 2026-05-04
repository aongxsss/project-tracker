import { useEffect, useRef, useState, useCallback } from "react"
import { Project, ProjectInput, ConfigItem } from "../types"
import { BrandBadge } from "./BrandBadge"
import { StatusBadge } from "./StatusBadge"
import { useProjectThreads } from "../hooks/useProjectThreads"
import { useProjectAttachments } from "../hooks/useProjectAttachments"

interface Props {
  project: Project
  brands: ConfigItem[]
  statuses: ConfigItem[]
  clientStatuses: ConfigItem[]
  priorities: ConfigItem[]
  onEdit: () => void
  onDelete: () => Promise<void>
  onUpdate: (id: string, data: ProjectInput) => Promise<void>
  onClose: () => void
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatMsgTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function daysLabel(due: string, status: string): { text: string; color: string } | null {
  if (status === "Done") return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(due + "T00:00:00").getTime() - today.getTime()) / 86400000)
  if (diff === 0) return { text: "Due today", color: "#C07D15" }
  if (diff > 0) return { text: `Due in ${diff}d`, color: diff <= 3 ? "#C07D15" : "#888" }
  return { text: `${Math.abs(diff)}d overdue`, color: "#C0392B" }
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?"
}

function fileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return "🖼"
  if (contentType === "application/pdf") return "📄"
  if (contentType.includes("word") || contentType.includes("document")) return "📝"
  if (contentType.includes("sheet") || contentType.includes("excel") || contentType.includes("csv")) return "📊"
  if (contentType.includes("zip") || contentType.includes("rar") || contentType.includes("tar")) return "🗜"
  if (contentType.includes("video")) return "🎬"
  if (contentType.startsWith("audio/")) return "🎵"
  return "📎"
}

// token format: 📎[id|contentType]:label  (contentType optional for old messages)
const ATTACH_RE = /^📎\[([a-f0-9-]{36})(?:\|([^\]]*))?\]:(.+)$/

function ThreadImage({ src }: { src: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoke = ""
    fetch(src, { credentials: "include" })
      .then((r) => r.ok ? r.blob() : Promise.reject())
      .then((b) => { revoke = URL.createObjectURL(b); setBlobUrl(revoke) })
      .catch(() => setFailed(true))
    return () => { if (revoke) URL.revokeObjectURL(revoke) }
  }, [src])

  if (failed) return null
  if (!blobUrl) return <div style={{ width: 120, height: 80, background: "#F0EFF9", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#bbb" }}>Loading…</div>
  return <img src={blobUrl} alt="" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 6, display: "block", cursor: "pointer" }} onClick={() => window.open(blobUrl, "_blank")} />
}

function AttachChip({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} download style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#F0EFF9", border: "1px solid #D4D1F0", borderRadius: 6, padding: "4px 10px 4px 7px", fontSize: 12, color: "#7F77DD", textDecoration: "none", fontWeight: 500 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
      {label}
    </a>
  )
}

function renderMessage(message: string, getDownloadUrl: (id: string) => string, previewImages = true) {
  return message.split("\n").map((line, i) => {
    const m = line.match(ATTACH_RE)
    if (m) {
      const [, id, contentType, label] = m
      const url = getDownloadUrl(id)
      if (previewImages && contentType?.startsWith("image/")) {
        return (
          <div key={i} style={{ marginTop: i > 0 ? 6 : 0 }}>
            <ThreadImage src={url} />
            <a href={url} download style={{ fontSize: 11, color: "#7F77DD", textDecoration: "none", display: "inline-block", marginTop: 4 }}>{label}</a>
          </div>
        )
      }
      return <div key={i} style={{ marginTop: i > 0 ? 4 : 0 }}><AttachChip url={url} label={label} /></div>
    }
    return <div key={i} style={{ marginTop: i > 0 ? 2 : 0 }}>{line || " "}</div>
  })
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

type LeftTab = "description" | "attachments"

export function ProjectDetail({
  project,
  brands,
  statuses,
  clientStatuses,
  priorities,
  onEdit,
  onDelete,
  onUpdate,
  onClose,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [leftTab, setLeftTab] = useState<LeftTab>("description")

  // Description inline edit
  const [desc, setDesc] = useState(project.description)
  const [descSaving, setDescSaving] = useState(false)
  const descTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Threads
  const { threads, loading: threadsLoading, postThread, deleteThread } = useProjectThreads(project.id)
  const [msgDraft, setMsgDraft] = useState("")
  const [sending, setSending] = useState(false)
  const threadsEndRef = useRef<HTMLDivElement>(null)
  const [hoveredThread, setHoveredThread] = useState<string | null>(null)

  // Attachments
  const { attachments, loading: attachLoading, upload, remove, downloadUrl } = useProjectAttachments(project.id)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Description edit/preview
  const [descEditing, setDescEditing] = useState(false)
  const descTextareaRef = useRef<HTMLTextAreaElement>(null)
  const descFileInputRef = useRef<HTMLInputElement>(null)
  const [descDragOver, setDescDragOver] = useState(false)

  // Thread file attach (staged until Send)
  const threadFileInputRef = useRef<HTMLInputElement>(null)
  const [pendingThreadFiles, setPendingThreadFiles] = useState<File[]>([])
  const [threadUploading, setThreadUploading] = useState(false)

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [onClose])

  useEffect(() => {
    if (threadsEndRef.current) {
      threadsEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [threads])

  // Sync desc when project updates from parent
  useEffect(() => { setDesc(project.description) }, [project.description])

  const saveDesc = useCallback(async (value: string) => {
    setDescSaving(true)
    try {
      const input: ProjectInput = {
        brand: project.brand,
        customer_name: project.customer_name,
        name: project.name,
        start_date: project.start_date,
        due_date: project.due_date,
        internal_status: project.internal_status,
        client_status: project.client_status,
        assignee: project.assignee,
        priority: project.priority,
        comment: project.comment,
        description: value,
      }
      await onUpdate(project.id, input)
    } finally {
      setDescSaving(false)
    }
  }, [project, onUpdate])

  const handleDescChange = (value: string) => {
    setDesc(value)
    if (descTimer.current) clearTimeout(descTimer.current)
    descTimer.current = setTimeout(() => saveDesc(value), 1500)
  }

  const handleSendMsg = async () => {
    const msg = msgDraft.trim()
    if (!msg && pendingThreadFiles.length === 0) return
    setSending(true)
    setThreadUploading(pendingThreadFiles.length > 0)
    try {
      const fileParts: string[] = []
      for (const file of pendingThreadFiles) {
        const a = await upload(file)
        fileParts.push(`📎[${a.id}|${a.content_type}]:${a.original_name} (${formatBytes(a.file_size)})`)
      }
      const combined = [msg, ...fileParts].filter(Boolean).join("\n")
      await postThread(combined)
      setMsgDraft("")
      setPendingThreadFiles([])
    } finally {
      setSending(false)
      setThreadUploading(false)
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadError(null)
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        await upload(file)
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleUpload(e.dataTransfer.files)
  }

  const handleDescAttach = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploadError(null)
    setUploading(true)
    try {
      const ta = descTextareaRef.current
      const cursor = ta ? ta.selectionEnd : desc.length
      let next = desc
      for (const file of Array.from(files)) {
        const a = await upload(file)
        const token = `📎[${a.id}|${a.content_type}]:${a.original_name} (${formatBytes(a.file_size)})`
        next = next.slice(0, cursor) + (next.length && next[cursor - 1] !== "\n" ? "\n" : "") + token + "\n" + next.slice(cursor)
      }
      setDesc(next)
      if (descTimer.current) clearTimeout(descTimer.current)
      descTimer.current = setTimeout(() => saveDesc(next), 1500)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleThreadAttach = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const fileArray = Array.from(files)   // snapshot before input is cleared
    if (threadFileInputRef.current) threadFileInputRef.current.value = ""
    setPendingThreadFiles((prev: File[]) => [...prev, ...fileArray])
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  const bc = brands.find((b) => b.name === project.brand)?.color ?? "#888888"
  const sc = statuses.find((s) => s.name === project.internal_status)?.color ?? "#888888"
  const csc = clientStatuses.find((s) => s.name === project.client_status)?.color ?? "#888888"
  const pc = priorities.find((p) => p.name === project.priority)?.color ?? "#888888"
  const dueLabel = daysLabel(project.due_date, project.internal_status)

  const metaItem = (label: string, value: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "6px 0", borderBottom: "1px solid #F4F2EC" }}>
      <div style={{ width: 116, flexShrink: 0, fontSize: 12, color: "#999", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#1A1A1A", flex: 1 }}>{value}</div>
    </div>
  )

  const tabBtn = (tab: LeftTab, label: string) => (
    <button
      onClick={() => setLeftTab(tab)}
      style={{
        background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
        fontSize: 13, fontWeight: 500, padding: "8px 14px",
        color: leftTab === tab ? "#7F77DD" : "#888",
        borderBottom: leftTab === tab ? "2px solid #7F77DD" : "2px solid transparent",
        marginBottom: -1,
      }}
    >
      {label}
    </button>
  )

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
      className="modal-backdrop"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        className="detail-dialog"
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 1140,
          height: "88vh",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 64px rgba(0,0,0,0.22)",
          overflow: "hidden",
          animation: "fadeScaleIn 0.2s ease-out",
        }}
      >
        {/* ───── TOP HEADER BAR ───── */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #F0EEE8", display: "flex", alignItems: "center", gap: 12, background: "#FAFAF8", flexShrink: 0 }}>
          <BrandBadge brand={project.brand} color={bc} />
          <span style={{ fontSize: 12, color: "#bbb" }}>/</span>
          <span style={{ fontSize: 12, color: "#999", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.customer_name}</span>
          <span style={{ fontSize: 12, color: "#bbb" }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={onEdit}
              style={{ padding: "6px 14px", border: "1px solid #E8E6E0", borderRadius: 7, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#444", display: "flex", alignItems: "center", gap: 5 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              Edit
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#bbb", lineHeight: 1, padding: "4px 8px", display: "flex", alignItems: "center" }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ───── TWO-COLUMN BODY ───── */}
        <div className="detail-body" style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── LEFT PANE ── */}
          <div className="detail-left" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

            {/* Project title */}
            <div style={{ padding: "20px 24px 12px", flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1A1A1A", lineHeight: 1.3, wordBreak: "break-word" }}>{project.name}</h2>
            </div>

            {/* Meta fields */}
            <div style={{ padding: "0 24px", flexShrink: 0 }}>
              {metaItem("Status", <StatusBadge status={project.internal_status} color={sc} />)}
              {metaItem("Client Status", project.client_status
                ? <StatusBadge status={project.client_status} color={csc} />
                : <span style={{ color: "#ccc" }}>—</span>)}
              {metaItem("Priority", project.priority
                ? <StatusBadge status={project.priority} color={pc} />
                : <span style={{ color: "#ccc" }}>—</span>)}
              {metaItem("Assignee", project.assignee
                ? <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#7F77DD", color: "#fff", fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {initials(project.assignee)}
                    </span>
                    {project.assignee}
                  </span>
                : <span style={{ color: "#ccc" }}>Unassigned</span>)}
              {metaItem("Start", <span style={{ color: project.start_date ? "#333" : "#ccc" }}>{formatDate(project.start_date)}</span>)}
              {metaItem("Final Date", (
                <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: dueLabel?.color === "#C0392B" ? "#C0392B" : "#333", fontWeight: dueLabel?.color === "#C0392B" ? 600 : 400 }}>{formatDate(project.due_date)}</span>
                  {dueLabel && <span style={{ fontSize: 11, color: dueLabel.color }}>· {dueLabel.text}</span>}
                </span>
              ))}
              {project.comment && metaItem("Comment", <span style={{ color: "#555", fontStyle: "italic" }}>{project.comment}</span>)}
            </div>

            {/* Tabs */}
            <div style={{ padding: "12px 24px 0", borderBottom: "1px solid #F0EEE8", flexShrink: 0, display: "flex", gap: 0 }}>
              {tabBtn("description", "Description")}
              {tabBtn("attachments", `Attachments${attachments.length > 0 ? ` (${attachments.length})` : ""}`)}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>

              {leftTab === "description" && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 0 }}
                  onDragOver={(e) => { e.preventDefault(); setDescDragOver(true) }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDescDragOver(false) }}
                  onDrop={(e) => { e.preventDefault(); setDescDragOver(false); handleDescAttach(e.dataTransfer.files) }}
                >
                  <input ref={descFileInputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => { handleDescAttach(e.target.files); e.target.value = "" }} />

                  {/* Toolbar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => setDescEditing(false)}
                        style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid", cursor: "pointer", fontFamily: "inherit", background: !descEditing ? "#7F77DD" : "#fff", color: !descEditing ? "#fff" : "#888", borderColor: !descEditing ? "#7F77DD" : "#E8E6E0" }}
                      >Preview</button>
                      <button
                        onClick={() => { setDescEditing(true); setTimeout(() => descTextareaRef.current?.focus(), 50) }}
                        style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid", cursor: "pointer", fontFamily: "inherit", background: descEditing ? "#7F77DD" : "#fff", color: descEditing ? "#fff" : "#888", borderColor: descEditing ? "#7F77DD" : "#E8E6E0" }}
                      >Edit</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {uploading && <span style={{ fontSize: 11, color: "#bbb" }}>Uploading…</span>}
                      {!uploading && <span style={{ fontSize: 11, color: "#bbb" }}>{descSaving ? "Saving…" : "Auto-saved"}</span>}
                      <button
                        onClick={() => descFileInputRef.current?.click()}
                        title="Attach file"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 6px", borderRadius: 6, color: "#999", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                        <span style={{ fontSize: 12 }}>Attach</span>
                      </button>
                    </div>
                  </div>

                  {/* Drag overlay */}
                  {descDragOver && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(127,119,221,0.08)", border: "2px dashed #7F77DD", borderRadius: 8, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <span style={{ fontSize: 15, color: "#7F77DD", fontWeight: 600 }}>Drop to attach</span>
                    </div>
                  )}

                  {/* Preview mode */}
                  {!descEditing && (
                    <div
                      onClick={() => { setDescEditing(true); setTimeout(() => descTextareaRef.current?.focus(), 50) }}
                      style={{ minHeight: 120, fontSize: 14, lineHeight: 1.7, color: desc ? "#1A1A1A" : "#bbb", cursor: "text", padding: "12px 14px", border: "1px solid transparent", borderRadius: 8 }}
                    >
                      {desc
                        ? renderMessage(desc, downloadUrl, false)
                        : "Click to add description, notes, key links… Drop or attach files to embed them inline."}
                    </div>
                  )}

                  {/* Edit mode */}
                  {descEditing && (
                    <textarea
                      ref={descTextareaRef}
                      value={desc}
                      onChange={(e) => handleDescChange(e.target.value)}
                      onBlur={() => setDescEditing(false)}
                      placeholder="Add project description, notes, brief, key links…"
                      style={{
                        width: "100%",
                        minHeight: 200,
                        resize: "vertical",
                        border: "1px solid #7F77DD",
                        borderRadius: 8,
                        padding: "12px 14px",
                        fontSize: 14,
                        fontFamily: "inherit",
                        lineHeight: 1.65,
                        color: "#1A1A1A",
                        outline: "none",
                        background: "#FAFAF8",
                        boxSizing: "border-box",
                      }}
                    />
                  )}

                  {uploadError && <div style={{ fontSize: 12, color: "#C0392B", marginTop: 6 }}>{uploadError}</div>}
                </div>
              )}

              {leftTab === "attachments" && (
                <div>
                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? "#7F77DD" : "#D8D6D0"}`,
                      borderRadius: 10,
                      padding: "24px 16px",
                      textAlign: "center",
                      cursor: "pointer",
                      background: dragOver ? "#F3F2FF" : "#FAFAF8",
                      marginBottom: 16,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
                    <div style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>
                      {uploading ? "Uploading…" : "Drop files or click to upload"}
                    </div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 3 }}>Max 10 MB per file</div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                  {uploadError && (
                    <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 12 }}>{uploadError}</div>
                  )}

                  {/* File list */}
                  {attachLoading ? (
                    <div style={{ fontSize: 13, color: "#999" }}>Loading…</div>
                  ) : attachments.length === 0 ? (
                    <div style={{ fontSize: 13, color: "#bbb", textAlign: "center", marginTop: 8 }}>No attachments yet</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {attachments.map((a) => (
                        <div
                          key={a.id}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1px solid #F0EEE8", borderRadius: 8, background: "#FAFAF8" }}
                        >
                          <span style={{ fontSize: 20, flexShrink: 0 }}>{fileIcon(a.content_type)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.original_name}</div>
                            <div style={{ fontSize: 11, color: "#999" }}>{formatBytes(a.file_size)} · {formatMsgTime(a.created_at)}</div>
                          </div>
                          <a
                            href={downloadUrl(a.id)}
                            download={a.original_name}
                            onClick={(e) => e.stopPropagation()}
                            style={{ padding: "5px 10px", border: "1px solid #E8E6E0", borderRadius: 6, fontSize: 12, color: "#555", textDecoration: "none", background: "#fff", flexShrink: 0 }}
                          >
                            ↓ Download
                          </a>
                          <button
                            onClick={() => remove(a.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 16, padding: "4px 6px", flexShrink: 0 }}
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Delete confirm */}
            <div style={{ padding: "12px 24px", borderTop: "1px solid #F0EEE8", display: "flex", alignItems: "center", gap: 10, background: "#FCFBF8", flexShrink: 0 }}>
              {confirmDelete ? (
                <>
                  <span style={{ fontSize: 13, color: "#555" }}>Delete this project?</span>
                  <button onClick={handleDelete} disabled={deleting} style={{ padding: "6px 14px", background: "#C0392B", color: "#fff", border: "none", borderRadius: 7, cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13 }}>
                    {deleting ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} style={{ padding: "6px 14px", border: "1px solid #E8E6E0", borderRadius: 7, background: "#fff", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: "#555" }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#C0392B", padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                  Delete project
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT PANE — THREADS ── */}
          <div
            className="detail-right"
            style={{ width: 360, flexShrink: 0, borderLeft: "1px solid #F0EEE8", display: "flex", flexDirection: "column", background: "#FAFAF8" }}
          >
            {/* Thread header */}
            <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid #F0EEE8", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>Threads</span>
              {threads.length > 0 && <span style={{ fontSize: 11, color: "#bbb", marginLeft: 2 }}>{threads.length}</span>}
            </div>

            {/* Message list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              {threadsLoading ? (
                <div style={{ fontSize: 12, color: "#bbb", textAlign: "center", marginTop: 20 }}>Loading…</div>
              ) : threads.length === 0 ? (
                <div style={{ fontSize: 12, color: "#ccc", textAlign: "center", marginTop: 24, lineHeight: 1.6 }}>
                  No messages yet.<br />Start the conversation.
                </div>
              ) : (
                threads.map((t) => (
                  <div
                    key={t.id}
                    onMouseEnter={() => setHoveredThread(t.id)}
                    onMouseLeave={() => setHoveredThread(null)}
                    style={{ position: "relative" }}
                  >
                    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", background: "#7F77DD", color: "#fff",
                        fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {initials(t.display_name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A1A" }}>{t.display_name}</span>
                          <span style={{ fontSize: 10, color: "#bbb" }}>{formatMsgTime(t.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#333", lineHeight: 1.55, wordBreak: "break-word", background: "#fff", borderRadius: 8, padding: "8px 10px", border: "1px solid #EEEDE8", display: "flex", flexDirection: "column", gap: 2 }}>
                          {renderMessage(t.message, downloadUrl)}
                        </div>
                      </div>
                    </div>
                    {hoveredThread === t.id && (
                      <button
                        onClick={() => deleteThread(t.id)}
                        style={{ position: "absolute", top: 4, right: 0, background: "none", border: "none", cursor: "pointer", color: "#C0392B", fontSize: 14, padding: "2px 5px", opacity: 0.7 }}
                        title="Delete message"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))
              )}
              <div ref={threadsEndRef} />
            </div>

            {/* Compose */}
            <div
              style={{ padding: "10px 16px 14px", borderTop: "1px solid #F0EEE8", flexShrink: 0 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleThreadAttach(e.dataTransfer.files) }}
            >
              <input ref={threadFileInputRef} type="file" multiple style={{ display: "none" }} onChange={(e) => handleThreadAttach(e.target.files)} />
              {pendingThreadFiles.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {pendingThreadFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F0EFF9", border: "1px solid #D4D1F0", borderRadius: 7, padding: "5px 8px 5px 8px", fontSize: 12, color: "#444" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{f.name}</span>
                        <span style={{ fontSize: 10, color: "#999" }}>{formatBytes(f.size)}</span>
                      </div>
                      <button
                        onClick={() => setPendingThreadFiles((prev: File[]) => prev.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: 15, lineHeight: 1, padding: "0 2px", marginLeft: 2, flexShrink: 0 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                value={msgDraft}
                onChange={(e) => setMsgDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMsg() }
                }}
                placeholder="Message… (Enter to send, Shift+Enter for newline)"
                rows={2}
                style={{
                  width: "100%",
                  resize: "none",
                  border: "1px solid #E8E6E0",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  background: "#fff",
                  boxSizing: "border-box",
                  marginBottom: 8,
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  onClick={() => threadFileInputRef.current?.click()}
                  disabled={threadUploading}
                  title="Attach file"
                  style={{ background: "none", border: "none", cursor: threadUploading ? "not-allowed" : "pointer", padding: "4px 6px", borderRadius: 6, color: threadUploading ? "#ccc" : "#999", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  {threadUploading && <span style={{ fontSize: 11 }}>Uploading…</span>}
                </button>
                <button
                  onClick={handleSendMsg}
                  disabled={sending || (!msgDraft.trim() && pendingThreadFiles.length === 0)}
                  style={{
                    padding: "7px 18px",
                    background: sending || (!msgDraft.trim() && pendingThreadFiles.length === 0) ? "#C4C0F0" : "#7F77DD",
                    color: "#fff",
                    border: "none",
                    borderRadius: 7,
                    cursor: sending || (!msgDraft.trim() && pendingThreadFiles.length === 0) ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
