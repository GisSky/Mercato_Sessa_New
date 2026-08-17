import { useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { Bancarella, BancarellaInput } from '../types'
import { StatoBancarellaBadge } from '../components/StatoBadge'
import BancarellaFormModal from '../components/BancarellaFormModal'
import BancarellaMapPreview from '../components/BancarellaMapPreview'
import { useMercati } from '../hooks/useMercati'
import { geometryCentroid } from '../utils/geo'

export default function Bancarelle() {
  const { mercati } = useMercati()
  const [bancarelle, setBancarelle] = useState<Bancarella[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Bancarella | null | 'new'>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('bancarelle').select('*').order('id_posto')
    if (error) setError(error.message)
    setBancarelle((data as Bancarella[]) ?? [])
    setLoading(false)
  }

  const mercatoNomeById = useMemo(() => new Map(mercati.map((m) => [m.id, m.nome])), [mercati])
  const preview = bancarelle.find((b) => b.id === previewId) ?? null

  const defaultCenter = useMemo<[number, number] | undefined>(() => {
    if (bancarelle.length === 0) return undefined
    const centroidi = bancarelle.map((b) => geometryCentroid(b.geometry_geojson))
    return [
      centroidi.reduce((sum, c) => sum + c[0], 0) / centroidi.length,
      centroidi.reduce((sum, c) => sum + c[1], 0) / centroidi.length,
    ]
  }, [bancarelle])

  const filtrate = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return bancarelle
    return bancarelle.filter(
      (b) =>
        b.id_posto.toLowerCase().includes(term) ||
        (b.tipologia ?? '').toLowerCase().includes(term) ||
        (mercatoNomeById.get(b.mercato_id ?? '') ?? '').toLowerCase().includes(term),
    )
  }, [bancarelle, search, mercatoNomeById])

  async function handleSave(values: Partial<BancarellaInput>): Promise<string | null> {
    if (editing === 'new') {
      const { error } = await supabase.from('bancarelle').insert(values as BancarellaInput)
      if (error) return error.message
    } else if (editing) {
      const { error } = await supabase.from('bancarelle').update(values).eq('id', editing.id)
      if (error) return error.message
    }
    setEditing(null)
    await load()
    return null
  }

  async function handleDelete(b: Bancarella) {
    if (
      !confirm(
        `Eliminare il posto ${b.id_posto}? Verrà eliminato anche lo storico delle assegnazioni collegate a questo posto. L'operazione non è reversibile.`,
      )
    )
      return
    const { error } = await supabase.from('bancarelle').delete().eq('id', b.id)
    if (error) {
      alert("Errore durante l'eliminazione: " + error.message)
      return
    }
    await load()
  }

  return (
    <div>
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Bancarelle</h1>
          <p className="text-sm text-slate-500">Elenco, modifica ed eliminazione dei posti del mercato</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          + Nuova bancarella
        </button>

        {preview && (
          <BancarellaMapPreview
            bancarella={preview}
            mercatoNome={mercatoNomeById.get(preview.mercato_id ?? '') ?? null}
            onClose={() => setPreviewId(null)}
          />
        )}
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
          placeholder="Cerca per posto, tipologia o mercato…"
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
              <th className="px-4 py-3 font-medium">Posto</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium">Tipologia</th>
              <th className="px-4 py-3 font-medium">Superficie</th>
              <th className="px-4 py-3 font-medium">Mercato</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 font-medium text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Caricamento…
                </td>
              </tr>
            )}
            {!loading && filtrate.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Nessuna bancarella trovata.
                </td>
              </tr>
            )}
            {!loading &&
              filtrate.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setPreviewId(b.id)}
                  className="hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-slate-700">{b.id_posto}</td>
                  <td className="px-4 py-3">
                    <StatoBancarellaBadge stato={b.stato} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{b.tipologia || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{b.superficie != null ? `${b.superficie} mq` : '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{mercatoNomeById.get(b.mercato_id ?? '') ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{b.note || '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditing(b)
                      }}
                      className="text-blue-700 hover:underline font-medium"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(b)
                      }}
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
        <BancarellaFormModal
          bancarella={editing === 'new' ? null : editing}
          defaultCenter={editing === 'new' ? defaultCenter : undefined}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
