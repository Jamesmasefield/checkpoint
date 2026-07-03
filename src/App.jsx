import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { FlowsProvider } from './hooks/FlowsContext'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FlowPage from './pages/FlowPage'
import NewFlowPage from './pages/NewFlowPage'
import AdminPage from './pages/AdminPage'
import SubjectsPage from './pages/SubjectsPage'
import TemplatesPage from './pages/TemplatesPage'
import StaffPage from './pages/StaffPage'
import SettingsPage from './pages/SettingsPage'

function AppShell() {
  const [viewAsProfile, setViewAsProfile] = useState(null)
  const { profile: realProfile } = useProfile()
  const effectiveProfile = viewAsProfile ?? realProfile

  return (
    <FlowsProvider profile={effectiveProfile}>
      <div className="flex h-screen overflow-hidden bg-bg">
        <Sidebar viewAsProfile={viewAsProfile} onSetViewAs={setViewAsProfile} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar viewAsProfile={viewAsProfile} onSetViewAs={setViewAsProfile} />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet context={{ viewAsProfile, setViewAsProfile }} />
          </main>
        </div>
      </div>
    </FlowsProvider>
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
          <Route path="flows/new"  element={<NewFlowPage />} />
          <Route path="flows/:id"  element={<FlowPage />} />
          <Route path="admin"      element={<AdminPage />} />
          <Route path="subjects"   element={<SubjectsPage />} />
          <Route path="templates"  element={<TemplatesPage />} />
          <Route path="staff"      element={<StaffPage />} />
          <Route path="settings"   element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
