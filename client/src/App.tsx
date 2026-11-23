import { useEffect, useState } from 'react'
import { api, getToken, setToken } from './api'
import type { User } from './types'
import { Login } from './Login'
import { DocList } from './DocList'
import { Editor } from './Editor'

// Hash routing keeps the open document across refresh with no router dependency.
function parseRoute(): string | null {
  const match = window.location.hash.match(/^#\/doc\/([0-9a-f-]{36})$/i)
  return match ? match[1] : null
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(() => getToken() !== null)
  const [docId, setDocId] = useState<string | null>(parseRoute)

  useEffect(() => {
    if (!getToken()) return
    api
      .me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    const onHash = () => setDocId(parseRoute())
    const onExpired = () => {
      setToken(null)
      setUser(null)
    }
    window.addEventListener('hashchange', onHash)
    window.addEventListener('auth-expired', onExpired)
    return () => {
      window.removeEventListener('hashchange', onHash)
      window.removeEventListener('auth-expired', onExpired)
    }
  }, [])

  const openDoc = (id: string) => {
    window.location.hash = `#/doc/${id}`
  }
  const goHome = () => {
    window.location.hash = '#/'
  }
  const logout = () => {
    setToken(null)
    setUser(null)
    window.location.hash = '#/'
  }

  if (checking) return <div className="center muted">Loading…</div>
  if (!user) return <Login onLoggedIn={setUser} />
  if (docId) return <Editor key={docId} id={docId} onBack={goHome} />
  return <DocList user={user} onOpen={openDoc} onLogout={logout} />
}
