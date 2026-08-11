function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function downloadCsv<T extends object>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
  filename: string,
) {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(';')
  const body = rows
    .map((row) => columns.map((c) => escapeCsvValue(row[c.key])).join(';'))
    .join('\n')
  const csvContent = '﻿' + header + '\n' + body

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
