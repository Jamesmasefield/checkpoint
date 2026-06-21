import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FlowPage from './pages/FlowPage'
import AdminPage from './pages/AdminPage'

function AppShell() {
  // Admin "view as" mode — null when not impersonating. Lives here so it
  // survives navigation between Dashboard/FlowPage but resets on reload.
  const [viewAsProfile, setViewAsProfile] = useState(null)

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6fa] dark:bg-[#0f1117]">
      <Sidebar viewAsProfile={viewAsProfile} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title="Checkpoint" viewAsProfile={viewAsProfile} onSetViewAs={setViewAsProfile} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ viewAsProfile }} />
        </main>
      </div>
    </div>
  )
}

function App() {
  const { session, loading } = useAuth()

  if (loading) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={session ? <AppShell /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="flows/:id" element={<FlowPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
