import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import {
  buildRows,
  guessFieldMapping,
  inspectImportFile,
  type FieldMapping,
  type InspectResult,
  type ParseResult,
} from '../utils/importGeo'
import { StatoBancarellaBadge } from '../components/StatoBadge'

const NESSUNO = ''

export default function Importa() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const [inspected, setInspected] = useState<InspectResult | null>(null)
  const [mapping, setMapping] = useState<FieldMapping | null>(null)
  const [result, setResult] = useState<ParseResult | null>(null)

  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState<number | null>(null)

  async function handleFile(file: File) {
    setFileName(file.name)
    setParsing(true)
    setParseError(null)
    setInspected(null)
    setMapping(null)
    setResult(null)
    setImportedCount(null)
    setImportError(null)
    try {
      const inspection = await inspectImportFile(file)
      if (inspection.features.length === 0) {
        setParseError('Il file non contiene nessuna feature.')
        return
      }
      const guess = guessFieldMapping(inspection.propertyKeys)
      setInspected(inspection)
      setMapping({
        idPosto: guess.idPosto ?? '',
        stato: guess.stato ?? NESSUNO,
        tipologia: guess.tipologia ?? NESSUNO,
        superficie: guess.superficie ?? NESSUNO,
        note: guess.note ?? NESSUNO,
      })
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Errore durante la lettura del file.')
    } finally {
      setParsing(false)
    }
  }

  function handleGeneraAnteprima() {
    if (!inspected || !mapping || !mapping.idPosto) return
    const cleanMapping: FieldMapping = {
      idPosto: mapping.idPosto,
      stato: mapping.stato || undefined,
      tipologia: mapping.tipologia || undefined,
      superficie: mapping.superficie || undefined,
      note: mapping.note || undefined,
    }
    setResult(buildRows(inspected.features, cleanMapping))
    setImportedCount(null)
    setImportError(null)
  }

  async function handleImport() {
    if (!result || result.rows.length === 0) return
    setImporting(true)
    setImportError(null)
    const { error, data } = await supabase
      .from('bancarelle')
      .upsert(result.rows, { onConflict: 'id_posto' })
      .select('id_posto')
    setImporting(false)
    if (error) {
      setImportError(error.message)
      return
    }
    setImportedCount(data?.length ?? result.rows.length)
  }

  function reset() {
    setFileName(null)
    setInspected(null)
    setMapping(null)
    setResult(null)
    setParseError(null)
    setImportError(null)
    setImportedCount(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">Importa bancarelle</h1>
        <p className="text-sm text-slate-500">
          Carica un file GeoJSON oppure uno shapefile compresso in .zip (contenente .shp, .dbf, .shx, .prj) per
          creare o aggiornare i posti del mercato in blocco.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <div className="rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-sm p-4 mb-6">
          Supabase non è configurato. Aggiungi le credenziali nel file <code>.env</code>.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 mb-6">
        <div className="mb-4 text-sm text-slate-600 space-y-1">
          <p>
            Dopo il caricamento potrai scegliere quale campo del file corrisponde all'ID del posto (obbligatorio) e,
            se presenti, a stato, tipologia, superficie e note — non serve che i nomi dei campi coincidano con quelli
            usati dall'app.
          </p>
          <p>
            Le coordinate devono essere in WGS84 (EPSG:4326). Se il file usa un altro sistema di riferimento,
            riproiettalo prima con QGIS o <code>ogr2ogr -t_srs EPSG:4326</code>.
          </p>
          <p>
            I <strong>File Geodatabase Esri (.gdb)</strong> non si possono caricare direttamente qui: esportali prima
            in GeoJSON da QGIS (<code>Esporta → Salva oggetti geometrici con nome…</code>) o con{' '}
            <code>ogr2ogr -f GeoJSON</code>, poi carica il file <code>.geojson</code> risultante.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json,.zip"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-800"
        />

        {parsing && <p className="mt-4 text-sm text-slate-500">Lettura di «{fileName}» in corso…</p>}

        {parseError && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3 whitespace-pre-line">
            {parseError}
          </div>
        )}
      </div>

      {inspected && mapping && !result && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4 mb-6">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Mappatura dei campi</h2>
            <p className="text-sm text-slate-500">
              {inspected.features.length} feature trovate in «{fileName}». Indica a quale campo corrisponde ogni
              informazione.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <MappingField
              label="ID posto"
              required
              value={mapping.idPosto}
              options={inspected.propertyKeys}
              onChange={(v) => setMapping({ ...mapping, idPosto: v })}
            />
            <MappingField
              label="Stato"
              value={mapping.stato ?? NESSUNO}
              options={inspected.propertyKeys}
              onChange={(v) => setMapping({ ...mapping, stato: v })}
            />
            <MappingField
              label="Tipologia"
              value={mapping.tipologia ?? NESSUNO}
              options={inspected.propertyKeys}
              onChange={(v) => setMapping({ ...mapping, tipologia: v })}
            />
            <MappingField
              label="Superficie"
              value={mapping.superficie ?? NESSUNO}
              options={inspected.propertyKeys}
              onChange={(v) => setMapping({ ...mapping, superficie: v })}
            />
            <MappingField
              label="Note"
              value={mapping.note ?? NESSUNO}
              options={inspected.propertyKeys}
              onChange={(v) => setMapping({ ...mapping, note: v })}
            />
          </div>

          {!mapping.idPosto && (
            <p className="text-sm text-amber-700">Seleziona il campo ID posto per continuare.</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleGeneraAnteprima}
              disabled={!mapping.idPosto}
              className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
            >
              Genera anteprima
            </button>
            <button
              onClick={reset}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">
              <strong className="text-slate-800">{result.rows.length}</strong> bancarelle pronte per l'importazione
            </span>
            {result.skipped.length > 0 && (
              <span className="text-sm text-amber-700">
                <strong>{result.skipped.length}</strong> feature scartate
              </span>
            )}
            {importedCount === null && (
              <button
                onClick={() => setResult(null)}
                className="ml-auto text-sm text-blue-700 hover:underline font-medium"
              >
                Modifica mappatura
              </button>
            )}
          </div>

          {result.rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Posto</th>
                    <th className="px-3 py-2 font-medium">Stato</th>
                    <th className="px-3 py-2 font-medium">Tipologia</th>
                    <th className="px-3 py-2 font-medium">Geometria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.slice(0, 20).map((r, i) => (
                    <tr key={`${r.id_posto}-${i}`}>
                      <td className="px-3 py-2 font-medium text-slate-700">{r.id_posto}</td>
                      <td className="px-3 py-2">
                        <StatoBancarellaBadge stato={r.stato} />
                      </td>
                      <td className="px-3 py-2 text-slate-500">{r.tipologia || '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{r.geometry_geojson.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 20 && (
                <p className="px-3 py-2 text-xs text-slate-400 bg-slate-50">
                  Mostrate le prime 20 righe su {result.rows.length}.
                </p>
              )}
            </div>
          )}

          {result.skipped.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Feature scartate</h3>
              <ul className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md divide-y divide-amber-200">
                {result.skipped.slice(0, 10).map((s, i) => (
                  <li key={i} className="px-3 py-2">
                    Feature #{s.index + 1}: {s.reason}
                  </li>
                ))}
              </ul>
              {result.skipped.length > 10 && (
                <p className="text-xs text-slate-400 mt-1">
                  E altre {result.skipped.length - 10} feature scartate.
                </p>
              )}
            </div>
          )}

          {importError && (
            <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3">
              Errore durante l'importazione: {importError}
            </div>
          )}

          {importedCount !== null ? (
            <div className="rounded-md bg-green-50 border border-green-200 text-green-800 text-sm p-3 flex flex-wrap items-center justify-between gap-3">
              <span>
                Importate/aggiornate <strong>{importedCount}</strong> bancarelle con successo.
              </span>
              <Link to="/mappa" className="font-medium underline">
                Vai alla mappa
              </Link>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={importing || result.rows.length === 0}
                className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {importing ? 'Importazione in corso…' : `Importa ${result.rows.length} bancarelle in Supabase`}
              </button>
              <button
                onClick={reset}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annulla
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MappingField({
  label,
  required,
  value,
  options,
  onChange,
}: {
  label: string
  required?: boolean
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm">
      <span className="block font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={NESSUNO}>{required ? 'Seleziona un campo…' : '— nessuno —'}</option>
        {options.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </label>
  )
}
