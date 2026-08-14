import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/mappa', label: 'Mappa mercato' },
  { to: '/bancarelle', label: 'Bancarelle' },
  { to: '/operatori', label: 'Operatori' },
  { to: '/assegnazioni', label: 'Assegnazioni' },
  { to: '/importa', label: 'Importa bancarelle' },
  { to: '/cambia-password', label: 'Cambia password' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth()

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-800 text-sm font-bold">
              MC
            </div>
            <div>
              <p className="font-semibold leading-tight">Mercato Digitale Comunale</p>
              <p className="text-xs text-blue-200 leading-tight">Gestione bancarelle e operatori</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-blue-100">{session?.user.email}</span>
            <button
              onClick={() => signOut()}
              className="text-sm bg-blue-700 hover:bg-blue-600 transition rounded-md px-3 py-1.5"
            >
              Esci
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? 'border-white text-white'
                    : 'border-transparent text-blue-200 hover:text-white hover:border-blue-300'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">{children}</main>

      <footer className="text-center text-xs text-slate-400 py-4">
        Mercato Digitale Comunale — uso interno
      </footer>
    </div>
  )
}
