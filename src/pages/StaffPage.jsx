import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import RoleBadge from '../components/ui/RoleBadge'

const ROLES = [
  { value: 'admin',   label: 'Admin' },
  { value: 'lol',     label: 'LoL' },
  { value: 'teacher', label: 'Teacher' },
]

const TABLE_SELECT =
  'appearance-none rounded-md border border-[#e5e7eb] bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200'

function StaffPanel({ person, faculties, onClose, onChanged, isAdmin, actor, onActAs }) {
  const [fullName, setFullName] = useState(person.full_name ?? '')
  const [role, setRole]         = useState(person.role ?? 'teacher')
  const [memberIds, setMemberIds] = useState(
    (person.faculty_memberships ?? []).map((m) => m.faculty_id)
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError]     = useState('')
  const [facultyError, setFacultyError]   = useState('')

  // LoLs can add/remove *teachers* to/from faculties they themselves belong
  // to (enforced server-side by profile_faculties_lol_write); everything
  // else stays admin-only.
  const actorFacultyIds = (actor?.faculties ?? []).map((f) => f.id)
  function canManageFaculty(facultyId) {
    if (isAdmin) return true
    return actor?.role === 'lol' && person.role === 'teacher' && actorFacultyIds.includes(facultyId)
  }

  async function save() {
    await supabase.from('profiles').update({ full_name: fullName.trim() || null, role }).eq('id', person.id)
    onChanged()
    onClose()
  }

  async function deletePerson() {
    setDeleteError('')
    // Delete the profile row first (FK children set to null via migration_v9).
    const { error: profileErr } = await supabase.from('profiles').delete().eq('id', person.id)
    if (profileErr) { setDeleteError(profileErr.message); setConfirmDelete(false); return }

    // Also remove the auth user so they can't log back in and recreate their profile.
    if (supabaseAdmin) {
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(person.id)
      if (authErr) console.warn('Auth user delete failed (profile already removed):', authErr.message)
    }

    onChanged()
    onClose()
  }

  async function toggleFaculty(facultyId) {
    if (!canManageFaculty(facultyId)) return
    setFacultyError('')
    if (memberIds.includes(facultyId)) {
      const { error } = await supabase.from('profile_faculties').delete().eq('faculty_id', facultyId).eq('profile_id', person.id)
      if (error) { setFacultyError(error.message); return }
      setMemberIds(ids => ids.filter(id => id !== facultyId))
    } else {
      const { error } = await supabase.from('profile_faculties').upsert({ faculty_id: facultyId, profile_id: person.id })
      if (error) { setFacultyError(error.message); return }
      setMemberIds(ids => [...ids, facultyId])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col border-l border-[#e5e7eb] bg-white dark:border-white/[0.08] dark:bg-[#161b27]"
      >
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4 dark:border-white/[0.08]">
          <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Staff profile</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-xs text-slate-400">{person.email}</p>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#0f1117] dark:text-slate-200"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={`mt-1 block w-full ${TABLE_SELECT}`}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>

          <div>
            <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">Faculty memberships</p>
            <div className="space-y-1">
              {faculties.map((f) => {
                const isMember = memberIds.includes(f.id)
                const editable = canManageFaculty(f.id)
                return (
                  <label
                    key={f.id}
                    title={editable ? undefined : 'Only admins, or LoLs of this faculty adding a teacher, can change this'}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${editable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${
                      isMember ? 'border-[#4f6ef7] bg-[#4f6ef7]/5' : 'border-[#e5e7eb] dark:border-white/[0.08]'
                    }`}
                  >
                    <input type="checkbox" checked={isMember} disabled={!editable} onChange={() => toggleFaculty(f.id)} className="rounded" />
                    <span className="text-slate-700 dark:text-slate-200">{f.name}</span>
                  </label>
                )
              })}
            </div>
            {facultyError && <p className="mt-2 text-xs text-red-500">{facultyError}</p>}
          </div>
        </div>

        <div className="space-y-2 border-t border-[#e5e7eb] px-5 py-4 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={save}
            className="w-full rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white"
          >
            Save changes
          </button>
          {isAdmin && person.role !== 'admin' && onActAs && (
            <button
              type="button"
              onClick={() => onActAs(person)}
              className="w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
            >
              Act as this user
            </button>
          )}
          {isAdmin && (
            confirmDelete ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20">
                  <span className="text-xs text-red-600 dark:text-red-400">Remove {person.full_name ?? 'this person'}?</span>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setConfirmDelete(false); setDeleteError('') }} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                    <button type="button" onClick={deletePerson} className="text-xs font-medium text-red-500 hover:text-red-700">Delete</button>
                  </div>
                </div>
                {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-center text-xs text-slate-400 hover:text-red-500"
              >
                Remove staff member
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default function StaffPage() {
  const { profile, loading: profileLoading } = useProfile()
  const { viewAsProfile, setViewAsProfile } = useOutletContext()
  const navigate = useNavigate()
  const [staff, setStaff]       = useState([])
  const [faculties, setFaculties] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting]       = useState(false)
  const [inviteMsg, setInviteMsg]     = useState('')
  const [roleFilter, setRoleFilter]     = useState('all')
  const [facultyFilter, setFacultyFilter] = useState('all')
  const [search, setSearch]             = useState('')

  const fetchData = useCallback(async () => {
    const [{ data: profilesData }, { data: facultiesData }] = await Promise.all([
      supabase
        .from('profiles')
        .select(`id, full_name, email, role, faculty_memberships:profile_faculties ( faculty_id, faculties ( id, name ) )`)
        .order('full_name'),
      supabase
        .from('faculties')
        .select('id, name')
        .order('name'),
    ])
    setStaff(profilesData ?? [])
    setFaculties(facultiesData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleInvite(e) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg('')
    const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail.trim())
    setInviting(false)
    setInviteEmail('')
    setInviteMsg(error ? `Error: ${error.message}` : 'Invite sent — they will receive a magic link to sign in.')
  }

  function handleActAs(person) {
    setViewAsProfile({
      id: person.id,
      full_name: person.full_name,
      email: person.email,
      role: person.role,
      faculties: (person.faculty_memberships ?? []).map((m) => m.faculties).filter(Boolean),
    })
    setSelected(null)
    navigate('/')
  }

  if (profileLoading || loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
  if (!['admin', 'lol'].includes(profile?.role)) return <Navigate to="/" replace />

  const q = search.trim().toLowerCase()
  const visibleStaff = staff.filter((p) => {
    if (roleFilter !== 'all' && p.role !== roleFilter) return false
    if (facultyFilter !== 'all') {
      const ids = (p.faculty_memberships ?? []).map((m) => m.faculty_id)
      if (!ids.includes(facultyFilter)) return false
    }
    if (q && !(p.full_name ?? '').toLowerCase().includes(q) && !(p.email ?? '').toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Staff</h2>
      </div>

      {/* Invite */}
      <div className="rounded-lg border border-[#e5e7eb] p-4 dark:border-white/[0.08]">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Invite staff member</p>
        <form onSubmit={handleInvite} className="mt-2 flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="name@school.edu.au"
            className="flex-1 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
          />
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {inviteMsg && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{inviteMsg}</p>}
      </div>

      {/* Role filter buttons + search */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: 'all',     label: 'All' },
            { value: 'admin',   label: 'Admin' },
            { value: 'lol',     label: 'LoL' },
            { value: 'teacher', label: 'Teacher' },
          ].map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRoleFilter(value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                roleFilter === value
                  ? 'bg-[#4f6ef7] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
              }`}
            >
              {label}
              <span className="ml-1.5 opacity-70">
                {value === 'all' ? staff.length : staff.filter((p) => p.role === value).length}
              </span>
            </button>
          ))}
          <div className="relative ml-auto">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff…"
            className="rounded-md border border-[#e5e7eb] bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200 w-52"
          />
          {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Faculty filter buttons */}
        {faculties.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFacultyFilter('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                facultyFilter === 'all'
                  ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
              }`}
            >
              All faculties
            </button>
            {faculties.map((f) => {
              const count = staff.filter((p) =>
                (p.faculty_memberships ?? []).some((m) => m.faculty_id === f.id)
              ).length
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFacultyFilter(f.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    facultyFilter === f.id
                      ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
                  }`}
                >
                  {f.name}
                  <span className="ml-1.5 opacity-70">{count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Staff list */}
      <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Faculties</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb] dark:divide-white/[0.08]">
            {visibleStaff.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-3 text-slate-400">No staff found.</td></tr>
            )}
            {visibleStaff.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">
                  {p.full_name ?? <span className="italic text-slate-400">Not set</span>}
                </td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{p.email}</td>
                <td className="px-4 py-2">
                  {p.role ? <RoleBadge role={p.role} /> : <span className="text-slate-400 text-xs">—</span>}
                </td>
                <td className="px-4 py-2 text-xs text-slate-400">
                  {p.faculty_memberships?.length
                    ? p.faculty_memberships.map((m) => m.faculties?.name).filter(Boolean).join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setSelected(p)}
                    className="text-xs text-[#4f6ef7] hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <StaffPanel
          person={selected}
          faculties={faculties}
          onClose={() => { fetchData(); setSelected(null) }}
          onChanged={() => { fetchData(); setSelected(null) }}
          isAdmin={profile?.role === 'admin'}
          actor={profile}
          onActAs={profile?.role === 'admin' && !viewAsProfile ? handleActAs : undefined}
        />
      )}
    </div>
  )
}
