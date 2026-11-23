import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { api } from './api'
import { errorMessage, formatDate } from './util'
import type { DocSummary, User } from './types'

interface Props {
  user: User
  onOpen: (id: string) => void
  onLogout: () => void
}

export function DocList({ user, onOpen, onLogout }: Props) {
  const [docs, setDocs] = useState<DocSummary[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setDocs(await api.listDocs())
      setError('')
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function create() {
    setBusy(true)
    try {
      const { id } = await api.createDoc()
      onOpen(id)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { id } = await api.importFile(file)
      onOpen(id)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  async function remove(doc: DocSummary) {
    if (!window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    try {
      await api.deleteDoc(doc.id)
      await load()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const owned = docs?.filter((d) => d.role === 'owner') ?? []
  const shared = docs?.filter((d) => d.role !== 'owner') ?? []

  return (
    <div className="page">
      <header className="topbar">
        <strong>Ajaia Docs</strong>
        <span className="spacer" />
        <span className="muted">{user.name}</span>
        <button onClick={onLogout}>Sign out</button>
      </header>

      <main className="content">
        <div className="actions">
          <button className="primary" onClick={create} disabled={busy}>
            + New document
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={busy}>
            Upload file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,.docx"
            hidden
            onChange={upload}
          />
          <span className="muted small">Upload supports .txt, .md and .docx (max 5 MB)</span>
        </div>

        {error && <p className="error">{error}</p>}
        {docs === null && !error && <p className="muted">Loading documents…</p>}

        {docs !== null && (
          <>
            <Section title="My documents" docs={owned} empty="You have no documents yet." onOpen={onOpen} onDelete={remove} />
            <Section title="Shared with me" docs={shared} empty="Nothing has been shared with you." onOpen={onOpen} />
          </>
        )}
      </main>
    </div>
  )
}

function Section({
  title,
  docs,
  empty,
  onOpen,
  onDelete,
}: {
  title: string
  docs: DocSummary[]
  empty: string
  onOpen: (id: string) => void
  onDelete?: (doc: DocSummary) => void
}) {
  return (
    <section>
      <h2>{title}</h2>
      {docs.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ul className="doclist">
          {docs.map((d) => (
            <li key={d.id}>
              <button className="docbtn" onClick={() => onOpen(d.id)}>
                <span className="doctitle">{d.title}</span>
                <span className="muted small">
                  {d.role === 'owner'
                    ? 'Owned by you'
                    : `Shared by ${d.owner_name} · ${d.role === 'editor' ? 'can edit' : 'view only'}`}
                  {' · '}
                  {formatDate(d.updated_at)}
                </span>
              </button>
              {d.role !== 'owner' && (
                <span className={`badge ${d.role}`}>{d.role === 'editor' ? 'Can edit' : 'View only'}</span>
              )}
              {onDelete && d.role === 'owner' && (
                <button className="danger" onClick={() => onDelete(d)}>
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
