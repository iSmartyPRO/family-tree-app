import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import TreeEditor from './pages/TreeEditor'
import Admin from './pages/Admin'
import PublicTreeView from './pages/PublicTreeView'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="spinner-center"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="spinner-center"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function AppContent() {
  useEffect(() => {
    fetch('/api/admin/config', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const config = data.config || data
        if (config.primaryColor) {
          document.documentElement.style.setProperty('--primary', config.primaryColor)
        }
        if (config.customCss) {
          const style = document.createElement('style')
          style.id = 'custom-app-css'
          style.textContent = config.customCss
          document.head.appendChild(style)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <Navbar />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/tree/:id" element={
            <ProtectedRoute><TreeEditor /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute><Admin /></AdminRoute>
          } />
          <Route path="/public/:token" element={<PublicTreeView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  )
}

export default function App() {
  return <AppContent />
}
