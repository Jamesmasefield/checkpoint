import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import CoursePanel from '../components/subjects/CoursePanel'

function useFacultySubjects(profile) {
  const [faculties, setFaculties] = useState([])
  const [loading, setLoading]     = useState(true)

  const fetch = useCallback(() => {
    setLoading(true)
    const isAdmin      = profile?.role === 'admin'
    const myFacultyIds = (profile?.faculties ?? []).map((f) => f.id)

    let query = supabase
      .from('faculties')
      .select(`
        id, name,
        subjects (
          id, name, created_at,
          subject_staff ( user_id, profiles ( id, full_name, email ) ),
          courses (
            id, name, year_level,
            classes (
              id, code, name,
              class_teachers ( user_id, profiles ( id, full_name, email ) )
            )
          )
        )
      `)
      .order('name')

    if (!isAdmin && myFacultyIds.length > 0) {
      query = query.in('id', myFacultyIds)
    }

    query.then(({ data, error }) => {
      if (!error && data) setFaculties(data)
      setLoading(false)
    })
  }, [profile])

  useEffect(() => { fetch() }, [fetch])

  return { faculties, loading, refetch: fetch }
}

function SubjectRow({ subject, canEdit, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const courseCount = (subject.courses ?? []).length

  return (
    <div className="rounded-md border border-[#e5e7eb] dark:border-white/[0.08]">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="flex items-center gap-2 text-left text-sm font-medium text-slate-700 hover:text-[#4f6ef7] dark:text-slate-200 dark:hover:text-[#4f6ef7]"
        >
          <span className="w-3 text-xs text-slate-400">{expanded ? '▾' : '▸'}</span>
          {subject.name}
          <span className="text-xs font-normal text-slate-400">
            {courseCount} {courseCount === 1 ? 'course' : 'courses'}
          </span>
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => onDelete(subject.id)}
            className="text-xs text-slate-400 hover:text-red-500"
          >
            Remove
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-[#e5e7eb] px-4 pb-4 dark:border-white/[0.08]">
          <CoursePanel subject={subject} onRefresh={onRefresh} canEdit={canEdit} />
        </div>
      )}
    </div>
  )
}

function AddSubjectInline({ facultyId, onCreated }) {
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const { error: insertErr } = await supabase
      .from('subjects')
      .insert({ name: name.trim(), faculty_id: facultyId })
    setSaving(false)
    if (insertErr) { setError(insertErr.message); return }
    setName('')
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Subject name (e.g. Modern History)"
        className="flex-1 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
        autoFocus
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? 'Adding…' : 'Add'}
      </button>
      {error && <p className="text-xs text-red-500 self-center">{error}</p>}
    </form>
  )
}

export default function SubjectsPage() {
  const { viewAsProfile }        = useOutletContext()
  const { profile: realProfile } = useProfile()
  const canEdit = (realProfile?.role === 'admin' || realProfile?.role === 'lol') && !viewAsProfile

  const { faculties, loading, refetch } = useFacultySubjects(realProfile)

  const [activeId, setActiveId] = useState(null)
  const [adding, setAdding]     = useState(false)

  const activeFacultyId = activeId ?? faculties[0]?.id
  const activeFaculty   = faculties.find((f) => f.id === activeFacultyId)

  async function handleDelete(subjectId) {
    await supabase.from('subjects').delete().eq('id', subjectId)
    refetch()
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>

  if (faculties.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Subjects</h2>
        <p className="text-sm text-slate-400">No faculties found. Add a faculty in the Admin page first.</p>
      </div>
    )
  }

  const sortedSubjects = (activeFaculty?.subjects ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-0">
      <h2 className="mb-3 text-base font-medium text-slate-900 dark:text-slate-100">Subjects</h2>

      {/* Faculty tabs */}
      <div className="flex items-end gap-1 overflow-x-auto border-b border-[#e5e7eb] dark:border-white/[0.08]">
        {faculties.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => { setActiveId(f.id); setAdding(false) }}
            className={`whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
              f.id === activeFacultyId
                ? 'border border-b-white bg-white text-[#4f6ef7] dark:border-white/[0.08] dark:border-b-[#0f1117] dark:bg-[#0f1117] dark:text-[#4f6ef7]'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Active faculty panel */}
      {activeFaculty && (
        <div className="rounded-b-lg border border-t-0 border-[#e5e7eb] p-5 dark:border-white/[0.08]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Subjects in {activeFaculty.name}
            </p>
            {canEdit && !adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="text-sm text-[#4f6ef7] hover:underline"
              >
                + Add subject
              </button>
            )}
          </div>

          <div className="space-y-2">
            {sortedSubjects.length === 0 && !adding && (
              <p className="text-sm text-slate-400">No subjects yet.</p>
            )}
            {sortedSubjects.map((s) => (
              <SubjectRow
                key={s.id}
                subject={s}
                canEdit={canEdit}
                onDelete={handleDelete}
                onRefresh={refetch}
              />
            ))}
          </div>

          {adding && (
            <div className="mt-3">
              <AddSubjectInline
                facultyId={activeFaculty.id}
                onCreated={() => { setAdding(false); refetch() }}
              />
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="mt-2 text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
