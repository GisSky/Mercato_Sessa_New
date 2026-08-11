import type { ReactNode } from 'react'

export default function Modal({
  title,
  onClose,
  children,
  widthClassName = 'max-w-lg',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  widthClassName?: string
}) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 px-4">
      <div className={`w-full ${widthClassName} rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
