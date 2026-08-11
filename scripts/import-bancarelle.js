// Importa/aggiorna le bancarelle in Supabase a partire da un GeoJSON
// (poligoni) esportato da uno shapefile. Vedi README.md, sezione
// "Importare le bancarelle da uno shapefile poligonale".
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-bancarelle.js percorso/bancarelle.geojson
//
// Il GeoJSON deve essere una FeatureCollection di Polygon/MultiPolygon.
// Ogni feature deve avere nelle "properties" almeno il campo id_posto;
// stato, tipologia, superficie, note sono opzionali.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [, , geojsonPath] = process.argv

if (!geojsonPath) {
  console.error('Uso: node scripts/import-bancarelle.js percorso/bancarelle.geojson')
  process.exit(1)
}

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Imposta le variabili d\'ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role).\n' +
      'La service_role key bypassa la RLS: usala solo da questo script locale, mai nel frontend.',
  )
  process.exit(1)
}

const validStati = new Set(['libero', 'occupato', 'riservato'])

function normalizeStato(value) {
  const v = (value ?? '').toString().trim().toLowerCase()
  return validStati.has(v) ? v : 'libero'
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function main() {
  const raw = readFileSync(geojsonPath, 'utf-8')
  const geojson = JSON.parse(raw)

  if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
    console.error('Il file deve essere un GeoJSON di tipo FeatureCollection.')
    process.exit(1)
  }

  const righe = []
  const senzaIdPosto = []

  for (const feature of geojson.features) {
    const props = feature.properties ?? {}
    const idPosto = props.id_posto ?? props.ID_POSTO ?? props.Id_posto

    if (!idPosto) {
      senzaIdPosto.push(feature)
      continue
    }

    if (feature.geometry?.type !== 'Polygon' && feature.geometry?.type !== 'MultiPolygon') {
      console.warn(`Attenzione: id_posto "${idPosto}" ha geometria "${feature.geometry?.type}", non Polygon/MultiPolygon — importata comunque.`)
    }

    righe.push({
      id_posto: String(idPosto),
      stato: normalizeStato(props.stato),
      tipologia: props.tipologia ?? null,
      superficie: toNumberOrNull(props.superficie),
      note: props.note ?? null,
      geometry_geojson: feature.geometry,
    })
  }

  if (senzaIdPosto.length > 0) {
    console.warn(`Saltate ${senzaIdPosto.length} feature senza il campo "id_posto" nelle properties.`)
  }

  if (righe.length === 0) {
    console.error('Nessuna feature valida da importare.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await supabase
    .from('bancarelle')
    .upsert(righe, { onConflict: 'id_posto' })
    .select('id_posto')

  if (error) {
    console.error('Errore durante l\'importazione:', error.message)
    process.exit(1)
  }

  console.log(`Importate/aggiornate ${data.length} bancarelle.`)
}

main()
