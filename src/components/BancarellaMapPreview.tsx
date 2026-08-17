import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Polygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Bancarella } from '../types'
import { statoBancarellaColors, StatoBancarellaBadge } from './StatoBadge'
import { geometryLatLngs, geometryCentroid, polygonRings } from '../utils/geo'

function FitToBancarella({ bancarella }: { bancarella: Bancarella }) {
  const map = useMap()

  useEffect(() => {
    const punti = geometryLatLngs(bancarella.geometry_geojson)
    if (punti.length === 0) return
    if (punti.length === 1) {
      map.setView(punti[0], 19)
    } else {
      map.fitBounds(L.latLngBounds(punti), { padding: [24, 24], maxZoom: 20 })
    }
  }, [bancarella, map])

  return null
}

export default function BancarellaMapPreview({
  bancarella,
  mercatoNome,
  onClose,
}: {
  bancarella: Bancarella
  mercatoNome: string | null
  onClose: () => void
}) {
  const colore = statoBancarellaColors[bancarella.stato]
  const geometry = bancarella.geometry_geojson
  const centro = geometryCentroid(geometry)

  return (
    <div className="absolute right-0 top-full mt-2 z-30 w-80 rounded-xl bg-white shadow-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
        <div>
          <p className="font-medium text-slate-800 text-sm">Posto {bancarella.id_posto}</p>
          <p className="text-xs text-slate-400">{mercatoNome ?? 'Nessun mercato'}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none px-1">
          ×
        </button>
      </div>

      <div style={{ height: 160 }}>
        <MapContainer
          center={centro}
          zoom={18}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitToBancarella bancarella={bancarella} />
          {geometry.type === 'Point' ? (
            <CircleMarker
              center={[geometry.coordinates[1], geometry.coordinates[0]]}
              radius={12}
              pathOptions={{ color: colore, fillColor: colore, fillOpacity: 0.85, weight: 2 }}
            />
          ) : (
            polygonRings(geometry).map((rings, i) => (
              <Polygon
                key={i}
                positions={rings}
                pathOptions={{ color: colore, fillColor: colore, fillOpacity: 0.55, weight: 2 }}
              />
            ))
          )}
        </MapContainer>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-100">
        <StatoBancarellaBadge stato={bancarella.stato} />
        <Link
          to={`/mappa?evidenzia=${bancarella.id}`}
          className="text-sm font-medium text-blue-700 hover:underline whitespace-nowrap"
        >
          Apri sulla mappa completa →
        </Link>
      </div>
    </div>
  )
}
