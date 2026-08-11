import shp from 'shpjs'
import type { GeoGeometry, StatoBancarella } from '../types'

export interface ParsedBancarellaRow {
  id_posto: string
  stato: StatoBancarella
  tipologia: string | null
  superficie: number | null
  note: string | null
  geometry_geojson: GeoGeometry
}

export interface SkippedFeature {
  index: number
  reason: string
}

export interface ParseResult {
  rows: ParsedBancarellaRow[]
  skipped: SkippedFeature[]
}

export interface RawFeature {
  properties: Record<string, unknown>
  geometry: GeoJSON.Geometry | null
}

export interface InspectResult {
  features: RawFeature[]
  propertyKeys: string[]
}

/** I ruoli che l'utente può assegnare alle colonne del file caricato. `idPosto` è l'unico obbligatorio. */
export interface FieldMapping {
  idPosto: string
  stato?: string
  tipologia?: string
  superficie?: string
  note?: string
}

const SUPPORTED_GEOMETRIES = new Set(['Point', 'Polygon', 'MultiPolygon'])

const GDB_HINT =
  'I File Geodatabase Esri (.gdb) non sono supportati direttamente (nessuna libreria affidabile li legge nel browser). ' +
  'Esportali prima in GeoJSON con QGIS ("Esporta → Salva oggetti geometrici con nome…", CRS EPSG:4326) oppure con ' +
  'ogr2ogr -f GeoJSON -t_srs EPSG:4326 output.geojson input.gdb NOME_LAYER, poi carica qui il file .geojson risultante.'

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

/** Verifica ricorsivamente che tutte le coppie [lng,lat] siano in range WGS84 valido */
function coordinatesInWgs84Range(coords: unknown): boolean {
  if (!Array.isArray(coords)) return false
  if (typeof coords[0] === 'number') {
    const [lng, lat] = coords as [number, number]
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90
  }
  return (coords as unknown[]).every(coordinatesInWgs84Range)
}

async function readFeatureCollections(file: File): Promise<GeoJSON.FeatureCollection[]> {
  const name = file.name.toLowerCase()

  if (name.includes('.gdb')) {
    throw new Error(GDB_HINT)
  }

  if (name.endsWith('.zip')) {
    const buffer = await file.arrayBuffer()
    try {
      const result = await shp(buffer)
      return Array.isArray(result) ? result : [result]
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Impossibile leggere lo shapefile dallo zip (${message}). Se questo .zip contiene un File Geodatabase Esri (.gdb) invece di uno shapefile: ${GDB_HINT}`,
      )
    }
  }

  if (name.endsWith('.geojson') || name.endsWith('.json')) {
    const text = await file.text()
    const json = JSON.parse(text)
    if (json.type === 'FeatureCollection') return [json]
    if (json.type === 'Feature') return [{ type: 'FeatureCollection', features: [json] }]
    throw new Error('Il file JSON non è un GeoJSON valido (atteso FeatureCollection o Feature).')
  }

  throw new Error('Formato non supportato: carica un file .geojson/.json oppure uno shapefile zippato (.zip).')
}

/** Legge il file e restituisce le feature grezze più l'elenco di tutti i campi trovati, per la mappatura manuale. */
export async function inspectImportFile(file: File): Promise<InspectResult> {
  const collections = await readFeatureCollections(file)
  const features: RawFeature[] = []
  const keySet = new Set<string>()

  for (const fc of collections) {
    for (const feature of fc.features) {
      const properties = (feature.properties ?? {}) as Record<string, unknown>
      Object.keys(properties).forEach((k) => keySet.add(k))
      features.push({ properties, geometry: feature.geometry })
    }
  }

  return { features, propertyKeys: Array.from(keySet).sort((a, b) => a.localeCompare(b)) }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function guessField(keys: string[], candidates: string[]): string | undefined {
  const byNormalized = new Map(keys.map((k) => [normalize(k), k]))
  for (const candidate of candidates) {
    const match = byNormalized.get(normalize(candidate))
    if (match) return match
  }
  return undefined
}

/** Prova ad indovinare la mappatura in base ai nomi dei campi più comuni, da usare come default modificabile dall'utente. */
export function guessFieldMapping(keys: string[]): Partial<FieldMapping> {
  return {
    idPosto: guessField(keys, ['id_posto', 'idposto', 'id posto', 'codice posto', 'codice_posto', 'posto']),
    stato: guessField(keys, ['stato']),
    tipologia: guessField(keys, ['tipologia', 'categoria']),
    superficie: guessField(keys, ['superficie', 'superficie mq', 'superficie_mq', 'mq']),
    note: guessField(keys, ['note', 'note ']),
  }
}

/** Applica la mappatura scelta dall'utente alle feature grezze, producendo le righe pronte per Supabase. */
export function buildRows(features: RawFeature[], mapping: FieldMapping): ParseResult {
  const rows: ParsedBancarellaRow[] = []
  const skipped: SkippedFeature[] = []

  features.forEach((feature, index) => {
    const props = feature.properties
    const idPostoRaw = props[mapping.idPosto]

    if (idPostoRaw === undefined || idPostoRaw === null || idPostoRaw === '') {
      skipped.push({ index, reason: `Valore mancante nel campo mappato come ID posto ("${mapping.idPosto}")` })
      return
    }

    const geometry = feature.geometry
    if (!geometry || !SUPPORTED_GEOMETRIES.has(geometry.type)) {
      skipped.push({
        index,
        reason: `Geometria "${geometry?.type ?? 'assente'}" non supportata (servono Point, Polygon o MultiPolygon)`,
      })
      return
    }

    if (!coordinatesInWgs84Range((geometry as { coordinates: unknown }).coordinates)) {
      skipped.push({
        index,
        reason: 'Coordinate fuori dal range WGS84: probabile CRS non riproiettato in EPSG:4326',
      })
      return
    }

    const statoRaw = mapping.stato ? String(props[mapping.stato] ?? '').trim().toLowerCase() : ''
    const stato: StatoBancarella =
      statoRaw === 'occupato' || statoRaw === 'riservato' ? statoRaw : 'libero'

    rows.push({
      id_posto: String(idPostoRaw),
      stato,
      tipologia: mapping.tipologia ? toStringOrNull(props[mapping.tipologia]) : null,
      superficie: mapping.superficie ? toNumberOrNull(props[mapping.superficie]) : null,
      note: mapping.note ? toStringOrNull(props[mapping.note]) : null,
      geometry_geojson: geometry as GeoGeometry,
    })
  })

  return { rows, skipped }
}
