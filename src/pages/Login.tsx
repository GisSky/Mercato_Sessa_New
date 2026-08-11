import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'

export default function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) setError(error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-white text-xl font-semibold">
            MC
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Mercato Digitale Comunale</h1>
          <p className="text-sm text-slate-500 mt-1">Accedi con le tue credenziali comunali</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-sm p-3">
            Supabase non è ancora configurato. Inserisci URL e chiave anon nel file <code>.env</code>.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="nome.cognome@comune.it"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-700 text-white font-medium py-2 text-sm hover:bg-blue-800 disabled:opacity-60 transition"
          >
            {submitting ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}
