import { useState, type FormEvent } from 'react'
import Modal from './Modal'
import type { Bancarella, BancarellaInput, GeoGeometry, StatoBancarella } from '../types'
import { useMercati } from '../hooks/useMercati'

const NESSUN_MERCATO = ''
const NUOVO_MERCATO = '__nuovo__'

export default function BancarellaFormModal({
  bancarella,
  defaultCenter,
  initialGeometry,
  onClose,
  onSave,
}: {
  /** null = crea una nuova bancarella */
  bancarella: Bancarella | null
  /** [lat, lng] precompilati per una nuova bancarella (es. baricentro delle bancarelle esistenti) */
  defaultCenter?: [number, number]
  /** Geometria già pronta (es. poligono disegnato sulla mappa): se presente, salta i campi lat/lng */
  initialGeometry?: GeoGeometry
  onClose: () => void
  onSave: (values: Partial<BancarellaInput>) => Promise<string | null>
}) {
  const { mercati, creaMercato } = useMercati()
  const isNew = bancarella === null

  const [idPosto, setIdPosto] = useState(bancarella?.id_posto ?? '')
  const [stato, setStato] = useState<StatoBancarella>(bancarella?.stato ?? 'libero')
  const [tipologia, setTipologia] = useState(bancarella?.tipologia ?? '')
  const [superficie, setSuperficie] = useState(
    bancarella?.superficie != null ? String(bancarella.superficie) : '',
  )
  const [note, setNote] = useState(bancarella?.note ?? '')
  const [mercatoId, setMercatoId] = useState(bancarella?.mercato_id ?? NESSUN_MERCATO)
  const [nuovoMercatoNome, setNuovoMercatoNome] = useState('')
  const [creandoMercato, setCreandoMercato] = useState(false)

  const [lat, setLat] = useState(defaultCenter ? String(defaultCenter[0]) : '')
  const [lng, setLng] = useState(defaultCenter ? String(defaultCenter[1]) : '')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleNuovoMercato() {
    const nome = nuovoMercatoNome.trim()
    if (!nome) return
    setCreandoMercato(true)
    const creato = await creaMercato(nome)
    setCreandoMercato(false)
    if (creato) {
      setMercatoId(creato.id)
      setNuovoMercatoNome('')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!idPosto.trim()) {
      setError("L'ID posto è obbligatorio.")
      return
    }
    if (mercatoId === NUOVO_MERCATO) {
      setError('Crea o seleziona un mercato prima di salvare.')
      return
    }

    const values: Partial<BancarellaInput> = {
      id_posto: idPosto.trim(),
      stato,
      tipologia: tipologia.trim() || null,
      superficie: superficie.trim() === '' ? null : Number(superficie),
      note: note.trim() || null,
      mercato_id: mercatoId || null,
    }

    if (isNew) {
      if (initialGeometry) {
        values.geometry_geojson = initialGeometry
      } else {
        const latNum = Number(lat)
        const lngNum = Number(lng)
        if (lat.trim() === '' || lng.trim() === '' || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
          setError('Inserisci latitudine e longitudine valide.')
          return
        }
        if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
          setError('Coordinate fuori dal range WGS84 valido.')
          return
        }
        const geometry_geojson: GeoGeometry = { type: 'Point', coordinates: [lngNum, latNum] }
        values.geometry_geojson = geometry_geojson
      }
    }

    setSubmitting(true)
    setError(null)
    const err = await onSave(values)
    setSubmitting(false)
    if (err) setError(err)
  }

  return (
    <Modal title={isNew ? 'Nuova bancarella' : `Modifica posto ${bancarella.id_posto}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="ID posto" required>
            <input required className="input" value={idPosto} onChange={(e) => setIdPosto(e.target.value)} />
          </Field>
          <Field label="Stato">
            <select className="input" value={stato} onChange={(e) => setStato(e.target.value as StatoBancarella)}>
              <option value="libero">Libero</option>
              <option value="occupato">Occupato</option>
              <option value="riservato">Riservato</option>
            </select>
          </Field>
          <Field label="Tipologia">
            <input
              className="input"
              value={tipologia}
              onChange={(e) => setTipologia(e.target.value)}
              placeholder="Es. Alimentare, Abbigliamento…"
            />
          </Field>
          <Field label="Superficie (mq)">
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={superficie}
              onChange={(e) => setSuperficie(e.target.value)}
            />
          </Field>
          <Field label="Mercato" wide>
            <select className="input" value={mercatoId} onChange={(e) => setMercatoId(e.target.value)}>
              <option value={NESSUN_MERCATO}>— nessun mercato —</option>
              {mercati.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
              <option value={NUOVO_MERCATO}>+ Nuovo mercato…</option>
            </select>
            {mercatoId === NUOVO_MERCATO && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  className="input"
                  placeholder="Nome del nuovo mercato"
                  value={nuovoMercatoNome}
                  onChange={(e) => setNuovoMercatoNome(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleNuovoMercato}
                  disabled={creandoMercato || !nuovoMercatoNome.trim()}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap"
                >
                  {creandoMercato ? 'Creazione…' : 'Crea'}
                </button>
              </div>
            )}
          </Field>

          {isNew && !initialGeometry && (
            <>
              <Field label="Latitudine" required>
                <input
                  type="number"
                  step="any"
                  required
                  className="input"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Es. 41.9028"
                />
              </Field>
              <Field label="Longitudine" required>
                <input
                  type="number"
                  step="any"
                  required
                  className="input"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="Es. 12.4964"
                />
              </Field>
            </>
          )}

          <Field label="Note" wide>
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>

        {isNew && initialGeometry && (
          <p className="text-xs text-slate-400">Poligono disegnato sulla mappa ✓ — completa i dati e salva.</p>
        )}
        {isNew && !initialGeometry && (
          <p className="text-xs text-slate-400">
            La nuova bancarella viene creata come punto singolo in queste coordinate (WGS84 / EPSG:4326). Per
            posizionarla con precisione su una piazza esistente, prendi le coordinate da una mappa (es. Google Maps
            o QGIS) o importa un file GeoJSON/shapefile dalla pagina "Importa bancarelle", oppure disegna il poligono
            direttamente sulla pagina "Mappa mercato".
          </p>
        )}

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
