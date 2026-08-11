import { useState, type FormEvent } from 'react'
import Modal from './Modal'
import type { Operatore, OperatoreInput } from '../types'

const emptyForm: OperatoreInput = {
  codice_operatore: '',
  nome: '',
  cognome: '',
  cf_piva: '',
  telefono: '',
  email: '',
  settore: '',
  note: '',
}

export default function OperatoreFormModal({
  operatore,
  onClose,
  onSave,
}: {
  operatore: Operatore | null
  onClose: () => void
  onSave: (values: OperatoreInput) => Promise<string | null>
}) {
  const [form, setForm] = useState<OperatoreInput>(
    operatore
      ? {
          codice_operatore: operatore.codice_operatore,
          nome: operatore.nome,
          cognome: operatore.cognome,
          cf_piva: operatore.cf_piva ?? '',
          telefono: operatore.telefono ?? '',
          email: operatore.email ?? '',
          settore: operatore.settore ?? '',
          note: operatore.note ?? '',
        }
      : emptyForm,
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof OperatoreInput>(key: K, value: OperatoreInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const err = await onSave(form)
    setSubmitting(false)
    if (err) setError(err)
  }

  return (
    <Modal title={operatore ? 'Modifica operatore' : 'Nuovo operatore'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Codice operatore" required>
            <input
              required
              className="input"
              value={form.codice_operatore}
              onChange={(e) => update('codice_operatore', e.target.value)}
            />
          </Field>
          <Field label="Settore">
            <input
              className="input"
              value={form.settore ?? ''}
              onChange={(e) => update('settore', e.target.value)}
              placeholder="Es. Alimentare, Abbigliamento…"
            />
          </Field>
          <Field label="Nome" required>
            <input
              required
              className="input"
              value={form.nome}
              onChange={(e) => update('nome', e.target.value)}
            />
          </Field>
          <Field label="Cognome" required>
            <input
              required
              className="input"
              value={form.cognome}
              onChange={(e) => update('cognome', e.target.value)}
            />
          </Field>
          <Field label="Codice Fiscale / P.IVA">
            <input
              className="input"
              value={form.cf_piva ?? ''}
              onChange={(e) => update('cf_piva', e.target.value)}
            />
          </Field>
          <Field label="Telefono">
            <input
              className="input"
              value={form.telefono ?? ''}
              onChange={(e) => update('telefono', e.target.value)}
            />
          </Field>
          <Field label="Email" wide>
            <input
              type="email"
              className="input"
              value={form.email ?? ''}
              onChange={(e) => update('email', e.target.value)}
            />
          </Field>
          <Field label="Note" wide>
            <textarea
              className="input"
              rows={3}
              value={form.note ?? ''}
              onChange={(e) => update('note', e.target.value)}
            />
          </Field>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-2">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({
  label,
  required,
  wide,
  children,
}: {
  label: string
  required?: boolean
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`block text-sm ${wide ? 'col-span-2' : ''}`}>
      <span className="block font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}
