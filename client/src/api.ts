import type { DocFull, DocSummary, Share, ShareRole, User } from './types'

const TOKEN_KEY = 'ajaia_token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be blocked (private mode); the app still works until reload.
  }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...options, headers })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/login') {
      window.dispatchEvent(new Event('auth-expired'))
    }
    const message = (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`
    throw new ApiError(res.status, message)
  }
  return data as T
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/me'),
  users: () => request<User[]>('/users'),
  listDocs: () => request<DocSummary[]>('/documents'),
  createDoc: (title?: string) =>
    request<{ id: string }>('/documents', { method: 'POST', body: JSON.stringify({ title }) }),
  getDoc: (id: string) => request<DocFull>(`/documents/${id}`),
  saveDoc: (id: string, patch: { title?: string; content?: string; baseUpdatedAt: string }) =>
    request<{ updated_at: string }>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteDoc: (id: string) => request<{ ok: true }>(`/documents/${id}`, { method: 'DELETE' }),
  share: (id: string, email: string, role: ShareRole) =>
    request<Share[]>(`/documents/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  unshare: (id: string, userId: number) =>
    request<Share[]>(`/documents/${id}/share/${userId}`, { method: 'DELETE' }),
  importFile: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ id: string }>('/documents/import', { method: 'POST', body: form })
  },
}
