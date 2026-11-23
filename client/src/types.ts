export type Role = 'owner' | 'editor' | 'viewer'
export type ShareRole = 'editor' | 'viewer'

export interface User {
  id: number
  email: string
  name: string
}

export interface DocSummary {
  id: string
  title: string
  updated_at: string
  owner_id: number
  owner_name: string
  role: Role
}

export interface Share {
  user_id: number
  name: string
  email: string
  role: ShareRole
}

export interface DocFull {
  id: string
  title: string
  content: string
  updated_at: string
  role: Role
  owner: { id: number; name: string }
  shares?: Share[]
}
