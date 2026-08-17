import * as XLSX from 'xlsx'
import type { OperatoreInput } from '../types'

export interface InspectedOperatoriFile {
  rows: Record<string, unknown>[]
  columns: string[]
}

/** I ruoli che l'utente può assegnare alle colonne del file caricato. Codice, nome e cognome sono obbligatori. */
export interface OperatoriFieldMapping {
  codiceOperatore: string
  nome: string
  cognome: string
  cfPiva?: string
  telefono?: string
  email?: string
  settore?: string
  note?: string
}

export interface SkippedOperatoreRow {
  index: number
  reason: string
}

export interface OperatoriParseResult {
  rows: OperatoreInput[]
  skipped: SkippedOperatoreRow[]
}

/** Legge un file .xlsx/.xls/.csv e restituisce le righe come oggetti più l'elenco delle colonne trovate. */
export async function inspectOperatoriFile(file: File): Promise<InspectedOperatoriFile> {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
    throw new Error('Formato non supportato: carica un file .xlsx, .xls oppure .csv.')
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Il file non contiene nessun foglio.')
  const sheet = workbook.Sheets[sheetName]

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
  const columnSet = new Set<string>()
  rows.forEach((row) => Object.keys(row).forEach((k) => columnSet.add(k)))

  return { rows, columns: Array.from(columnSet) }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function guessField(columns: string[], candidates: string[]): string | undefined {
  const byNormalized = new Map(columns.map((c) => [normalize(c), c]))
  for (const candidate of candidates) {
    const match = byNormalized.get(normalize(candidate))
    if (match) return match
  }
  return undefined
}

/** Prova ad indovinare la mappatura in base ai nomi di colonna più comuni, da usare come default modificabile dall'utente. */
export function guessOperatoriMapping(columns: string[]): Partial<OperatoriFieldMapping> {
  return {
    codiceOperatore: guessField(columns, [
      'codice_operatore',
      'codice operatore',
      'codiceoperatore',
      'codice',
      'cod_operatore',
      'matricola',
    ]),
    nome: guessField(columns, ['nome']),
    cognome: guessField(columns, ['cognome']),
    cfPiva: guessField(columns, ['cf_piva', 'cf/piva', 'cf piva', 'codice fiscale', 'partita iva', 'piva', 'cf']),
    telefono: guessField(columns, ['telefono', 'tel', 'cellulare', 'telefono1', 'numero di telefono']),
    email: guessField(columns, ['email', 'e-mail', 'mail', 'indirizzo email']),
    settore: guessField(columns, ['settore', 'categoria', 'tipologia']),
    note: guessField(columns, ['note', 'annotazioni', 'osservazioni']),
  }
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function toStringOrNull(value: unknown): string | null {
  const str = cellToString(value)
  return str === '' ? null : str
}

/** Applica la mappatura scelta dall'utente alle righe grezze, producendo gli operatori pronti per Supabase. */
export function buildOperatoriRows(
  rows: Record<string, unknown>[],
  mapping: OperatoriFieldMapping,
): OperatoriParseResult {
  const skipped: SkippedOperatoreRow[] = []
  const byCodice = new Map<string, OperatoreInput>()
  const orderedCodici: string[] = []

  rows.forEach((row, index) => {
    const codice = cellToString(row[mapping.codiceOperatore])
    const nome = cellToString(row[mapping.nome])
    const cognome = cellToString(row[mapping.cognome])

    if (!codice) {
      skipped.push({ index, reason: `Valore mancante nel campo mappato come Codice operatore ("${mapping.codiceOperatore}")` })
      return
    }
    if (!nome) {
      skipped.push({ index, reason: `Valore mancante nel campo mappato come Nome ("${mapping.nome}")` })
      return
    }
    if (!cognome) {
      skipped.push({ index, reason: `Valore mancante nel campo mappato come Cognome ("${mapping.cognome}")` })
      return
    }

    if (byCodice.has(codice)) {
      skipped.push({ index, reason: `Codice operatore "${codice}" duplicato nel file: mantenuta l'ultima occorrenza` })
    } else {
      orderedCodici.push(codice)
    }

    byCodice.set(codice, {
      codice_operatore: codice,
      nome,
      cognome,
      cf_piva: mapping.cfPiva ? toStringOrNull(row[mapping.cfPiva]) : null,
      telefono: mapping.telefono ? toStringOrNull(row[mapping.telefono]) : null,
      email: mapping.email ? toStringOrNull(row[mapping.email]) : null,
      settore: mapping.settore ? toStringOrNull(row[mapping.settore]) : null,
      note: mapping.note ? toStringOrNull(row[mapping.note]) : null,
    })
  })

  return { rows: orderedCodici.map((c) => byCodice.get(c)!), skipped }
}
