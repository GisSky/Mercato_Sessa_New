interface BarDatum {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarDatum[]
  color?: string
  unit?: string
  emptyLabel?: string
}

export default function BarChart({ data, color = '#1d4ed8', unit = '', emptyLabel = 'Nessun dato disponibile.' }: BarChartProps) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-400">{emptyLabel}</p>
  }
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-slate-500" title={d.label}>
            {d.label}
          </span>
          <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? color }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-medium text-slate-700">
            {d.value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}
