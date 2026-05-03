export type Brand = string
export type Status = string

export interface Project {
  id: string
  brand: Brand
  pm: string
  name: string
  due_date: string
  status: Status
  comment: string
  created_at: string
}

export type ProjectInput = Omit<Project, "id" | "created_at">

export interface ConfigItem {
  name: string
  color: string
}
