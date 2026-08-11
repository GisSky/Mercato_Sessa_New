import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polygon, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { Bancarella, Operatore, StatoBancarella } from '../types'
import { statoBancarellaColors } from '../components/StatoBadge'
import BancarellaModal from '../components/BancarellaModal'
import { geometryLatLngs, polygonRings } from '../utils/geo'

const DEFAULT_CENTER: [number, number] = [41.9028, 12.4964]

export default function Mappa() {
  const [bancarelle, setBancarelle] = useState<Bancarella[]>([])
  const [operatori, setOperatori] = useState<Operatore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [filtroStato, setFiltroStato] = useState<StatoBancarella | 'tutti'>('tutti')
  const [filtroTipologia, setFiltroTipologia] = useState<string>('tutte')

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
    const [bancarelleRes, operatoriRes] = await Promise.all([
      supabase.from('bancarelle').select('*').order('id_posto'),
      supabase.from('operatori').select('*').order('cognome'),
    ])
    if (bancarelleRes.error) setError(bancarelleRes.error.message)
    setBancarelle((bancarelleRes.data as Bancarella[]) ?? [])
    setOperatori((operatoriRes.data as Operatore[]) ?? [])
    setLoading(false)
  }

  const tipologie = useMemo(() => {
    const set = new Set<string>()
    bancarelle.forEach((b) => b.tipologia && set.add(b.tipologia))
    return Array.from(set).sort()
  }, [bancarelle])

  const filtrate = useMemo(() => {
    return bancarelle.filter((b) => {
      if (filtroStato !== 'tutti' && b.stato !== filtroStato) return false
      if (filtroTipologia !== 'tutte' && b.tipologia !== filtroTipologia) return false
      return true
    })
  }, [bancarelle, filtroStato, filtroTipologia])

  const selected = bancarelle.find((b) => b.id === selectedId) ?? null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Mappa del mercato</h1>
        <p className="text-sm text-slate-500">Clicca su una bancarella per vedere i dettagli e assegnare un operatore</p>
      </div>

      {!isSupabaseConfigured && (
        <div className="rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-sm p-4 mb-6">
          Supabase non è configurato. Aggiungi le credenziali nel file <code>.env</code>.
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-4 mb-4">{error}</div>
      )}

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Filtra per stato</label>
          <select
            className="input !w-auto"
            value={filtroStato}
            onChange={(e) => setFiltroStato(e.target.value as StatoBancarella | 'tutti')}
          >
            <option value="tutti">Tutti</option>
            <option value="libero">Libero</option>
            <option value="occupato">Occupato</option>
            <option value="riservato">Riservato</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Filtra per tipologia</label>
          <select
            className="input !w-auto"
            value={filtroTipologia}
            onChange={(e) => setFiltroTipologia(e.target.value)}
          >
            <option value="tutte">Tutte</option>
            {tipologie.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-600 ml-auto">
          <Legenda colore={statoBancarellaColors.libero} label="Libero" />
          <Legenda colore={statoBancarellaColors.occupato} label="Occupato" />
          <Legenda colore={statoBancarellaColors.riservato} label="Riservato" />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: '600px' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">Caricamento mappa…</div>
        ) : (
          <MapContainer center={DEFAULT_CENTER} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds bancarelle={bancarelle} />
            <FlyToSelected bancarella={selected} />
            {filtrate.map((b) => (
              <BancarellaShape key={b.id} bancarella={b} onClick={() => setSelectedId(b.id)} />
            ))}
          </MapContainer>
        )}
      </div>

      {selected && (
        <BancarellaModal
          bancarella={selected}
          operatori={operatori}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}

/** Inquadra la mappa su tutte le bancarelle appena vengono caricate (o ricaricate). */
function FitBounds({ bancarelle }: { bancarelle: Bancarella[] }) {
  const map = useMap()

  useEffect(() => {
    const punti = bancarelle.flatMap((b) => geometryLatLngs(b.geometry_geojson))
    if (punti.length === 0) return
    map.fitBounds(L.latLngBounds(punti), { padding: [40, 40], maxZoom: 19 })
  }, [bancarelle, map])

  return null
}

/** Centra/zooma la mappa sulla bancarella selezionata. */
function FlyToSelected({ bancarella }: { bancarella: Bancarella | null }) {
  const map = useMap()

  useEffect(() => {
    if (!bancarella) return
    const punti = geometryLatLngs(bancarella.geometry_geojson)
    if (punti.length === 0) return
    if (punti.length === 1) {
      map.flyTo(punti[0], Math.max(map.getZoom(), 19))
    } else {
      map.flyToBounds(L.latLngBounds(punti), { padding: [60, 60], maxZoom: 20 })
    }
  }, [bancarella, map])

  return null
}

function BancarellaShape({ bancarella, onClick }: { bancarella: Bancarella; onClick: () => void }) {
  const geometry = bancarella.geometry_geojson
  const colore = statoBancarellaColors[bancarella.stato]
  const pathOptions = { color: colore, fillColor: colore, fillOpacity: 0.55, weight: 2 }

  if (geometry.type === 'Point') {
    return (
      <CircleMarker
        center={[geometry.coordinates[1], geometry.coordinates[0]]}
        radius={14}
        pathOptions={{ ...pathOptions, fillOpacity: 0.85 }}
        eventHandlers={{ click: onClick }}
      >
        <Tooltip direction="top" offset={[0, -8]}>
          {bancarella.id_posto}
        </Tooltip>
      </CircleMarker>
    )
  }

  return (
    <>
      {polygonRings(geometry).map((rings, i) => (
        <Polygon
          key={i}
          positions={rings}
          pathOptions={pathOptions}
          eventHandlers={{ click: onClick }}
        >
          <Tooltip direction="center">{bancarella.id_posto}</Tooltip>
        </Polygon>
      ))}
    </>
  )
}

function Legenda({ colore, label }: { colore: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: colore }} />
      {label}
    </div>
  )
}
