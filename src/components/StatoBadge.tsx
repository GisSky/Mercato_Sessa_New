import type { StatoBancarella, StatoPagamento } from '../types'

const statoBancarellaConfig: Record<StatoBancarella, { label: string; className: string }> = {
  libero: { label: 'Libero', className: 'bg-green-100 text-green-800 border-green-300' },
  occupato: { label: 'Occupato', className: 'bg-red-100 text-red-800 border-red-300' },
  riservato: { label: 'Riservato', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
}

export function StatoBancarellaBadge({ stato }: { stato: StatoBancarella }) {
  const cfg = statoBancarellaConfig[stato]
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

const statoPagamentoConfig: Record<StatoPagamento, { label: string; className: string }> = {
  pagato: { label: 'Pagato', className: 'bg-green-100 text-green-800 border-green-300' },
  non_pagato: { label: 'Non pagato', className: 'bg-red-100 text-red-800 border-red-300' },
  in_attesa: { label: 'In attesa', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
}

export function StatoPagamentoBadge({ stato }: { stato: StatoPagamento }) {
  const cfg = statoPagamentoConfig[stato]
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

export const statoBancarellaColors: Record<StatoBancarella, string> = {
  libero: '#16a34a',
  occupato: '#dc2626',
  riservato: '#ca8a04',
}
