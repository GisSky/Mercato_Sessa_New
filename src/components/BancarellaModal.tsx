import { useEffect, useState, type FormEvent } from 'react'
import Modal from './Modal'
import { supabase } from '../lib/supabaseClient'
import { StatoBancarellaBadge, StatoPagamentoBadge } from './StatoBadge'
import type {
  AssegnazioneConDettagli,
  Bancarella,
  Operatore,
  StatoBancarella,
  StatoPagamento,
} from '../types'

export default function BancarellaModal({
  bancarella,
  operatori,
  onClose,
  onChanged,
  onEditShape,
}: {
  bancarella: Bancarella
  operatori: Operatore[]
  onClose: () => void
  onChanged: () => void
  onEditShape?: () => void
}) {
  const [storia, setStoria] = useState<AssegnazioneConDettagli[]>([])
  const [loadingStoria, setLoadingStoria] = useState(true)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [operatoreId, setOperatoreId] = useState('')
  const [dataMercato, setDataMercato] = useState(() => new Date().toISOString().slice(0, 10))
  const [statoPagamento, setStatoPagamento] = useState<StatoPagamento>('non_pagato')
  const [statoRisultante, setStatoRisultante] = useState<StatoBancarella>('occupato')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadStoria()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancarella.id])

  async function loadStoria() {
    setLoadingStoria(true)
    const { data, error } = await supabase
      .from('assegnazioni')
      .select('*, operatore:operatori(*)')
      .eq('bancarella_id', bancarella.id)
      .order('data_mercato', { ascending: false })
    if (!error) setStoria((data as AssegnazioneConDettagli[]) ?? [])
    setLoadingStoria(false)
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault()
    if (!operatoreId) {
      setError('Seleziona un operatore.')
      return
    }
    setSubmitting(true)
    setError(null)

    const { error: insertError } = await supabase.from('assegnazioni').insert({
      bancarella_id: bancarella.id,
      operatore_id: operatoreId,
      data_mercato: dataMercato,
      stato_pagamento: statoPagamento,
      note: note || null,
    })
    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    const { error: updateError } = await supabase
      .from('bancarelle')
      .update({ stato: statoRisultante })
      .eq('id', bancarella.id)
    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setShowAssignForm(false)
    setOperatoreId('')
    setNote('')
    await loadStoria()
    onChanged()
  }

  async function handleLibera() {
    if (!confirm(`Segnare il posto ${bancarella.id_posto} come libero?`)) return
    const { error } = await supabase.from('bancarelle').update({ stato: 'libero' }).eq('id', bancarella.id)
    if (error) {
      alert('Errore: ' + error.message)
      return
    }
    onChanged()
  }

  return (
    <Modal title={`Posto ${bancarella.id_posto}`} onClose={onClose} widthClassName="max-w-xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatoBancarellaBadge stato={bancarella.stato} />
          {bancarella.tipologia && (
            <span className="text-sm text-slate-500">Tipologia: {bancarella.tipologia}</span>
          )}
          {bancarella.superficie != null && (
            <span className="text-sm text-slate-500">Superficie: {bancarella.superficie} mq</span>
          )}
        </div>

        {bancarella.note && (
          <p className="text-sm text-slate-600 bg-slate-50 rounded-md p-3 border border-slate-200">
            {bancarella.note}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAssignForm((v) => !v)}
            className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            {showAssignForm ? 'Annulla assegnazione' : 'Assegna operatore'}
          </button>
          {bancarella.stato !== 'libero' && (
            <button
              onClick={handleLibera}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Libera posto
            </button>
          )}
          {onEditShape && (
            <button
              onClick={onEditShape}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Modifica forma
            </button>
          )}
        </div>

        {showAssignForm && (
          <form onSubmit={handleAssign} className="space-y-3 rounded-md border border-slate-200 p-4 bg-slate-50">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Operatore *</label>
              <select
                required
                className="input"
                value={operatoreId}
                onChange={(e) => setOperatoreId(e.target.value)}
              >
                <option value="">Seleziona operatore…</option>
                {operatori.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.cognome} {op.nome} — {op.codice_operatore}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data mercato *</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={dataMercato}
                  onChange={(e) => setDataMercato(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stato pagamento</label>
                <select
                  className="input"
                  value={statoPagamento}
                  onChange={(e) => setStatoPagamento(e.target.value as StatoPagamento)}
                >
                  <option value="non_pagato">Non pagato</option>
                  <option value="in_attesa">In attesa</option>
                  <option value="pagato">Pagato</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stato risultante del posto</label>
              <select
                className="input"
                value={statoRisultante}
                onChange={(e) => setStatoRisultante(e.target.value as StatoBancarella)}
              >
                <option value="occupato">Occupato</option>
                <option value="riservato">Riservato</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
              <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-2">{error}</div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {submitting ? 'Salvataggio…' : 'Conferma assegnazione'}
              </button>
            </div>
          </form>
        )}

        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Storico assegnazioni</h3>
          {loadingStoria && <p className="text-sm text-slate-400">Caricamento…</p>}
          {!loadingStoria && storia.length === 0 && (
            <p className="text-sm text-slate-400">Nessuna assegnazione registrata.</p>
          )}
          {!loadingStoria && storia.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {storia.map((a) => (
                <li key={a.id} className="p-3 text-sm flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-700">
                      {a.operatore ? `${a.operatore.cognome} ${a.operatore.nome}` : 'Operatore rimosso'}
                    </p>
                    <p className="text-slate-500">{a.data_mercato}</p>
                    {a.note && <p className="text-slate-400">{a.note}</p>}
                  </div>
                  <StatoPagamentoBadge stato={a.stato_pagamento} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
