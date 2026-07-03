import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useTemplates } from '../../hooks/useTemplates'
import { useBlackouts } from '../../hooks/useBlackouts'
import { buildMilestoneDates } from '../../lib/deadlines'
import { ASSIGNEE_LABEL } from '../../lib/milestoneStatus'
import TeacherPicker from '../ui/TeacherPicker'

const SELECT =
  'block w-full appearance-none rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] disabled:opacity-50 dark:border-white/[0.08] dark:bg-[#0f1117] dark:text-slate-200'

const INPUT =
  'mt-1 block w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#0f1117] dark:text-slate-200'

const fmt = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function NewFlowForm({ onClose, onCreated }) {
  const { user }    = useAuth()
  const { profile } = useProfile()
  const { blackouts } = useBlackouts()
  const { templates } = useTemplates(undefined)

  const isAdmin      = profile?.role === 'admin'
  const myFacultyIds = (profile?.faculties ?? []).map((f) => f.id)

  // ── Form state ────────────────────────────────────────────────────────────
  const [facultyId, setFacultyId]   = useState('')
  const [subjectId, setSubjectId]   = useState('')
  const [templateId, setTemplateId] = useState('')
  const [anchorDate, setAnchorDate] = useState('')
  const [title, setTitle]           = useState('')
  const [classCount, setClassCount] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  // ── Class teachers ────────────────────────────────────────────────────────
  const [facultyTeachers, setFacultyTeachers] = useState([])
  const [teacherIds, setTeacherIds]           = useState([])

  // ── Faculties + subjects ──────────────────────────────────────────────────
  const [faculties, setFaculties] = useState([])
  useEffect(() => {
    let query = supabase
      .from('faculties')
      .select('id, name, subjects ( id, name )')
      .order('name')
    if (!isAdmin && myFacultyIds.length > 0) {
      query = query.in('id', myFacultyIds)
    }
    query.then(({ data }) => { if (data) setFaculties(data) })
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load teachers for the selected faculty
  useEffect(() => {
    setFacultyTeachers([])
    setTeacherIds([])
    if (!facultyId) return
    supabase
      .from('profiles')
      .select('id, full_name, email, profile_faculties!inner(faculty_id)')
      .eq('profile_faculties.faculty_id', facultyId)
      .order('full_name')
      .then(({ data }) => { if (data) setFacultyTeachers(data) })
  }, [facultyId])

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedFaculty  = faculties.find((f) => f.id === facultyId)
  const subjects         = (selectedFaculty?.subjects ?? []).sort((a, b) => a.name.localeCompare(b.name))
  const selectedSubject  = subjects.find((s) => s.id === subjectId)
  const selectedTemplate = templates.find((t) => t.id === templateId)

  // Auto-fill title when subject + template are both chosen.
  useEffect(() => {
    if (selectedSubject && selectedTemplate) {
      setTitle(`${selectedSubject.name} — ${selectedTemplate.name}`)
    }
  }, [subjectId, templateId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Preview milestones whenever template + date are set.
  const previewMilestones = (() => {
    if (!selectedTemplate || !anchorDate) return []
    return buildMilestoneDates(selectedTemplate.template_milestones ?? [], anchorDate, blackouts)
  })()

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!subjectId || !templateId || !anchorDate || !title.trim()) {
      setError('Please complete all fields.')
      return
    }
    setSubmitting(true)
    setError('')

    const { data: flow, error: flowErr } = await supabase
      .from('flows')
      .insert({
        title:         title.trim(),
        faculty_id:    facultyId,
        subject_id:    subjectId,
        template_id:   templateId,
        template_type: selectedTemplate.template_type,
        anchor_date:   anchorDate,
        created_by:    user.id,
        status:        'active',
        class_count:   parseInt(classCount),
      })
      .select()
      .single()

    if (flowErr) { setError(flowErr.message); setSubmitting(false); return }

    if (previewMilestones.length > 0) {
      const rows = previewMilestones.map((m) => ({
        flow_id:               flow.id,
        stage_number:          m.stage_number,
        sort_order:            m.sort_order,
        title:                 m.title,
        description:           m.description,
        assignee_mode:         m.assignee_mode,
        recipient_mode:        m.recipient_mode,
        due_date:              m.due_date,
        is_reporting_due:      m.is_reporting_due,
        requires_all_teachers: m.requires_all_teachers ?? false,
        offset_days:           m.offset_days,
        is_custom:             false,
      }))
      const { error: msErr } = await supabase.from('flow_milestones').insert(rows)
      if (msErr) { setError(msErr.message); setSubmitting(false); return }
    }

    // Tag flow members: organiser + selected class teachers
    const memberRows = [
      { flow_id: flow.id, user_id: user.id, role_in_flow: 'organiser' },
      ...teacherIds
        .filter((id) => id !== user.id)
        .map((uid) => ({ flow_id: flow.id, user_id: uid, role_in_flow: 'class_teacher' })),
    ]
    await supabase.from('flow_members').insert(memberRows)

    onCreated(flow.id)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white dark:bg-[#161b27]"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e5e7eb] px-6 py-5 dark:border-white/[0.08]">
          <div>
            <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">New assessment flow</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Choose a template, subject, and assessment details.
            </p>
          </div>
          <button type="button" onClick={onClose} className="ml-4 shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        </div>

        {/* Form body */}
        <div className="flex-1 space-y-5 px-6 py-5">

          {/* Row 1: Template + Faculty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Template</label>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={SELECT}>
                <option value="" disabled>Select a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.template_type === 'rubric' ? 'Rubric' : 'Comment'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Faculty</label>
              <select
                value={facultyId}
                onChange={(e) => { setFacultyId(e.target.value); setSubjectId('') }}
                className={SELECT}
              >
                <option value="" disabled>Select a faculty…</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Subject + Assessment date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!facultyId}
                className={SELECT}
              >
                <option value="" disabled>
                  {facultyId ? 'Select a subject…' : 'Select a faculty first'}
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Assessment date</label>
              <input
                type="date"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
                className={INPUT}
              />
            </div>
          </div>

          {/* Row 3: Assessment title + Number of classes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Assessment title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Year 11 Modern History — Source Analysis"
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Number of classes</label>
              <select value={classCount} onChange={(e) => setClassCount(e.target.value)} className={SELECT}>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <option key={n} value={n}>{n} class{n > 1 ? 'es' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Class teachers */}
          {facultyId && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Class teachers</label>
              <TeacherPicker
                teachers={facultyTeachers}
                value={teacherIds}
                onChange={setTeacherIds}
              />
              {facultyTeachers.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">No teachers found for this faculty.</p>
              )}
            </div>
          )}

          {/* Milestone preview */}
          {previewMilestones.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                Milestone preview · {previewMilestones.length} milestones from {fmt(anchorDate)}
              </p>
              <div className="max-h-48 overflow-auto rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-[#e5e7eb] dark:divide-white/[0.08]">
                    {previewMilestones.map((m, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">{m.title}</td>
                        <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{ASSIGNEE_LABEL[m.assignee_mode] ?? m.assignee_mode}</td>
                        <td className="px-3 py-1.5 text-slate-400 whitespace-nowrap">{fmt(m.due_date)}</td>
                        {m.requires_all_teachers && (
                          <td className="px-3 py-1.5">
                            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              All teachers
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#e5e7eb] px-6 py-4 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#e5e7eb] px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !subjectId || !templateId || !anchorDate || !title.trim()}
            className="rounded-md bg-[#4f6ef7] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create assessment'}
          </button>
        </div>
      </form>
    </div>
  )
}
