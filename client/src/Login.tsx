import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, setToken } from './api'
import { errorMessage } from './util'
import type { User } from './types'

const DEMO_ACCOUNTS = [
  { email: 'alice@demo.com', label: 'Alice (owns the welcome doc)' },
  { email: 'bob@demo.com', label: 'Bob (can edit it)' },
  { email: 'carol@demo.com', label: 'Carol (view only)' },
]

export function Login({ onLoggedIn }: { onLoggedIn: (user: User) => void }) {
  const [email, setEmail] = useState('alice@demo.com')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { token, user } = await api.login(email, password)
      setToken(token)
      onLoggedIn(user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <h1>Ajaia Docs</h1>
        <p className="muted">Sign in with a demo account to try sharing.</p>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="demo">
          <p className="muted">Demo accounts (password: demo1234)</p>
          {DEMO_ACCOUNTS.map((a) => (
            <button type="button" key={a.email} className="link" onClick={() => setEmail(a.email)}>
              {a.label}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}
