import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { StatoBancarella } from '../types'

interface Counts {
  totale: number
  libero: number
  occupato: number
  riservato: number
}

const cards: { key: keyof Counts | 'totale'; label: string; className: string }[] = [
  { key: 'totale', label: 'Totale posti', className: 'bg-slate-700' },
  { key: 'libero', label: 'Liberi', className: 'bg-green-600' },
  { key: 'occupato', label: 'Occupati', className: 'bg-red-600' },
  { key: 'riservato', label: 'Riservati', className: 'bg-yellow-600' },
]

export default function Dashboard() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    loadCounts()
  }, [])

  async function loadCounts() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('bancarelle').select('stato')
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const rows = (data ?? []) as { stato: StatoBancarella }[]
    setCounts({
      totale: rows.length,
      libero: rows.filter((r) => r.stato === 'libero').length,
      occupato: rows.filter((r) => r.stato === 'occupato').length,
      riservato: rows.filter((r) => r.stato === 'riservato').length,
    })
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-1">Dashboard</h1>
      <p className="text-sm text-slate-500 mb-6">Panoramica generale dei posti del mercato</p>

      {!isSupabaseConfigured && (
        <div className="rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-sm p-4 mb-6">
          Supabase non è configurato. Aggiungi <code>VITE_SUPABASE_URL</code> e{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> nel file <code>.env</code> per vedere i dati reali.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-4 mb-6">
          Errore nel caricamento dei dati: {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.key} className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
            <div className={`h-1.5 w-10 rounded-full mb-3 ${card.className}`} />
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-3xl font-semibold text-slate-800 mt-1">
              {loading ? '…' : (counts?.[card.key as keyof Counts] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/mappa"
          className="rounded-xl bg-white shadow-sm border border-slate-200 p-5 hover:border-blue-400 hover:shadow-md transition block"
        >
          <p className="font-medium text-slate-800">Mappa interattiva del mercato</p>
          <p className="text-sm text-slate-500 mt-1">
            Visualizza le bancarelle sulla mappa, filtra per stato e tipologia, assegna gli operatori.
          </p>
        </Link>
        <Link
          to="/operatori"
          className="rounded-xl bg-white shadow-sm border border-slate-200 p-5 hover:border-blue-400 hover:shadow-md transition block"
        >
          <p className="font-medium text-slate-800">Gestione operatori</p>
          <p className="text-sm text-slate-500 mt-1">
            Cerca, inserisci o modifica le anagrafiche degli operatori del mercato.
          </p>
        </Link>
      </div>
    </div>
  )
}
