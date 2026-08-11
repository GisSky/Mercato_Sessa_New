import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { AssegnazioneConDettagli, StatoPagamento } from '../types'
import { StatoPagamentoBadge } from '../components/StatoBadge'
import { downloadCsv } from '../utils/csv'

export default function Assegnazioni() {
  const [assegnazioni, setAssegnazioni] = useState<AssegnazioneConDettagli[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroStatoPagamento, setFiltroStatoPagamento] = useState<StatoPagamento | 'tutti'>('tutti')

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
    const { data, error } = await supabase
      .from('assegnazioni')
      .select('*, bancarella:bancarelle(*), operatore:operatori(*)')
      .order('data_mercato', { ascending: false })
    if (error) setError(error.message)
    setAssegnazioni((data as AssegnazioneConDettagli[]) ?? [])
    setLoading(false)
  }

  const filtrate = assegnazioni.filter(
    (a) => filtroStatoPagamento === 'tutti' || a.stato_pagamento === filtroStatoPagamento,
  )

  function handleExport() {
    downloadCsv(
      filtrate.map((a) => ({
        posto: a.bancarella?.id_posto ?? '',
        operatore: a.operatore ? `${a.operatore.cognome} ${a.operatore.nome}` : '',
        codice_operatore: a.operatore?.codice_operatore ?? '',
        data_mercato: a.data_mercato,
        stato_pagamento: a.stato_pagamento,
        note: a.note ?? '',
      })),
      [
        { key: 'posto', label: 'Posto' },
        { key: 'operatore', label: 'Operatore' },
        { key: 'codice_operatore', label: 'Codice operatore' },
        { key: 'data_mercato', label: 'Data mercato' },
        { key: 'stato_pagamento', label: 'Stato pagamento' },
        { key: 'note', label: 'Note' },
      ],
      `assegnazioni_${new Date().toISOString().slice(0, 10)}.csv`,
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Assegnazioni</h1>
          <p className="text-sm text-slate-500">Storico delle assegnazioni operatore–bancarella</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filtrate.length === 0}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Esporta CSV
        </button>
      </div>

      {!isSupabaseConfigured && (
        <div className="rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-sm p-4 mb-6">
          Supabase non è configurato. Aggiungi le credenziali nel file <code>.env</code>.
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-500 mb-1">Filtra per stato pagamento</label>
        <select
          className="input !w-auto"
          value={filtroStatoPagamento}
          onChange={(e) => setFiltroStatoPagamento(e.target.value as StatoPagamento | 'tutti')}
        >
          <option value="tutti">Tutti</option>
          <option value="pagato">Pagato</option>
          <option value="in_attesa">In attesa</option>
          <option value="non_pagato">Non pagato</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-4 mb-4">{error}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Posto</th>
              <th className="px-4 py-3 font-medium">Operatore</th>
              <th className="px-4 py-3 font-medium">Data mercato</th>
              <th className="px-4 py-3 font-medium">Stato pagamento</th>
              <th className="px-4 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Caricamento…
                </td>
              </tr>
            )}
            {!loading && filtrate.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nessuna assegnazione trovata.
                </td>
              </tr>
            )}
            {!loading &&
              filtrate.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{a.bancarella?.id_posto ?? '—'}</td>
                  <td className="px-4 py-3">
                    {a.operatore ? `${a.operatore.cognome} ${a.operatore.nome}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{a.data_mercato}</td>
                  <td className="px-4 py-3">
                    <StatoPagamentoBadge stato={a.stato_pagamento} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{a.note || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
