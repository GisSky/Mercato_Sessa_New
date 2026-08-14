interface Segment {
  key: string
  label: string
  color: string
}

interface StackedBarChartProps {
  segments: Segment[]
  rows: { label: string; values: Record<string, number> }[]
  emptyLabel?: string
}

export default function StackedBarChart({ segments, rows, emptyLabel = 'Nessun dato disponibile.' }: StackedBarChartProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>
  }

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {rows.map((row) => {
          const total = segments.reduce((sum, s) => sum + (row.values[s.key] ?? 0), 0)
          return (
            <div key={row.label}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-medium text-slate-700 truncate" title={row.label}>
                  {row.label}
                </span>
                <span className="text-xs text-slate-400">{total} posti</span>
              </div>
              <div className="flex h-3 gap-0.5 rounded-full overflow-hidden bg-slate-100">
                {segments.map((s) => {
                  const value = row.values[s.key] ?? 0
                  if (value === 0) return null
                  return (
                    <div
                      key={s.key}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${(value / (total || 1)) * 100}%`, backgroundColor: s.color }}
                      title={`${s.label}: ${value}`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
