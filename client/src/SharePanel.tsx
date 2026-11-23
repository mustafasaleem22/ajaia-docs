import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from './api'
import { errorMessage } from './util'
import type { Share, ShareRole, User } from './types'

interface Props {
  docId: string
  shares: Share[]
  onChange: (shares: Share[]) => void
}

export function SharePanel({ docId, shares, onChange }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ShareRole>('viewer')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .users()
      .then(setUsers)
      .catch((e) => setError(errorMessage(e)))
  }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!email) {
      setError('Choose a person to share with')
      return
    }
    setBusy(true)
    setError('')
    try {
      onChange(await api.share(docId, email, role))
      setEmail('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(userId: number) {
    setError('')
    try {
      onChange(await api.unshare(docId, userId))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="card share">
      <h3>Share this document</h3>
      <form className="row" onSubmit={add}>
        <select value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Person">
          <option value="">Choose a person…</option>
          {users.map((u) => (
            <option key={u.id} value={u.email}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value as ShareRole)} aria-label="Access level">
          <option value="viewer">Can view</option>
          <option value="editor">Can edit</option>
        </select>
        <button className="primary" disabled={busy}>
          Share
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {shares.length === 0 ? (
        <p className="muted small">Not shared with anyone yet.</p>
      ) : (
        <ul className="sharelist">
          {shares.map((s) => (
            <li key={s.user_id}>
              <span>
                {s.name} <span className="muted small">({s.email})</span>
              </span>
              <span className={`badge ${s.role}`}>{s.role === 'editor' ? 'Can edit' : 'View only'}</span>
              <button className="link" onClick={() => remove(s.user_id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
