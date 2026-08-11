import type { GeoGeometry } from '../types'

type LatLng = [number, number]

/** Converte un anello GeoJSON [lng,lat][] in coordinate Leaflet [lat,lng][] */
export function ringToLatLngs(ring: [number, number][]): LatLng[] {
  return ring.map(([lng, lat]) => [lat, lng])
}

/** Restituisce gli anelli (esterno + eventuali buchi) pronti per <Polygon positions=…> di Leaflet */
export function polygonRings(geometry: GeoGeometry): LatLng[][][] {
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates.map(ringToLatLngs)]
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map((polygon) => polygon.map(ringToLatLngs))
  }
  return []
}

/** Tutti i vertici di una geometria in [lat, lng], utile per calcolare i bounds su cui inquadrare la mappa */
export function geometryLatLngs(geometry: GeoGeometry): LatLng[] {
  if (geometry.type === 'Point') {
    return [[geometry.coordinates[1], geometry.coordinates[0]]]
  }
  const rings = geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.coordinates.map((p) => p[0])
  return rings.flatMap(ringToLatLngs)
}

/** Baricentro approssimativo (media dei vertici) in [lat, lng], utile per centrare la mappa e ancorare i tooltip */
export function geometryCentroid(geometry: GeoGeometry): LatLng {
  if (geometry.type === 'Point') {
    return [geometry.coordinates[1], geometry.coordinates[0]]
  }

  const rings = geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.coordinates.map((p) => p[0])

  let sumLat = 0
  let sumLng = 0
  let count = 0
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      sumLat += lat
      sumLng += lng
      count++
    }
  }
  if (count === 0) return [0, 0]
  return [sumLat / count, sumLng / count]
}
