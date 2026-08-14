import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { StatoBancarella } from '../types'
import { statoBancarellaColors } from '../components/StatoBadge'
import { useMercati } from '../hooks/useMercati'
import Gauge from '../components/charts/Gauge'
import BarChart from '../components/charts/BarChart'
import StackedBarChart from '../components/charts/StackedBarChart'

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

const statoLabels: Record<StatoBancarella, string> = {
  libero: 'Liberi',
  occupato: 'Occupati',
  riservato: 'Riservati',
}

function groupTop(counts: Map<string, number>, max = 8) {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (sorted.length <= max) return sorted.map(([label, value]) => ({ label, value }))
  const top = sorted.slice(0, max - 1)
  const rest = sorted.slice(max - 1).reduce((sum, [, v]) => sum + v, 0)
  return [...top.map(([label, value]) => ({ label, value })), { label: 'Altro', value: rest }]
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white shadow-sm border border-slate-200 p-5">
      <p className="font-medium text-slate-800">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  )
}

export default function Dashboard() {
  const { mercati } = useMercati()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [tipologie, setTipologie] = useState<{ label: string; value: number }[]>([])
  const [postiPerMercato, setPostiPerMercato] = useState<{ label: string; values: Record<string, number> }[]>([])
  const [settori, setSettori] = useState<{ label: string; value: number }[]>([])
  const [totaleOperatori, setTotaleOperatori] = useState(0)
  const [operatoriConPosto, setOperatoriConPosto] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    loadData()
  }, [mercati])

  async function loadData() {
    setLoading(true)
    setError(null)

    const [bancarelleRes, operatoriRes, assegnazioniRes] = await Promise.all([
      supabase.from('bancarelle').select('stato, tipologia, mercato_id'),
      supabase.from('operatori').select('settore'),
      supabase.from('assegnazioni').select('operatore_id'),
    ])

    const firstError = bancarelleRes.error || operatoriRes.error || assegnazioniRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const bancarelle = (bancarelleRes.data ?? []) as {
      stato: StatoBancarella
      tipologia: string | null
      mercato_id: string | null
    }[]
    const operatori = (operatoriRes.data ?? []) as { settore: string | null }[]
    const assegnazioni = (assegnazioniRes.data ?? []) as { operatore_id: string }[]

    setCounts({
      totale: bancarelle.length,
      libero: bancarelle.filter((r) => r.stato === 'libero').length,
      occupato: bancarelle.filter((r) => r.stato === 'occupato').length,
      riservato: bancarelle.filter((r) => r.stato === 'riservato').length,
    })

    const tipologiaCounts = new Map<string, number>()
    for (const b of bancarelle) {
      const key = b.tipologia || 'Non specificato'
      tipologiaCounts.set(key, (tipologiaCounts.get(key) ?? 0) + 1)
    }
    setTipologie(groupTop(tipologiaCounts))

    const mercatoNomeById = new Map(mercati.map((m) => [m.id, m.nome]))
    const perMercato = new Map<string, Record<string, number>>()
    for (const b of bancarelle) {
      const label = mercatoNomeById.get(b.mercato_id ?? '') ?? 'Non assegnato'
      const row = perMercato.get(label) ?? { libero: 0, occupato: 0, riservato: 0 }
      row[b.stato] = (row[b.stato] ?? 0) + 1
      perMercato.set(label, row)
    }
    setPostiPerMercato(
      [...perMercato.entries()]
        .sort((a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0))
        .map(([label, values]) => ({ label, values })),
    )

    const settoreCounts = new Map<string, number>()
    for (const o of operatori) {
      const key = o.settore || 'Non specificato'
      settoreCounts.set(key, (settoreCounts.get(key) ?? 0) + 1)
    }
    setSettori(groupTop(settoreCounts))

    setTotaleOperatori(operatori.length)
    setOperatoriConPosto(new Set(assegnazioni.map((a) => a.operatore_id)).size)

    setLoading(false)
  }

  const tassoOccupazione = useMemo(() => {
    if (!counts || counts.totale === 0) return 0
    return (counts.occupato / counts.totale) * 100
  }, [counts])

  const tassoCoperturaOperatori = useMemo(() => {
    if (totaleOperatori === 0) return 0
    return (operatoriConPosto / totaleOperatori) * 100
  }, [totaleOperatori, operatoriConPosto])

  const statoSegments = (['libero', 'occupato', 'riservato'] as StatoBancarella[]).map((key) => ({
    key,
    label: statoLabels[key],
    color: statoBancarellaColors[key],
  }))

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

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <ChartCard title="Tasso di occupazione">
          <Gauge
            value={loading ? 0 : tassoOccupazione}
            label="Posti occupati"
            sublabel={counts ? `${counts.occupato} su ${counts.totale}` : undefined}
            color="#1d4ed8"
          />
        </ChartCard>
        <ChartCard title="Copertura operatori">
          <Gauge
            value={loading ? 0 : tassoCoperturaOperatori}
            label="Operatori con posto"
            sublabel={`${operatoriConPosto} su ${totaleOperatori}`}
            color="#7c3aed"
          />
        </ChartCard>
        <ChartCard title="Posti per tipologia" subtitle="Numero di posti per tipologia merceologica">
          <BarChart data={tipologie} color="#1d4ed8" />
        </ChartCard>
        <ChartCard title="Operatori per settore" subtitle="Numero di operatori censiti per settore">
          <BarChart data={settori} color="#7c3aed" />
        </ChartCard>
      </div>

      <div className="grid gap-4 mb-8">
        <ChartCard title="Posti per mercato" subtitle="Composizione per stato di ciascun mercato">
          <StackedBarChart segments={statoSegments} rows={postiPerMercato} />
        </ChartCard>
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
