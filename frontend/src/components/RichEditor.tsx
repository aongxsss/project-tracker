import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react"

export type FormatCmd = "bold" | "italic" | "underline" | "strikeThrough" | "insertUnorderedList" | "insertOrderedList" | "removeFormat"

export interface RichEditorHandle {
  exec: (cmd: FormatCmd) => void
  active: Record<string, boolean>
}

interface Props {
  value: string
  onChange: (html: string) => void
  onActiveChange?: (active: Record<string, boolean>) => void
  placeholder?: string
  minHeight?: number
  onFocusChange?: (focused: boolean) => void
}

const CMDS: FormatCmd[] = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList", "removeFormat"]

export const RichEditor = forwardRef<RichEditorHandle, Props>(function RichEditor(
  { value, onChange, onActiveChange, placeholder = "Take a note…", minHeight = 60, onFocusChange },
  ref,
) {
  const domRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const activeRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    if (domRef.current && domRef.current.innerHTML !== value) {
      domRef.current.innerHTML = value
    }
  }, [value])

  const updateActive = useCallback(() => {
    const next: Record<string, boolean> = {}
    CMDS.forEach((cmd) => {
      try { next[cmd] = document.queryCommandState(cmd) } catch { next[cmd] = false }
    })
    activeRef.current = next
    onActiveChange?.(next)
  }, [onActiveChange])

  const exec = useCallback((cmd: FormatCmd) => {
    domRef.current?.focus()
    document.execCommand(cmd, false)
    updateActive()
    onChange(domRef.current?.innerHTML ?? "")
  }, [onChange, updateActive])

  useImperativeHandle(ref, () => ({ exec, active: activeRef.current }), [exec])

  const handleInput = () => {
    onChange(domRef.current?.innerHTML ?? "")
    updateActive()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase()
      if (k === "b") { e.preventDefault(); exec("bold") }
      else if (k === "i") { e.preventDefault(); exec("italic") }
      else if (k === "u") { e.preventDefault(); exec("underline") }
    }
  }

  const isEmpty = !value || value === "<br>" || value === "<div><br></div>" || value.replace(/<[^>]+>/g, "").trim() === ""

  return (
    <div style={{ position: "relative" }}>
      {isEmpty && !focused && (
        <span style={{ position: "absolute", top: 0, left: 0, color: "#bbb", fontSize: 13, pointerEvents: "none" }}>
          {placeholder}
        </span>
      )}
      <div
        ref={domRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={updateActive}
        onMouseUp={updateActive}
        onFocus={() => { setFocused(true); onFocusChange?.(true); updateActive() }}
        onBlur={() => { setFocused(false); onFocusChange?.(false) }}
        style={{
          outline: "none",
          fontSize: 13,
          lineHeight: 1.55,
          color: "#1A1A1A",
          minHeight,
          wordBreak: "break-word",
        }}
        className="rich-editor-content"
      />
    </div>
  )
})
