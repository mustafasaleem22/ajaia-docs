import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { api, ApiError } from './api'
import { errorMessage } from './util'
import type { DocFull, Share } from './types'
import { Toolbar } from './Toolbar'
import { SharePanel } from './SharePanel'

type Status = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'error'
type Patch = { title?: string; content?: string }

const SAVE_DELAY_MS = 800
const hasChanges = (p: Patch) => p.title !== undefined || p.content !== undefined

const STATUS_TEXT: Record<Status, string> = {
  saved: 'All changes saved',
  saving: 'Saving…',
  unsaved: 'Unsaved changes',
  conflict: 'Not saved: newer version exists',
  error: 'Could not save',
}

const ROLE_TEXT = {
  owner: 'Owner',
  editor: 'Shared · can edit',
  viewer: 'Shared · view only',
} as const

export function Editor({ id, onBack }: { id: string; onBack: () => void }) {
  const [doc, setDoc] = useState<DocFull | null>(null)
  const [title, setTitle] = useState('')
  const [shares, setShares] = useState<Share[]>([])
  const [status, setStatus] = useState<Status>('saved')
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [showShare, setShowShare] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const baseRef = useRef('') // updated_at of the version we last loaded or saved
  const pendingRef = useRef<Patch>({})
  const timerRef = useRef<number | undefined>(undefined)
  const savingRef = useRef(false)
  const conflictRef = useRef(false)
  const loadingRef = useRef(false)
  const editableRef = useRef(false)
  const lastTitleRef = useRef('')
  const flushRef = useRef<() => Promise<void>>(async () => {})

  const schedule = useCallback((delay: number = SAVE_DELAY_MS) => {
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void flushRef.current()
    }, delay)
  }, [])

  const flush = useCallback(async () => {
    if (conflictRef.current) return
    if (savingRef.current) {
      schedule(300) // let the in-flight save finish so we send the right base version
      return
    }
    const patch = pendingRef.current
    if (!hasChanges(patch)) return

    pendingRef.current = {}
    savingRef.current = true
    setStatus('saving')
    try {
      const result = await api.saveDoc(id, { ...patch, baseUpdatedAt: baseRef.current })
      baseRef.current = result.updated_at
      setError('')
      if (hasChanges(pendingRef.current)) {
        setStatus('unsaved')
        schedule(300)
      } else {
        setStatus('saved')
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        conflictRef.current = true
        setStatus('conflict')
      } else {
        setStatus('error')
        setError(errorMessage(e))
        // Retry only for network/server problems, not for rejected input.
        const retryable = !(e instanceof ApiError) || e.status === 0 || e.status >= 500
        if (retryable) {
          pendingRef.current = { ...patch, ...pendingRef.current }
          schedule(5000)
        }
      }
    } finally {
      savingRef.current = false
    }
  }, [id, schedule])

  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  const markChange = useCallback(
    (patch: Patch) => {
      pendingRef.current = { ...pendingRef.current, ...patch }
      setStatus((s) => (s === 'conflict' ? s : 'unsaved'))
      schedule()
    },
    [schedule],
  )

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editable: false,
    onUpdate: ({ editor: e }) => {
      if (loadingRef.current || !editableRef.current) return
      markChange({ content: e.getHTML() })
    },
  })

  // Load (and re-load after a conflict).
  useEffect(() => {
    let cancelled = false
    api
      .getDoc(id)
      .then((d) => {
        if (cancelled) return
        baseRef.current = d.updated_at
        conflictRef.current = false
        pendingRef.current = {}
        lastTitleRef.current = d.title
        setDoc(d)
        setTitle(d.title)
        setShares(d.shares ?? [])
        setStatus('saved')
        setError('')
        setLoadError('')
      })
      .catch((e) => {
        if (!cancelled) setLoadError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  // Push the loaded document into the editor without triggering a save.
  useEffect(() => {
    if (!editor || !doc) return
    const editable = doc.role === 'owner' || doc.role === 'editor'
    editableRef.current = editable
    loadingRef.current = true
    editor.commands.setContent(doc.content)
    editor.setEditable(editable)
    loadingRef.current = false
  }, [editor, doc])

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (status === 'unsaved' || status === 'saving' || status === 'error') e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [status])

  async function goBack() {
    window.clearTimeout(timerRef.current)
    await flush()
    onBack()
  }

  function onTitleChange(value: string) {
    setTitle(value)
    const trimmed = value.trim()
    if (trimmed) {
      lastTitleRef.current = trimmed
      markChange({ title: trimmed.slice(0, 200) })
    }
  }

  function reload() {
    conflictRef.current = false
    setReloadKey((k) => k + 1)
  }

  if (!doc) {
    return (
      <div className="center">
        {loadError ? (
          <div className="card">
            <p className="error">{loadError}</p>
            <button onClick={onBack}>Back to documents</button>
          </div>
        ) : (
          <p className="muted">Loading document…</p>
        )}
      </div>
    )
  }

  const canEditDoc = doc.role === 'owner' || doc.role === 'editor'

  return (
    <div className="page">
      <header className="topbar">
        <button onClick={goBack}>← Documents</button>
        <input
          className="titleinput"
          value={title}
          maxLength={200}
          disabled={!canEditDoc}
          aria-label="Document title"
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={() => {
            if (!title.trim()) setTitle(lastTitleRef.current)
          }}
        />
        <span className={`status ${status}`}>{canEditDoc ? STATUS_TEXT[status] : 'Read-only'}</span>
        <span className={`badge ${doc.role}`}>{ROLE_TEXT[doc.role]}</span>
        {doc.role === 'owner' && (
          <button onClick={() => setShowShare((v) => !v)}>{showShare ? 'Close sharing' : 'Share'}</button>
        )}
      </header>

      {doc.role !== 'owner' && (
        <p className="notice">
          Owned by {doc.owner.name}.{' '}
          {doc.role === 'viewer' ? 'You can view this document but not edit it.' : 'You can edit this document.'}
        </p>
      )}

      {status === 'conflict' && (
        <p className="notice warn">
          Someone else saved a newer version, so your latest changes were not saved.{' '}
          <button className="link" onClick={reload}>
            Reload the latest version
          </button>
        </p>
      )}
      {status === 'error' && error && <p className="notice warn">{error}</p>}

      {showShare && doc.role === 'owner' && (
        <SharePanel docId={doc.id} shares={shares} onChange={setShares} />
      )}

      <main className="content editorwrap">
        {editor && <Toolbar editor={editor} disabled={!canEditDoc} />}
        <EditorContent editor={editor} className="editor" />
      </main>
    </div>
  )
}
