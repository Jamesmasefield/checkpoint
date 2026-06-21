import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useProfile } from '../../hooks/useProfile'
import { useFlows } from '../../hooks/useFlows'
import StatusDot from '../ui/StatusDot'
import ThemeToggle from './ThemeToggle'
import NewFlowForm from '../forms/NewFlowForm'
import ImportFlowForm from '../forms/ImportFlowForm'

// Flow.status (draft/active/complete) is a placeholder mapping until the
// real per-step deadline logic (Build Order step 12) can derive on
// track / attention / overdue from due dates.
const FLOW_STATUS_TO_DOT = {
  draft: 'not_started',
  active: 'in_progress',
  complete: 'on_track',
}

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// Sidebar groups flows by faculty, then by year level within each
// faculty — mainly visible to admin (school-wide view); a LoL/teacher
// scoped to one faculty just sees a single faculty group with their years.
function groupFlows(flows) {
  const byFaculty = new Map()
  for (const flow of flows) {
    const facultyName = flow.faculties?.name ?? 'Unknown faculty'
    if (!byFaculty.has(facultyName)) byFaculty.set(facultyName, new Map())
    const byYear = byFaculty.get(facultyName)
    const year = flow.year_level ?? 'Other'
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year).push(flow)
  }

  return Array.from(byFaculty.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([facultyName, byYear]) => ({
      facultyName,
      years: Array.from(byYear.entries())
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([year, yearFlows]) => ({ year, flows: yearFlows })),
    }))
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block rounded-md px-3 py-2 text-sm ${
          isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

// "My team" / "Notifications" / "Settings" have no destination page yet
// (not in the brief's file structure) — rendered as inert nav-styled
// buttons until those views are scoped.
function NavPlaceholder({ children }) {
  return (
    <button type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5">
      {children}
    </button>
  )
}

export default function Sidebar({ viewAsProfile }) {
  const navigate = useNavigate()
  const { profile: realProfile } = useProfile()
  const effectiveProfile = viewAsProfile ?? realProfile
  const { flows, loading, refetch } = useFlows(effectiveProfile)
  const [showNewFlowForm, setShowNewFlowForm] = useState(false)
  const [showImportFlowForm, setShowImportFlowForm] = useState(false)
  // "View as" is read-only — hide write affordances even if the
  // impersonated role would normally see them.
  const isLol = effectiveProfile?.role === 'lol' && !viewAsProfile
  // Admin sits above LoL in the hierarchy and already has full access
  // everywhere else, so it can also create flows (also the only way to
  // test this directly, since "view as" is read-only).
  const canCreateFlow = (effectiveProfile?.role === 'lol' || effectiveProfile?.role === 'admin') && !viewAsProfile

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-[#1a1f2e] text-white dark:bg-[#161b27]">
      <div className="px-4 py-5">
        <span className="text-base font-medium">Checkpoint</span>
      </div>

      <nav className="space-y-1 px-2">
        <NavItem to="/">Dashboard</NavItem>
        {isLol && <NavPlaceholder>My team</NavPlaceholder>}
        <NavPlaceholder>Notifications</NavPlaceholder>
        {/* Always reflects the real signed-in identity, not "view as" —
            admin tools shouldn't disappear just because you're impersonating. */}
        {realProfile?.role === 'admin' && <NavItem to="/admin">Admin</NavItem>}
      </nav>

      <div className="mt-6 flex-1 overflow-y-auto px-2">
        <p className="px-3 text-xs font-medium uppercase tracking-wide text-slate-400">Assessment flows</p>

        <div className="mt-2 space-y-3">
          {loading && <p className="px-3 py-2 text-sm text-slate-400">Loading…</p>}
          {!loading && flows.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">No flows yet</p>
          )}
          {groupFlows(flows).map(({ facultyName, years }) => (
            <div key={facultyName}>
              <p className="px-3 py-1 text-xs font-medium text-slate-300">{facultyName}</p>
              {years.map(({ year, flows: yearFlows }) => (
                <div key={year} className="pl-2">
                  <p className="px-3 py-1 text-xs text-slate-500">Year {year}</p>
                  <div className="space-y-1">
                    {yearFlows.map((flow) => (
                      <button
                        key={flow.id}
                        type="button"
                        onClick={() => navigate(`/flows/${flow.id}`)}
                        className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left hover:bg-white/5"
                      >
                        <span className="mt-1.5">
                          <StatusDot status={FLOW_STATUS_TO_DOT[flow.status] ?? 'not_started'} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <p className="truncate text-sm">{flow.title}</p>
                          <p className="truncate text-xs text-slate-400">
                            {flow.template_type === 'rubric' ? 'Rubric-based' : 'Comment-based'} · {formatDate(flow.anchor_date)}
                          </p>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {canCreateFlow && (
          <div className="mt-3 space-y-1">
            <button
              type="button"
              onClick={() => setShowNewFlowForm(true)}
              className="w-full rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              + Create new flow
            </button>
            <button
              type="button"
              onClick={() => setShowImportFlowForm(true)}
              className="w-full rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              Import previous flow
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-2 py-3">
        <NavPlaceholder>Settings</NavPlaceholder>
        <ThemeToggle />
      </div>

      {showNewFlowForm && (
        <NewFlowForm
          onClose={() => setShowNewFlowForm(false)}
          onCreated={(flowId) => {
            setShowNewFlowForm(false)
            refetch()
            navigate(`/flows/${flowId}`)
          }}
        />
      )}

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
