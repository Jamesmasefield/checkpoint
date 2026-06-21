import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useFlows } from '../hooks/useFlows'
import { INPUT_CLASS } from '../lib/formStyles'
import ProgressBar from '../components/ui/ProgressBar'

const ROLES = [
  { value: '', label: 'Unassigned' },
  { value: 'admin', label: 'Admin' },
  { value: 'lol', label: 'LoL' },
  { value: 'assistant_lol', label: 'Assistant LoL' },
  { value: 'course_delegate', label: 'Course Delegate' },
  { value: 'classroom_teacher', label: 'Classroom Teacher' },
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

function FacultiesSection({ faculties, onCreated }) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    const { error: insertError } = await supabase.from('faculties').insert({ name: name.trim() })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
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

function UserRow({ user, faculties, onRoleChange, onAddFaculty, onRemoveFaculty, onNameBlur }) {
  const [fullName, setFullName] = useState(user.full_name ?? '')

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
    </tr>
  )
}

function UsersSection({ users, faculties, onChanged }) {
  const handleRoleChange = async (userId, role) => {
    await supabase.from('profiles').update({ role: role || null }).eq('id', userId)
    onChanged()
  }

  const handleAddFaculty = async (userId, facultyId) => {
    await supabase.from('profile_faculties').insert({ profile_id: userId, faculty_id: facultyId })
    onChanged()
  }

  const handleRemoveFaculty = async (userId, facultyId) => {
    await supabase.from('profile_faculties').delete().eq('profile_id', userId).eq('faculty_id', facultyId)
    onChanged()
  }

  const handleNameBlur = async (userId, fullName, originalName) => {
    if (fullName === originalName) return
    await supabase.from('profiles').update({ full_name: fullName || null }).eq('id', userId)
    onChanged()
  }

  return (
    <section>
      <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Users</h2>
      <p className="mt-1 text-xs text-slate-400">
        Anyone who has signed in via magic link appears here automatically. Assign a role and one or more faculties to
        give them access.
      </p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Faculties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb] dark:divide-white/[0.08]">
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-2 text-slate-400">
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-medium text-slate-900 dark:text-slate-100">Admin</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Faculties, user roles, school-wide progress, and reminder history.</p>
      </div>
      <FacultiesSection faculties={faculties} onCreated={fetchData} />
      <UsersSection users={users} faculties={faculties} onChanged={fetchData} />
      <ProgressSection flows={flows} />
      <AuditLogSection />
    </div>
  )
}
