import { useRef, useState } from 'react'
import Modal from './Modal'
import { supabase } from '../lib/supabaseClient'
import {
  buildOperatoriRows,
  guessOperatoriMapping,
  inspectOperatoriFile,
  type InspectedOperatoriFile,
  type OperatoriFieldMapping,
  type OperatoriParseResult,
} from '../utils/importOperatori'

const NESSUNO = ''

export default function OperatoriImportPanel({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const [inspected, setInspected] = useState<InspectedOperatoriFile | null>(null)
  const [mapping, setMapping] = useState<Record<string, string> | null>(null)
  const [result, setResult] = useState<OperatoriParseResult | null>(null)

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
      const inspection = await inspectOperatoriFile(file)
      if (inspection.rows.length === 0) {
        setParseError('Il file non contiene nessuna riga.')
        return
      }
      const guess = guessOperatoriMapping(inspection.columns)
      setInspected(inspection)
      setMapping({
        codiceOperatore: guess.codiceOperatore ?? '',
        nome: guess.nome ?? '',
        cognome: guess.cognome ?? '',
        cfPiva: guess.cfPiva ?? NESSUNO,
        telefono: guess.telefono ?? NESSUNO,
        email: guess.email ?? NESSUNO,
        settore: guess.settore ?? NESSUNO,
        note: guess.note ?? NESSUNO,
      })
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Errore durante la lettura del file.')
    } finally {
      setParsing(false)
    }
  }

  function handleGeneraAnteprima() {
    if (!inspected || !mapping || !mapping.codiceOperatore || !mapping.nome || !mapping.cognome) return
    const cleanMapping: OperatoriFieldMapping = {
      codiceOperatore: mapping.codiceOperatore,
      nome: mapping.nome,
      cognome: mapping.cognome,
      cfPiva: mapping.cfPiva || undefined,
      telefono: mapping.telefono || undefined,
      email: mapping.email || undefined,
      settore: mapping.settore || undefined,
      note: mapping.note || undefined,
    }
    setResult(buildOperatoriRows(inspected.rows, cleanMapping))
    setImportedCount(null)
    setImportError(null)
  }

  async function handleImport() {
    if (!result || result.rows.length === 0) return
    setImporting(true)
    setImportError(null)
    const { error, data } = await supabase
      .from('operatori')
      .upsert(result.rows, { onConflict: 'codice_operatore' })
      .select('id')
    setImporting(false)
    if (error) {
      setImportError(error.message)
      return
    }
    setImportedCount(data?.length ?? result.rows.length)
    onImported()
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

  const mappingReady = !!(mapping?.codiceOperatore && mapping?.nome && mapping?.cognome)

  return (
    <Modal title="Importa operatori da Excel/CSV" onClose={onClose} widthClassName="max-w-3xl">
      <div className="space-y-5">
        <div className="text-sm text-slate-600 space-y-1">
          <p>
            Carica un file <strong>.xlsx</strong>, <strong>.xls</strong> oppure <strong>.csv</strong> con l'elenco
            degli operatori. Dopo il caricamento potrai scegliere quale colonna corrisponde a ciascun campo — non
            serve che i nomi coincidano con quelli usati dall'app.
          </p>
          <p>
            Codice operatore, nome e cognome sono obbligatori. Se un codice operatore già esistente compare nel
            file, l'operatore verrà aggiornato invece di essere duplicato.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-800"
        />

        {parsing && <p className="text-sm text-slate-500">Lettura di «{fileName}» in corso…</p>}

        {parseError && (
          <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm p-3 whitespace-pre-line">
            {parseError}
          </div>
        )}

        {inspected && mapping && !result && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Mappatura dei campi</h3>
              <p className="text-sm text-slate-500">
                {inspected.rows.length} righe trovate in «{fileName}». Indica a quale colonna corrisponde ogni
                informazione.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <MappingField
                label="Codice operatore"
                required
                value={mapping.codiceOperatore}
                options={inspected.columns}
                onChange={(v) => setMapping({ ...mapping, codiceOperatore: v })}
              />
              <MappingField
                label="Settore"
                value={mapping.settore}
                options={inspected.columns}
                onChange={(v) => setMapping({ ...mapping, settore: v })}
              />
              <MappingField
                label="Nome"
                required
                value={mapping.nome}
                options={inspected.columns}
                onChange={(v) => setMapping({ ...mapping, nome: v })}
              />
              <MappingField
                label="Cognome"
                required
                value={mapping.cognome}
                options={inspected.columns}
                onChange={(v) => setMapping({ ...mapping, cognome: v })}
              />
              <MappingField
                label="CF/P.IVA"
                value={mapping.cfPiva}
                options={inspected.columns}
                onChange={(v) => setMapping({ ...mapping, cfPiva: v })}
              />
              <MappingField
                label="Telefono"
                value={mapping.telefono}
                options={inspected.columns}
                onChange={(v) => setMapping({ ...mapping, telefono: v })}
              />
              <MappingField
                label="Email"
                value={mapping.email}
                options={inspected.columns}
                onChange={(v) => setMapping({ ...mapping, email: v })}
              />
              <MappingField
                label="Note"
                value={mapping.note}
                options={inspected.columns}
                onChange={(v) => setMapping({ ...mapping, note: v })}
              />
            </div>

            {!mappingReady && (
              <p className="text-sm text-amber-700">
                Seleziona i campi Codice operatore, Nome e Cognome per continuare.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGeneraAnteprima}
                disabled={!mappingReady}
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
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-600">
                <strong className="text-slate-800">{result.rows.length}</strong> operatori pronti per l'importazione
              </span>
              {result.skipped.length > 0 && (
                <span className="text-sm text-amber-700">
                  <strong>{result.skipped.length}</strong> righe scartate o unite
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
              <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-64">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium">Codice</th>
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">Cognome</th>
                      <th className="px-3 py-2 font-medium">Settore</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.rows.slice(0, 20).map((r, i) => (
                      <tr key={`${r.codice_operatore}-${i}`}>
                        <td className="px-3 py-2 font-medium text-slate-700">{r.codice_operatore}</td>
                        <td className="px-3 py-2 text-slate-500">{r.nome}</td>
                        <td className="px-3 py-2 text-slate-500">{r.cognome}</td>
                        <td className="px-3 py-2 text-slate-500">{r.settore || '—'}</td>
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
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Righe scartate o unite</h3>
                <ul className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md divide-y divide-amber-200 max-h-40 overflow-y-auto">
                  {result.skipped.slice(0, 10).map((s, i) => (
                    <li key={i} className="px-3 py-2">
                      Riga #{s.index + 2}: {s.reason}
                    </li>
                  ))}
                </ul>
                {result.skipped.length > 10 && (
                  <p className="text-xs text-slate-400 mt-1">E altre {result.skipped.length - 10} righe.</p>
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
                  Importati/aggiornati <strong>{importedCount}</strong> operatori con successo.
                </span>
                <button onClick={onClose} className="font-medium underline">
                  Chiudi
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing || result.rows.length === 0}
                  className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
                >
                  {importing ? 'Importazione in corso…' : `Importa ${result.rows.length} operatori in Supabase`}
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
    </Modal>
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
        <option value={NESSUNO}>{required ? 'Seleziona una colonna…' : '— nessuna —'}</option>
        {options.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </label>
  )
}
