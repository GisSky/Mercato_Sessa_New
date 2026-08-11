export type StatoBancarella = 'libero' | 'occupato' | 'riservato'
export type StatoPagamento = 'pagato' | 'non_pagato' | 'in_attesa'

export interface GeoPoint {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}

export interface GeoPolygon {
  type: 'Polygon'
  coordinates: [number, number][][] // array of linear rings [lng, lat], first ring = esterno
}

export interface GeoMultiPolygon {
  type: 'MultiPolygon'
  coordinates: [number, number][][][]
}

export type GeoGeometry = GeoPoint | GeoPolygon | GeoMultiPolygon

export interface Operatore {
  id: string
  codice_operatore: string
  nome: string
  cognome: string
  cf_piva: string | null
  telefono: string | null
  email: string | null
  settore: string | null
  note: string | null
  created_at: string
}

export type OperatoreInput = Omit<Operatore, 'id' | 'created_at'>

export interface Bancarella {
  id: string
  id_posto: string
  stato: StatoBancarella
  tipologia: string | null
  superficie: number | null
  note: string | null
  geometry_geojson: GeoGeometry
  created_at: string
}

export type BancarellaInput = Omit<Bancarella, 'id' | 'created_at'>

export interface Assegnazione {
  id: string
  bancarella_id: string
  operatore_id: string
  data_mercato: string
  stato_pagamento: StatoPagamento
  note: string | null
  created_at: string
}

export type AssegnazioneInput = Omit<Assegnazione, 'id' | 'created_at'>

export interface AssegnazioneConDettagli extends Assegnazione {
  bancarella?: Bancarella
  operatore?: Operatore
}
