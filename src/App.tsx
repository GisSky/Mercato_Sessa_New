import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Operatori from './pages/Operatori'
import Mappa from './pages/Mappa'
import Assegnazioni from './pages/Assegnazioni'
import Importa from './pages/Importa'
import CambiaPassword from './pages/CambiaPassword'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mappa"
            element={
              <ProtectedRoute>
                <Layout>
                  <Mappa />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operatori"
            element={
              <ProtectedRoute>
                <Layout>
                  <Operatori />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/assegnazioni"
            element={
              <ProtectedRoute>
                <Layout>
                  <Assegnazioni />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/importa"
            element={
              <ProtectedRoute>
                <Layout>
                  <Importa />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cambia-password"
            element={
              <ProtectedRoute>
                <Layout>
                  <CambiaPassword />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
