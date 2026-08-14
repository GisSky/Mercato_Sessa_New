interface GaugeProps {
  value: number
  label: string
  sublabel?: string
  color?: string
  size?: number
}

export default function Gauge({ value, label, sublabel, color = '#1d4ed8', size = 160 }: GaugeProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const strokeWidth = 14
  const r = size / 2 - strokeWidth
  const cx = size / 2
  const cy = size / 2
  const circumference = Math.PI * r
  const offset = circumference * (1 - clamped / 100)
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + strokeWidth} viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`} role="img">
        <title>
          {label}: {Math.round(clamped)}%
        </title>
        <path d={arcPath} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-slate-800"
          style={{ fontSize: 26, fontWeight: 600 }}
        >
          {Math.round(clamped)}%
        </text>
      </svg>
      <p className="text-sm font-medium text-slate-700 mt-1 text-center">{label}</p>
      {sublabel && <p className="text-xs text-slate-400 text-center">{sublabel}</p>}
    </div>
  )
}
