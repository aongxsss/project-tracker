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
