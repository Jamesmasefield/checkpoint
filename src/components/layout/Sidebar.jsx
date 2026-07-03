import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../hooks/useProfile'
import { useFlowsContext } from '../../hooks/FlowsContext'
import { getFlowUrgency } from '../../lib/milestoneStatus'
import ThemeToggle from './ThemeToggle'
import ImportFlowForm from '../forms/ImportFlowForm'

const ROLE_LABELS = { admin: 'Admin', lol: 'LoL', teacher: 'Teacher' }

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

function tabFromPath(pathname) {
  if (pathname.startsWith('/flows/') || pathname === '/') return 'assessments'
  if (pathname === '/subjects')  return 'subjects'
  if (pathname === '/templates') return 'templates'
  if (pathname === '/staff')     return 'staff'
  if (pathname === '/admin')     return 'admin'
  if (pathname === '/settings')  return 'settings'
  return 'assessments'
}

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 opacity-85">
    <rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/>
    <rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>
  </svg>
)
const IconSubjects = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 opacity-85">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
)
const IconTemplates = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 opacity-85">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
)
const IconStaff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 opacity-85">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconAdmin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 opacity-85">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 opacity-85">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

function TabItem({ label, icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] font-medium transition-all duration-150',
        active
          ? 'bg-sidebar-panel text-sidebar-ink shadow-[inset_3px_0_0_var(--primary)]'
          : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-ink',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

export default function Sidebar({ viewAsProfile, onSetViewAs }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile: realProfile } = useProfile()

  const [activeTab, setActiveTab] = useState(() => tabFromPath(location.pathname))
  const { flows, loading, refetch } = useFlowsContext()
  const [showImportFlowForm, setShowImportFlowForm] = useState(false)
  const [viewAsOptions, setViewAsOptions] = useState([])

  const effectiveProfile = viewAsProfile ?? realProfile
  const isAdmin    = realProfile?.role === 'admin'
  const isLol      = realProfile?.role === 'lol'
  const navIsAdmin = effectiveProfile?.role === 'admin'
  const navIsLol   = effectiveProfile?.role === 'lol'
  const canViewAs  = isAdmin && !viewAsProfile
  const canCreate  = navIsAdmin || navIsLol

  useEffect(() => {
    setActiveTab(tabFromPath(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    if (!canViewAs) return
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, role, profile_faculties ( faculties ( id, name ) )')
      .order('full_name')

    if (isAdmin) {
      query = query.neq('role', 'admin')
    } else {
      query = query.eq('role', 'teacher')
    }

    query.then(({ data, error }) => {
      if (!error && data) {
        setViewAsOptions(
          data.map(({ profile_faculties, ...rest }) => ({
            ...rest,
            faculties: profile_faculties.map((pf) => pf.faculties),
          }))
        )
      }
    })
  }, [canViewAs, isAdmin])

  function navigate_tab(tab, path) {
    setActiveTab(tab)
    navigate(path)
  }

  return (
    <aside
      className="flex h-screen w-[248px] shrink-0 flex-col overflow-hidden border-r text-sidebar-ink"
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--sidebar-border)', color: 'var(--sidebar-ink)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-[18px] pb-4 pt-5">
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] font-display text-base font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, #4f5fee, #7c3aed)',
            boxShadow: '0 4px 12px rgba(79,95,238,0.4)',
          }}
        >
          C
        </div>
        <span className="font-display text-base font-semibold tracking-[0.2px]">Checkpoint</span>
      </div>

      {/* Navigation */}
      <nav className="shrink-0 space-y-0.5 px-3">
        <TabItem
          label="Dashboard"
          icon={<IconDashboard />}
          active={activeTab === 'assessments'}
          onClick={() => navigate_tab('assessments', '/')}
        />
        {(navIsAdmin || navIsLol) && (
          <TabItem
            label="Subjects"
            icon={<IconSubjects />}
            active={activeTab === 'subjects'}
            onClick={() => navigate_tab('subjects', '/subjects')}
          />
        )}
        {(navIsAdmin || navIsLol) && (
          <TabItem
            label="Templates"
            icon={<IconTemplates />}
            active={activeTab === 'templates'}
            onClick={() => navigate_tab('templates', '/templates')}
          />
        )}
        {(navIsAdmin || navIsLol) && (
          <TabItem
            label="Staff"
            icon={<IconStaff />}
            active={activeTab === 'staff'}
            onClick={() => navigate_tab('staff', '/staff')}
          />
        )}
        {navIsAdmin && (
          <TabItem
            label="Admin"
            icon={<IconAdmin />}
            active={activeTab === 'admin'}
            onClick={() => navigate_tab('admin', '/admin')}
          />
        )}
        <TabItem
          label="Settings"
          icon={<IconSettings />}
          active={activeTab === 'settings'}
          onClick={() => navigate_tab('settings', '/settings')}
        />

        {activeTab === 'assessments' && (
          <p className="px-2 pb-1.5 pt-3.5 text-[10px] font-semibold uppercase tracking-[1.2px] text-sidebar-muted">
            Assessment Flows
          </p>
        )}
      </nav>

      {/* Flow cards */}
      {activeTab === 'assessments' && (
        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-2">
          {loading && (
            <p className="px-2 py-2 text-xs text-sidebar-muted">Loading…</p>
          )}
          {!loading && flows.length === 0 && (
            <p className="px-2 py-2 text-xs text-sidebar-muted">No flows yet</p>
          )}
          {flows.map((flow) => {
            const urgency  = getFlowUrgency(flow.flow_milestones ?? [])
            const isActive = location.pathname === `/flows/${flow.id}`
            const subjectName = flow.subjects?.name ?? flow.faculties?.name ?? ''
            const yearLevel   = flow.courses?.year_level ?? null
            const meta        = [subjectName, yearLevel ? `Year ${yearLevel}` : ''].filter(Boolean).join(' · ')
            const milestones  = flow.flow_milestones ?? []
            const donePct     = milestones.length > 0
              ? Math.round(milestones.filter((m) => m.completed_at).length / milestones.length * 100)
              : 0
            const isUrgent = urgency.color === 'amber' || urgency.color === 'red'

            return (
              <NavLink
                key={flow.id}
                to={`/flows/${flow.id}`}
                className={[
                  'relative mb-2 block overflow-hidden rounded-xl border px-3 pb-2.5 pt-3 transition-all duration-150',
                  isActive
                    ? 'border-primary shadow-[0_0_0_1px_var(--primary),0_8px_20px_rgba(79,95,238,0.25)]'
                    : 'border-sidebar-border hover:border-white/[0.18] hover:-translate-y-px',
                ].join(' ')}
                style={{ background: 'var(--sidebar-panel)' }}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-sidebar-ink">
                    {flow.title}
                  </span>
                  <span
                    className="shrink-0 rounded-full font-display text-[11px] font-semibold px-2 py-0.5"
                    style={isUrgent
                      ? { background: 'rgba(248,113,113,0.16)', color: '#fca5a5' }
                      : { background: 'rgba(100,116,255,0.18)', color: '#9aa7ff' }
                    }
                  >
                    {urgency.label}
                  </span>
                </div>
                <div className="mb-2 text-[11.5px] text-sidebar-muted">{meta}</div>
                <div
                  className="h-1 overflow-hidden rounded-full"
                  style={{ background: 'rgba(255,255,255,0.09)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${donePct}%`,
                      background: 'linear-gradient(90deg, #4f5fee, #7c3aed)',
                    }}
                  />
                </div>
              </NavLink>
            )
          })}
        </div>
      )}

      {/* Spacer when not in assessments tab */}
      {activeTab !== 'assessments' && <div className="flex-1" />}

      {/* Footer */}
      <div
        className="shrink-0 space-y-2 border-t px-3 pb-3 pt-3"
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        {/* View As picker */}
        {canViewAs && (
          <div>
            {viewAsProfile ? (
              <button
                type="button"
                onClick={() => onSetViewAs(null)}
                className="w-full rounded-[10px] bg-amber-600/80 px-3 py-1.5 text-left text-xs font-medium text-white hover:bg-amber-600"
              >
                Acting as {viewAsProfile.full_name ?? viewAsProfile.email} · Exit
              </button>
            ) : (
              <select
                defaultValue=""
                onChange={(e) => {
                  const p = viewAsOptions.find((x) => x.id === e.target.value)
                  if (p) onSetViewAs(p)
                  e.target.value = ''
                }}
                className="w-full appearance-none rounded-[10px] border px-2 py-1.5 text-xs text-sidebar-ink outline-none"
                style={{ background: 'var(--sidebar-panel)', borderColor: 'var(--sidebar-border)', color: 'var(--sidebar-ink)' }}
              >
                <option value="" disabled>View as…</option>
                {viewAsOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email} ({p.role})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Create buttons */}
        {canCreate && (
          <>
            <button
              type="button"
              onClick={() => navigate('/flows/new')}
              className="flex w-full items-center justify-center gap-1.5 rounded-[10px] py-2.5 text-[13px] font-semibold text-white transition-all duration-150 hover:-translate-y-px"
              style={{
                background: 'var(--primary)',
                boxShadow: '0 4px 14px rgba(79,95,238,0.35)',
              }}
            >
              ＋ New assessment
            </button>
            <button
              type="button"
              onClick={() => setShowImportFlowForm(true)}
              className="w-full rounded-[10px] border py-2 text-[12.5px] font-medium text-sidebar-muted transition-all duration-150 hover:border-white/20 hover:text-sidebar-ink"
              style={{ borderColor: 'var(--sidebar-border)' }}
            >
              Import previous
            </button>
          </>
        )}

        {/* User row */}
        {realProfile && (
          <div className="flex items-center gap-2.5 px-1.5 pt-1">
            <div
              className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f5fee)' }}
            >
              {initials(realProfile.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold text-sidebar-ink">
                {realProfile.full_name ?? realProfile.email}
              </div>
              <div className="text-[10.5px] text-sidebar-muted">
                {ROLE_LABELS[realProfile.role] ?? realProfile.role}
              </div>
            </div>
            <ThemeToggle />
          </div>
        )}
      </div>

      {showImportFlowForm && (
        <ImportFlowForm
          onClose={() => setShowImportFlowForm(false)}
          onCreated={(flowId) => {
            setShowImportFlowForm(false)
            refetch()
            navigate(`/flows/${flowId}`)
          }}
        />
      )}
    </aside>
  )
}
