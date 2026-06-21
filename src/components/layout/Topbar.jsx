import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../hooks/useProfile'
import RoleBadge from '../ui/RoleBadge'

function ViewAsPicker({ onSelect }) {
  const [profiles, setProfiles] = useState([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, email, role, profile_faculties ( faculties ( id, name ) )')
      .neq('role', 'admin')
      .order('full_name')
      .then(({ data, error }) => {
        if (!error) {
          // Match useProfile's shape: profile.faculties = [{id, name}],
          // since the selected profile gets used everywhere a real
          // profile would be (useFlows, Sidebar grouping, etc).
          setProfiles(
            data.map(({ profile_faculties, ...rest }) => ({
              ...rest,
              faculties: profile_faculties.map((pf) => pf.faculties),
            })),
          )
        }
      })
  }, [])

  return (
    <select
      defaultValue=""
      onChange={(e) => {
        const selected = profiles.find((p) => p.id === e.target.value)
        if (selected) onSelect(selected)
        e.target.value = ''
      }}
      className="appearance-none rounded-md border border-[#e5e7eb] bg-white px-2 py-1.5 text-sm text-slate-600 dark:border-white/[0.08] dark:bg-[#0f1117] dark:text-slate-300"
    >
      <option value="" disabled>
        View as…
      </option>
      {profiles.map((p) => (
        <option key={p.id} value={p.id}>
          {p.full_name ?? p.email} ({p.role})
        </option>
      ))}
    </select>
  )
}

export default function Topbar({ title, viewAsProfile, onSetViewAs }) {
  const { profile: realProfile } = useProfile()

  if (viewAsProfile) {
    return (
      <header className="flex h-14 items-center justify-between border-b border-amber-200 bg-amber-50 px-6 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <span>
            Viewing as <strong>{viewAsProfile.full_name ?? viewAsProfile.email}</strong>
          </span>
          <RoleBadge role={viewAsProfile.role} />
          <span className="text-amber-600 dark:text-amber-300">· read-only</span>
        </div>
        <button
          type="button"
          onClick={() => onSetViewAs(null)}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          Return to admin view
        </button>
      </header>
    )
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#e5e7eb] bg-white px-6 dark:border-white/[0.08] dark:bg-transparent">
      <h1 className="text-base font-medium text-slate-900 dark:text-slate-100">{title}</h1>

      <div className="flex items-center gap-3">
        {realProfile?.role === 'admin' && <ViewAsPicker onSelect={onSetViewAs} />}
        {realProfile && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">{realProfile.full_name ?? realProfile.email}</span>
            <RoleBadge role={realProfile.role} />
          </div>
        )}
      </div>
    </header>
  )
}
