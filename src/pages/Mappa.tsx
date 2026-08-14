import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polygon, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import '@geoman-io/leaflet-geoman-free'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { Bancarella, BancarellaInput, GeoGeometry, Operatore, StatoBancarella } from '../types'
import { statoBancarellaColors } from '../components/StatoBadge'
import BancarellaModal from '../components/BancarellaModal'
import BancarellaFormModal from '../components/BancarellaFormModal'
import { geometryLatLngs, polygonRings } from '../utils/geo'
import { useMercati } from '../hooks/useMercati'

const DEFAULT_CENTER: [number, number] = [41.9028, 12.4964]

export default function Mappa() {
  const { mercati } = useMercati()
  const [bancarelle, setBancarelle] = useState<Bancarella[]>([])
  const [operatori, setOperatori] = useState<Operatore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [filtroStato, setFiltroStato] = useState<StatoBancarella | 'tutti'>('tutti')
  const [filtroTipologia, setFiltroTipologia] = useState<string>('tutte')
  const [filtroMercato, setFiltroMercato] = useState<string>('tutti')

  const [editingShapeId, setEditingShapeId] = useState<string | null>(null)
  const [savingShape, setSavingShape] = useState(false)
  const editableShapeRef = useRef<{ save: () => GeoGeometry | null }>(null)

  const [drawingNew, setDrawingNew] = useState(false)
  const [nuovaGeometria, setNuovaGeometria] = useState<GeoGeometry | null>(null)

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
      if (filtroMercato !== 'tutti' && b.mercato_id !== filtroMercato) return false
      return true
    })
  }, [bancarelle, filtroStato, filtroTipologia, filtroMercato])

  const selected = bancarelle.find((b) => b.id === selectedId) ?? null

  async function handleSalvaForma() {
    if (!editingShapeId) return
    const geometry = editableShapeRef.current?.save()
    if (!geometry) return
    setSavingShape(true)
    const { error } = await supabase
      .from('bancarelle')
      .update({ geometry_geojson: geometry })
      .eq('id', editingShapeId)
    setSavingShape(false)
    if (error) {
      alert('Errore nel salvataggio della forma: ' + error.message)
      return
    }
    setEditingShapeId(null)
    await load()
  }

  const handleGeometriaDisegnata = useCallback((geometry: GeoGeometry) => {
    setDrawingNew(false)
    setNuovaGeometria(geometry)
  }, [])

  async function handleCreaBancarella(values: Partial<BancarellaInput>): Promise<string | null> {
    const { error } = await supabase.from('bancarelle').insert(values as BancarellaInput)
    if (error) return error.message
    setNuovaGeometria(null)
    await load()
    return null
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Mappa del mercato</h1>
          <p className="text-sm text-slate-500">
            Clicca su una bancarella per vedere i dettagli e assegnare un operatore
          </p>
        </div>
        <button
          onClick={() => setDrawingNew((v) => !v)}
          disabled={editingShapeId !== null}
          className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 ${
            drawingNew
              ? 'bg-slate-700 text-white hover:bg-slate-800'
              : 'bg-blue-700 text-white hover:bg-blue-800'
          }`}
        >
          {drawingNew ? 'Annulla disegno' : '+ Nuova bancarella (disegna poligono)'}
        </button>
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
          <label className="block text-xs font-medium text-slate-500 mb-1">Filtra per mercato</label>
          <select
            className="input !w-auto"
            value={filtroMercato}
            onChange={(e) => setFiltroMercato(e.target.value)}
          >
            <option value="tutti">Tutti i mercati</option>
            {mercati.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
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

      <div
        className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm"
        style={{ height: '600px' }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">Caricamento mappa…</div>
        ) : (
          <MapContainer center={DEFAULT_CENTER} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds bancarelle={filtrate} />
            <FlyToSelected bancarella={selected} />
            <DrawControl active={drawingNew} onCreated={handleGeometriaDisegnata} />
            {filtrate.map((b) =>
              b.id === editingShapeId ? (
                <EditableShape key={b.id} ref={editableShapeRef} bancarella={b} />
              ) : (
                <BancarellaShape
                  key={b.id}
                  bancarella={b}
                  onClick={() => {
                    if (!drawingNew) setSelectedId(b.id)
                  }}
                />
              ),
            )}
          </MapContainer>
        )}

        {drawingNew && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 rounded-lg bg-white shadow-lg border border-slate-200 px-4 py-2">
            <span className="text-sm text-slate-600">
              Clicca sulla mappa per posizionare i vertici, doppio click (o clicca sul primo vertice) per chiudere il
              poligono
            </span>
            <button
              onClick={() => setDrawingNew(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annulla
            </button>
          </div>
        )}

        {editingShapeId && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 rounded-lg bg-white shadow-lg border border-slate-200 px-4 py-2">
            <span className="text-sm text-slate-600">Trascina i vertici per modificare la forma</span>
            <button
              onClick={handleSalvaForma}
              disabled={savingShape}
              className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {savingShape ? 'Salvataggio…' : 'Salva forma'}
            </button>
            <button
              onClick={() => setEditingShapeId(null)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annulla
            </button>
          </div>
        )}
      </div>

      {selected && (
        <BancarellaModal
          bancarella={selected}
          operatori={operatori}
          onClose={() => setSelectedId(null)}
          onChanged={load}
          onEditShape={
            selected.geometry_geojson.type === 'Polygon'
              ? () => {
                  setEditingShapeId(selected.id)
                  setSelectedId(null)
                }
              : undefined
          }
        />
      )}

      {nuovaGeometria && (
        <BancarellaFormModal
          bancarella={null}
          initialGeometry={nuovaGeometria}
          onClose={() => setNuovaGeometria(null)}
          onSave={handleCreaBancarella}
        />
      )}
    </div>
  )
}

/** Attiva/disattiva la modalità di disegno poligoni di Geoman e riporta la geometria completata. */
function DrawControl({ active, onCreated }: { active: boolean; onCreated: (geometry: GeoGeometry) => void }) {
  const map = useMap()

  useEffect(() => {
    if (!active) return

    map.pm.enableDraw('Polygon', { allowSelfIntersection: false })

    function handleCreate(e: { layer: L.Layer }) {
      const layer = e.layer as L.Polygon
      const geojson = layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>
      layer.remove()
      onCreated(geojson.geometry as GeoGeometry)
    }

    map.on('pm:create', handleCreate)
    return () => {
      map.off('pm:create', handleCreate)
      map.pm.disableDraw('Polygon')
    }
  }, [active, map, onCreated])

  return null
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

/** Rende modificabili i vertici del poligono di una bancarella (trascinamento/aggiunta/rimozione). */
const EditableShape = forwardRef<{ save: () => GeoGeometry | null }, { bancarella: Bancarella }>(
  function EditableShape({ bancarella }, ref) {
    const layerRef = useRef<L.Polygon | null>(null)

    useEffect(() => {
      const layer = layerRef.current
      if (!layer) return
      layer.pm.enable({ allowSelfIntersection: false })
      return () => {
        layer.pm.disable()
      }
    }, [])

    useImperativeHandle(ref, () => ({
      save: () => {
        const layer = layerRef.current
        if (!layer) return null
        const geojson = layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>
        return geojson.geometry as GeoGeometry
      },
    }))

    const geometry = bancarella.geometry_geojson
    if (geometry.type !== 'Polygon') return null

    return (
      <Polygon
        ref={layerRef}
        positions={polygonRings(geometry)[0]}
        pathOptions={{ color: '#2563eb', weight: 3, dashArray: '6 6', fillOpacity: 0.15 }}
      />
    )
  },
)

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
