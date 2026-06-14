export type Brand = string

export interface Project {
  id: string
  brand: Brand
  customer_name: string
  name: string
  start_date: string | null
  due_date: string
  internal_status: string
  client_status: string
  assignee: string
  priority: string
  comment: string
  description: string
  final_link: string
  created_at: string
}

export interface Thread {
  id: string
  project_id: string
  display_name: string
  message: string
  created_at: string
}

export interface Attachment {
  id: string
  project_id: string
  original_name: string
  content_type: string
  file_size: number
  created_at: string
}

export type ProjectInput = Omit<Project, "id" | "created_at">

export interface ConfigItem {
  name: string
  color: string
}

export interface Note {
  id: string
  title: string
  content: string
  color: string
  pinned: boolean
  position: number
  created_at: string
  updated_at: string
}

export type NoteInput = Pick<Note, "title" | "content" | "color" | "pinned">
export type NotePatch = Partial<Pick<Note, "title" | "content" | "color" | "pinned">>

export interface SheetColumn {
  id: string
  name: string
}

export interface SheetRow {
  id: string
  cells: Record<string, string>
}

export interface MergeRegion {
  r1: number
  c1: number
  r2: number
  c2: number
}

export interface Sheet {
  id: string
  title: string
  columns: SheetColumn[]
  rows: SheetRow[]
  merges: MergeRegion[]
  position: number
  created_at: string
  updated_at: string
}
