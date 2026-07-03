import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useFlows } from '../hooks/useFlows'
import { INPUT_CLASS } from '../lib/formStyles'
import ProgressBar from '../components/ui/ProgressBar'
import { logAction } from '../lib/actionLog'

const DEFAULT_PASSWORD = 'Checkpoint1'

const ROLES = [
  { value: '', label: 'Unassigned' },
  { value: 'admin',   label: 'Admin' },
  { value: 'lol',     label: 'LoL' },
  { value: 'teacher', label: 'Teacher' },
]

// Same native-<select> contrast fix as formStyles.SELECT_CLASS, sized for
// a table cell instead of a full-width form field.
const TABLE_SELECT_CLASS =
  'w-full appearance-none rounded-md border border-[#e5e7eb] bg-white p-1.5 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200'

function formatDateTime(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const ACTION_LABELS = {
  'faculty.created':        'Faculty created',
  'user.role_changed':      'User role changed',
  'user.name_updated':      'User name updated',
  'user.password_reset':    'Password reset',
  'user.faculty_added':     'Faculty added to user',
  'user.faculty_removed':   'Faculty removed from user',
  'flow.created':           'Flow created',
  'flow.deleted':           'Flow deleted',
  'flow.teachers_updated':  'Class teachers updated',
  'milestone.completed':    'Milestone completed',
  'milestone.uncompleted':  'Milestone uncompleted',
  'milestone.signed_off':   'Milestone signed off',
  'milestone.sign_off_removed': 'Sign-off removed',
}

function describeDetails(log) {
  const d = log.details
  if (!d) return '—'
  const via = d.impersonated_by ? ` · via ${d.impersonated_by}` : ''
  switch (log.action) {
    case 'faculty.created':       return d.name ?? '—'
    case 'user.role_changed':     return `${d.target_email}: ${d.from || 'unassigned'} → ${d.to || 'unassigned'}`
    case 'user.name_updated':     return `${d.target_email}: "${d.from}" → "${d.to}"`
    case 'user.password_reset':   return d.target_email ?? '—'
    case 'user.faculty_added':    return `${d.target_email} + ${d.faculty_name}`
    case 'user.faculty_removed':  return `${d.target_email} − ${d.faculty_name}`
    case 'flow.created':          return d.title ?? '—'
    case 'flow.deleted':          return `${d.title ?? '—'}${via}`
    case 'flow.teachers_updated': return `${d.flow_title ?? '—'}${via}`
    case 'milestone.completed':
    case 'milestone.uncompleted':
    case 'milestone.signed_off':
    case 'milestone.sign_off_removed':
      return d.milestone_title ? `${d.milestone_title}${d.flow_title ? ` (${d.flow_title})` : ''}${via}` : '—'
    default:                      return JSON.stringify(d)
  }
}

function FacultiesSection({ faculties, onCreated, actor }) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    const trimmed = name.trim()
    const { error: insertError } = await supabase.from('faculties').insert({ name: trimmed })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    logAction({ actorId: actor?.id, actorName: actor?.name, actorEmail: actor?.email, action: 'faculty.created', entityType: 'faculty', details: { name: trimmed } })
    setName('')
    onCreated()
  }

  return (
    <section>
      <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Faculties</h2>
      <ul className="mt-2 divide-y divide-[#e5e7eb] rounded-lg border border-[#e5e7eb] dark:divide-white/[0.08] dark:border-white/[0.08]">
        {faculties.length === 0 && <li className="px-4 py-2 text-sm text-slate-400">No faculties yet.</li>}
        {faculties.map((f) => (
          <li key={f.id} className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200">
            {f.name}
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreate} className="mt-3 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New faculty name"
          className={`${INPUT_CLASS} mt-0 flex-1`}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </section>
  )
}

function FacultyTags({ user, faculties, onAdd, onRemove }) {
  const userFacultyIds = user.faculties.map((f) => f.id)
  const available = faculties.filter((f) => !userFacultyIds.includes(f.id))

  return (
    <div className="flex flex-wrap items-center gap-1">
      {user.faculties.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center gap-1 rounded-full bg-[#4f6ef7]/10 px-2 py-0.5 text-xs text-[#4f6ef7]"
        >
          {f.name}
          <button type="button" onClick={() => onRemove(user.id, f.id)} className="text-[#4f6ef7] hover:text-red-500">
            ✕
          </button>
        </span>
      ))}
      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onAdd(user.id, e.target.value)
          }}
          className="appearance-none rounded-md border border-[#e5e7eb] bg-white p-1 text-xs text-slate-900 outline-none dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
        >
          <option value="">+ Add faculty</option>
          {available.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

function UserRow({ user, faculties, onRoleChange, onAddFaculty, onRemoveFaculty, onNameBlur, actor }) {
  const [fullName, setFullName] = useState(user.full_name ?? '')
  const [resetState, setResetState] = useState('idle') // idle | loading | done | error

  const handleResetPassword = async () => {
    if (!supabaseAdmin) return
    setResetState('loading')
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password: DEFAULT_PASSWORD })
    setResetState(error ? 'error' : 'done')
    if (!error) {
      logAction({ actorId: actor?.id, actorName: actor?.name, actorEmail: actor?.email, action: 'user.password_reset', entityType: 'user', entityId: user.id, details: { target_email: user.email, target_name: user.full_name } })
      setTimeout(() => setResetState('idle'), 3000)
    }
  }

  return (
    <tr>
      <td className="px-4 py-2">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onBlur={() => onNameBlur(user.id, fullName, user.full_name ?? '')}
          placeholder="Name not set"
          className="w-full rounded-md border border-transparent bg-transparent p-1 text-sm text-slate-700 outline-none focus:border-[#4f6ef7] dark:text-slate-200"
        />
      </td>
      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{user.email}</td>
      <td className="px-4 py-2">
        <select value={user.role ?? ''} onChange={(e) => onRoleChange(user.id, e.target.value)} className={TABLE_SELECT_CLASS}>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <FacultyTags user={user} faculties={faculties} onAdd={onAddFaculty} onRemove={onRemoveFaculty} />
      </td>
      <td className="px-4 py-2">
        {resetState === 'done' ? (
          <span className="text-xs text-green-600 dark:text-green-400">Reset to <strong>{DEFAULT_PASSWORD}</strong></span>
        ) : resetState === 'error' ? (
          <span className="text-xs text-red-500">Failed</span>
        ) : (
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetState === 'loading' || !supabaseAdmin}
            className="text-xs text-slate-400 hover:text-red-500 disabled:opacity-40"
          >
            {resetState === 'loading' ? 'Resetting…' : 'Reset password'}
          </button>
        )}
      </td>
    </tr>
  )
}

function UsersSection({ users, faculties, onChanged, actor }) {
  const handleRoleChange = async (userId, role) => {
    const targetUser = users.find((u) => u.id === userId)
    await supabase.from('profiles').update({ role: role || null }).eq('id', userId)
    logAction({ actorId: actor?.id, actorName: actor?.name, actorEmail: actor?.email, action: 'user.role_changed', entityType: 'user', entityId: userId, details: { target_email: targetUser?.email, target_name: targetUser?.full_name, from: targetUser?.role || null, to: role || null } })
    onChanged()
  }

  const handleAddFaculty = async (userId, facultyId) => {
    const targetUser = users.find((u) => u.id === userId)
    const faculty = faculties.find((f) => f.id === facultyId)
    await supabase.from('profile_faculties').insert({ profile_id: userId, faculty_id: facultyId })
    logAction({ actorId: actor?.id, actorName: actor?.name, actorEmail: actor?.email, action: 'user.faculty_added', entityType: 'user', entityId: userId, details: { target_email: targetUser?.email, target_name: targetUser?.full_name, faculty_name: faculty?.name } })
    onChanged()
  }

  const handleRemoveFaculty = async (userId, facultyId) => {
    const targetUser = users.find((u) => u.id === userId)
    const faculty = faculties.find((f) => f.id === facultyId) ?? targetUser?.faculties?.find((f) => f.id === facultyId)
    await supabase.from('profile_faculties').delete().eq('profile_id', userId).eq('faculty_id', facultyId)
    logAction({ actorId: actor?.id, actorName: actor?.name, actorEmail: actor?.email, action: 'user.faculty_removed', entityType: 'user', entityId: userId, details: { target_email: targetUser?.email, target_name: targetUser?.full_name, faculty_name: faculty?.name } })
    onChanged()
  }

  const handleNameBlur = async (userId, fullName, originalName) => {
    if (fullName === originalName) return
    const targetUser = users.find((u) => u.id === userId)
    await supabase.from('profiles').update({ full_name: fullName || null }).eq('id', userId)
    logAction({ actorId: actor?.id, actorName: actor?.name, actorEmail: actor?.email, action: 'user.name_updated', entityType: 'user', entityId: userId, details: { target_email: targetUser?.email, from: originalName || null, to: fullName || null } })
    onChanged()
  }

  return (
    <section>
      <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Users</h2>
      <p className="mt-1 text-xs text-slate-400">
        All registered users appear here. Assign a role and one or more faculties to give them access. Use "Reset password" to set a user's password back to <strong>{DEFAULT_PASSWORD}</strong>.
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Faculties</th>
              <th className="px-4 py-2">Password</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb] dark:divide-white/[0.08]">
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-2 text-slate-400">
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                faculties={faculties}
                onRoleChange={handleRoleChange}
                onAddFaculty={handleAddFaculty}
                onRemoveFaculty={handleRemoveFaculty}
                onNameBlur={handleNameBlur}
                actor={actor}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ProgressSection({ flows }) {
  const byFaculty = new Map()
  for (const flow of flows) {
    const name = flow.faculties?.name ?? 'Unknown faculty'
    if (!byFaculty.has(name)) byFaculty.set(name, [])
    byFaculty.get(name).push(flow)
  }

  const rows = Array.from(byFaculty.entries()).map(([name, facultyFlows]) => {
    const steps = facultyFlows.flatMap((f) => f.flow_steps ?? [])
    const total = steps.length
    const completed = steps.filter((s) => (s.step_completions?.length ?? 0) > 0).length
    const progress = total ? Math.round((completed / total) * 100) : 0
    return { name, flowCount: facultyFlows.length, total, completed, progress }
  })

  return (
    <section>
      <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">School-wide progress</h2>
      <div className="mt-2 overflow-x-auto rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Faculty</th>
              <th className="px-4 py-2">Flows</th>
              <th className="px-4 py-2">Steps completed</th>
              <th className="px-4 py-2">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb] dark:divide-white/[0.08]">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-2 text-slate-400">
                  No flows yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{r.name}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.flowCount}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                  {r.completed}/{r.total}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <ProgressBar percent={r.progress} />
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{r.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AuditLogSection() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('reminder_log')
      .select(
        `id, sent_at, trigger_type, days_before,
        recipient:profiles!reminder_log_recipient_id_fkey ( full_name, email ),
        step:flow_steps ( step_number, flows ( title ) )`,
      )
      .order('sent_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error) setLogs(data)
        setLoading(false)
      })
  }, [])

  return (
    <section>
      <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Audit log</h2>
      <p className="mt-1 text-xs text-slate-400">
        Reminder emails sent (most recent 50) — the closest thing to an audit trail in the current schema.
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Sent</th>
              <th className="px-4 py-2">Recipient</th>
              <th className="px-4 py-2">Flow / step</th>
              <th className="px-4 py-2">Trigger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb] dark:divide-white/[0.08]">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-2 text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-2 text-slate-400">
                  No reminders sent yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{formatDateTime(log.sent_at)}</td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                  {log.recipient?.full_name ?? log.recipient?.email ?? 'Unknown'}
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                  {log.step?.flows?.title ?? 'Deleted step'}
                  {log.step ? ` — Step ${log.step.step_number}` : ''}
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{log.trigger_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ActionLogSection() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    supabase
      .from('action_log')
      .select('id, created_at, actor_name, actor_email, action, entity_type, entity_id, details')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (error) { setErrorMsg(error.message) }
        else { setLogs(data ?? []) }
        setLoading(false)
      })
  }, [])

  return (
    <section>
      <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Action log</h2>
      <p className="mt-1 text-xs text-slate-400">
        Recent admin and user actions across the platform (most recent 100). Run migration_v11 to enable.
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 whitespace-nowrap">When</th>
              <th className="px-4 py-2">Who</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb] dark:divide-white/[0.08]">
            {loading && (
              <tr><td colSpan={4} className="px-4 py-2 text-slate-400">Loading…</td></tr>
            )}
            {!loading && errorMsg && (
              <tr><td colSpan={4} className="px-4 py-2 text-red-400 font-mono text-xs">{errorMsg}</td></tr>
            )}
            {!loading && !errorMsg && logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-2 text-slate-400">No actions logged yet.</td></tr>
            )}
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {formatDateTime(log.created_at)}
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200">
                  {log.actor_name ?? log.actor_email ?? 'System'}
                </td>
                <td className="px-4 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {ACTION_LABELS[log.action] ?? log.action}
                </td>
                <td className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                  {describeDetails(log)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function AdminPage() {
  const { profile, loading: profileLoading } = useProfile()
  const { flows } = useFlows(profile)
  const [faculties, setFaculties] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: facultiesData }, { data: usersData }] = await Promise.all([
      supabase.from('faculties').select('id, name').order('name'),
      supabase
        .from('profiles')
        .select('id, full_name, email, role, profile_faculties ( faculties ( id, name ) )')
        .order('email'),
    ])
    setFaculties(facultiesData ?? [])
    setUsers((usersData ?? []).map(({ profile_faculties, ...rest }) => ({ ...rest, faculties: profile_faculties.map((pf) => pf.faculties) })))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (profileLoading || loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
  if (profile?.role !== 'admin') return <Navigate to="/" replace />

  const actor = profile ? { id: profile.id, name: profile.full_name, email: profile.email } : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-medium text-slate-900 dark:text-slate-100">Admin</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Faculties, user roles, school-wide progress, and reminder history.</p>
      </div>
      <FacultiesSection faculties={faculties} onCreated={fetchData} actor={actor} />
      <UsersSection users={users} faculties={faculties} onChanged={fetchData} actor={actor} />
      <ProgressSection flows={flows} />
      <ActionLogSection />
      <AuditLogSection />
    </div>
  )
}
