import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { Operatore, OperatoreInput } from '../types'
import OperatoreFormModal from '../components/OperatoreFormModal'
import OperatoriImportPanel from '../components/OperatoriImportPanel'
import { downloadCsv } from '../utils/csv'

export default function Operatori() {
  const [operatori, setOperatori] = useState<Operatore[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Operatore | null | 'new'>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    const timeout = setTimeout(() => load(), 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function load() {
    setLoading(true)
    setError(null)
    let query = supabase.from('operatori').select('*').order('cognome', { ascending: true })
    if (search.trim()) {
      const term = search.trim()
      query = query.or(
        `nome.ilike.%${term}%,cognome.ilike.%${term}%,codice_operatore.ilike.%${term}%,cf_piva.ilike.%${term}%,email.ilike.%${term}%`,
      )
    }
    const { data, error } = await query
    if (error) setError(error.message)
    setOperatori((data as Operatore[]) ?? [])
    setLoading(false)
  }

  async function handleSave(values: OperatoreInput): Promise<string | null> {
    if (editing && editing !== 'new') {
      const { error } = await supabase.from('operatori').update(values).eq('id', editing.id)
      if (error) return error.message
    } else {
      const { error } = await supabase.from('operatori').insert(values)
      if (error) return error.message
    }
    setEditing(null)
    await load()
    return null
  }

  async function handleDelete(op: Operatore) {
    if (!confirm(`Eliminare l'operatore ${op.nome} ${op.cognome} (${op.codice_operatore})?`)) return
    const { error } = await supabase.from('operatori').delete().eq('id', op.id)
    if (error) {
      alert('Errore durante l\'eliminazione: ' + error.message)
      return
    }
    await load()
  }

  function handleExport() {
    downloadCsv(
      operatori,
      [
        { key: 'codice_operatore', label: 'Codice operatore' },
        { key: 'nome', label: 'Nome' },
        { key: 'cognome', label: 'Cognome' },
        { key: 'cf_piva', label: 'CF/P.IVA' },
        { key: 'telefono', label: 'Telefono' },
        { key: 'email', label: 'Email' },
        { key: 'settore', label: 'Settore' },
        { key: 'note', label: 'Note' },
      ],
      `operatori_${new Date().toISOString().slice(0, 10)}.csv`,
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Operatori</h1>
          <p className="text-sm text-slate-500">Anagrafica degli operatori del mercato</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setImporting(true)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Importa da Excel/CSV
          </button>
          <button
            onClick={handleExport}
            disabled={operatori.length === 0}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Esporta CSV
          </button>
          <button
            onClick={() => setEditing('new')}
            className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            + Nuovo operatore
          </button>
        </div>
      </div>

      {!isSupabaseConfigured && (
        <div className="rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-sm p-4 mb-6">
          Supabase non è configurato. Aggiungi le credenziali nel file <code>.env</code>.
        </div>
      )}

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome, cognome, codice, CF/P.IVA o email…"
          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-4 mb-4">{error}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Codice</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Cognome</th>
              <th className="px-4 py-3 font-medium">CF/P.IVA</th>
              <th className="px-4 py-3 font-medium">Telefono</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Settore</th>
              <th className="px-4 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Caricamento…
                </td>
              </tr>
            )}
            {!loading && operatori.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  Nessun operatore trovato.
                </td>
              </tr>
            )}
            {!loading &&
              operatori.map((op) => (
                <tr key={op.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{op.codice_operatore}</td>
                  <td className="px-4 py-3">{op.nome}</td>
                  <td className="px-4 py-3">{op.cognome}</td>
                  <td className="px-4 py-3 text-slate-500">{op.cf_piva || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{op.telefono || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{op.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{op.settore || '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setEditing(op)}
                      className="text-blue-700 hover:underline font-medium"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(op)}
                      className="text-red-600 hover:underline font-medium"
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <OperatoreFormModal
          operatore={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {importing && (
        <OperatoriImportPanel onClose={() => setImporting(false)} onImported={load} />
      )}
    </div>
  )
}
