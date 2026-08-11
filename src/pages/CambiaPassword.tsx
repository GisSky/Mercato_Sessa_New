import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function CambiaPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri.')
      return
    }
    if (password !== confirm) {
      setError('Le due password non coincidono.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setPassword('')
    setConfirm('')
  }

  return (
    <div className="max-w-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Cambia password</h1>
        <p className="text-sm text-slate-500">Imposta una nuova password per il tuo account.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="new-password">
            Nuova password
          </label>
          <input
            id="new-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="confirm-password">
            Conferma password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-2">{error}</div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-2">
            Password aggiornata con successo.
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-700 text-white font-medium py-2 text-sm hover:bg-blue-800 disabled:opacity-60 transition"
        >
          {submitting ? 'Aggiornamento in corso…' : 'Aggiorna password'}
        </button>
      </form>
    </div>
  )
}
