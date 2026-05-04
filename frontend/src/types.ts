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
