import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useFlowsContext } from '../hooks/FlowsContext'
import { useTemplates } from '../hooks/useTemplates'
import { useBlackouts } from '../hooks/useBlackouts'
import { buildMilestoneDates, computeDueDate, addWorkingDays } from '../lib/deadlines'
import { logAction } from '../lib/actionLog'
import { ASSIGNEE_LABEL } from '../lib/milestoneStatus'
import TeacherPicker from '../components/ui/TeacherPicker'
import Tooltip from '../components/ui/Tooltip'

// ── Shared styles ─────────────────────────────────────────────────────────────
const SEL = 'block w-full appearance-none rounded-md border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] disabled:opacity-50 dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200'
const INP = 'block w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function fmtOffset(days) {
  if (days == null) return 'custom'
  if (days === 0) return 'anchor'
  const sign = days < 0 ? '−' : '+'
  if (days % 7 === 0) {
    const w = Math.abs(days / 7)
    return `${sign}${w}w`
  }
  return `${sign}${Math.abs(days)}d`
}

const STAGE_COLOR = {
  1: 'bg-violet-500',
  2: 'bg-[#4f6ef7]',
  3: 'bg-amber-500',
  4: 'bg-teal-500',
}
const STAGE_COLOR_HEX = {
  1: '#8b5cf6',
  2: '#4f6ef7',
  3: '#f59e0b',
  4: '#14b8a6',
}
function dotColor(stageNumber) {
  return STAGE_COLOR[stageNumber] ?? 'bg-slate-300'
}

const ASSIGNEE_MODES = [
  { value: 'organiser',      label: 'Organiser' },
  { value: 'class_teachers', label: 'Class teachers' },
  { value: 'lol',            label: 'LoL' },
]

// ── Stepper visualization ─────────────────────────────────────────────────────
function Stepper({ milestones }) {
  const dated = milestones
    .filter((m) => m.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  if (dated.length < 1) return null

  const minTs = new Date(`${dated[0].due_date}T00:00:00`).getTime()
  const maxTs = new Date(`${dated[dated.length - 1].due_date}T00:00:00`).getTime()
  const span  = maxTs - minTs || 1
  const todayPct = Math.min(97, Math.max(3, ((Date.now() - minTs) / span) * 100))

  // Even spacing avoids overlap when many milestones share close dates
  const LABEL_W  = 160
  const PX_PAD   = 64
  const trackWidth = Math.max(900, dated.length * 210)
  const usable     = trackWidth - PX_PAD * 2

  const nodeX = (i) => PX_PAD + ((i + 1) / (dated.length + 1)) * usable
  const todayX = PX_PAD + (todayPct / 100) * usable

  return (
    <div className="overflow-x-auto">
      <div className="relative select-none" style={{ minWidth: trackWidth, height: 280 }}>

        {/* Track line */}
        <div
          className="absolute bg-slate-200 dark:bg-white/[0.08]"
          style={{ left: PX_PAD, right: PX_PAD, top: '50%', height: 2, transform: 'translateY(-50%)' }}
        />

        {/* Today marker */}
        <div
          className="absolute z-10"
          style={{ top: 36, bottom: 16, width: 2, background: '#4f6ef7', left: todayX }}
        >
          <span
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ top: -24, background: '#4f6ef7' }}
          >
            Today
          </span>
        </div>

        {/* Nodes */}
        {dated.map((m, i) => {
          const isTop  = i % 2 === 0
          const color  = STAGE_COLOR_HEX[m.stage_number] ?? '#94a3b8'
          const x      = nodeX(i)

          return (
            <div key={m._key ?? i} style={{ position: 'absolute', top: '50%', left: x, transform: 'translateX(-50%)' }}>

              {/* Label above */}
              {isTop && (
                <div style={{ position: 'absolute', bottom: '1.6rem', left: '50%', transform: 'translateX(-50%)', width: LABEL_W, textAlign: 'center' }}>
                  <p className="text-[11px] font-semibold leading-tight text-slate-800 dark:text-slate-100 line-clamp-2">{m.title}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{fmtDate(m.due_date)}</p>
                </div>
              )}

              {/* Dot */}
              <div
                style={{ position: 'absolute', left: '50%', top: 0, transform: 'translate(-50%, -50%)', backgroundColor: color }}
                className="z-20 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white shadow"
              >
                {i + 1}
              </div>

              {/* Label below */}
              {!isTop && (
                <div style={{ position: 'absolute', top: '1.6rem', left: '50%', transform: 'translateX(-50%)', width: LABEL_W, textAlign: 'center' }}>
                  <p className="text-[11px] font-semibold leading-tight text-slate-800 dark:text-slate-100 line-clamp-2">{m.title}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{fmtDate(m.due_date)}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Inline insert form ────────────────────────────────────────────────────────
function InsertForm({ onSave, onClose }) {
  const [title, setTitle]     = useState('')
  const [dueDate, setDueDate] = useState('')
  const [mode, setMode]       = useState('organiser')

  function submit() {
    if (!title.trim() || !dueDate) return
    onSave({ title: title.trim(), description: '', due_date: dueDate, assignee_mode: mode, is_custom: true, offset_days: null })
  }

  return (
    <div className="mx-4 my-1.5 rounded-md border border-[#4f6ef7]/40 bg-[#4f6ef7]/5 p-3 dark:bg-[#4f6ef7]/10">
      <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">Add milestone</p>
      <div className="space-y-2">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={INP} />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={INP} />
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={SEL}>
            {ASSIGNEE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={submit}
          className="rounded-md bg-[#4f6ef7] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          disabled={!title.trim() || !dueDate}
        >
          Add
        </button>
        <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
    </div>
  )
}

// ── Inline edit form ──────────────────────────────────────────────────────────
function EditForm({ milestone, anchorDate, blackouts, onSave, onClose }) {
  const [draft, setDraft] = useState({
    title:         milestone.title ?? '',
    description:   milestone.description ?? '',
    due_date:      milestone.due_date ?? '',
    assignee_mode: milestone.assignee_mode ?? 'organiser',
    offset_days:   milestone.offset_days ?? '',
  })
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }))

  function handleOffsetChange(e) {
    const raw = e.target.value
    const days = raw === '' ? null : parseInt(raw, 10)
    if (days !== null && !isNaN(days) && anchorDate) {
      const computed = addWorkingDays(anchorDate, days, blackouts ?? [])
      setDraft((d) => ({ ...d, offset_days: raw, due_date: computed }))
    } else {
      setDraft((d) => ({ ...d, offset_days: raw }))
    }
  }

  function handleDueDateChange(e) {
    setDraft((d) => ({ ...d, due_date: e.target.value, offset_days: '' }))
  }

  const parsedOffset = draft.offset_days === '' ? null : parseInt(draft.offset_days, 10)
  const offsetLabel = parsedOffset == null
    ? null
    : parsedOffset === 0
      ? 'Assessment date'
      : parsedOffset < 0
        ? `${Math.abs(parsedOffset)} days before assessment`
        : `${parsedOffset} days after assessment`

  return (
    <div className="border-b border-[#e5e7eb] bg-slate-50 px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
      <p className="mb-3 text-xs font-medium text-slate-600 dark:text-slate-300">Editing: {milestone.title}</p>
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Title</label>
          <input type="text" value={draft.title} onChange={set('title')} className={INP} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Description</label>
          <textarea value={draft.description} onChange={set('description')} rows={2} className={INP + ' resize-none'} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Assigned to</label>
            <select value={draft.assignee_mode} onChange={set('assignee_mode')} className={SEL}>
              {ASSIGNEE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              Offset from assessment date
            </label>
            <input
              type="number"
              value={draft.offset_days}
              onChange={handleOffsetChange}
              placeholder="e.g. −14"
              className={INP}
            />
            {offsetLabel && (
              <p className="mt-1 text-[10px] text-slate-400">{offsetLabel}</p>
            )}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Due date</label>
          <input type="date" value={draft.due_date} onChange={handleDueDateChange} className={INP} />
          {draft.offset_days === '' && draft.due_date && (
            <p className="mt-1 text-[10px] text-slate-400">Custom date — not linked to assessment date.</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onSave({
            ...milestone,
            ...draft,
            offset_days: parsedOffset,
          })}
          className="rounded-md bg-[#4f6ef7] px-3 py-1.5 text-xs font-medium text-white"
        >
          Save
        </button>
        <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NewFlowPage() {
  const navigate = useNavigate()
  const { user }      = useAuth()
  const { profile }   = useProfile()
  const { blackouts } = useBlackouts()
  const { templates, loading: loadingTemplates } = useTemplates()
  const { refetch: refetchFlowsList } = useFlowsContext()

  const isAdmin      = profile?.role === 'admin'
  const isLol        = profile?.role === 'lol'
  const canManageReminders = isAdmin || isLol
  const myFacultyIds = (profile?.faculties ?? []).map((f) => f.id)

  // Faculties + subjects
  const [faculties, setFaculties] = useState([])
  useEffect(() => {
    let q = supabase.from('faculties').select('id, name, subjects ( id, name )').order('name')
    if (!isAdmin && myFacultyIds.length > 0) q = q.in('id', myFacultyIds)
    q.then(({ data }) => { if (data) setFaculties(data) })
  }, [isAdmin])

  // Staff for organiser picker (admin only) and for adding class teachers
  // from outside the selected faculty
  const [staff, setStaff] = useState([])
  useEffect(() => {
    supabase.from('profiles').select('id, full_name, email, role').order('full_name')
      .then(({ data }) => { if (data) setStaff(data) })
  }, [])

  // Teachers in the selected faculty
  const [facultyTeachers, setFacultyTeachers] = useState([])
  const [teacherIds, setTeacherIds]           = useState([])

  // Form state
  const [facultyId, setFacultyId]     = useState('')
  const [subjectId, setSubjectId]     = useState('')
  const [templateId, setTemplateId]   = useState('')
  const [anchorDate, setAnchorDate]   = useState('')
  const [title, setTitle]             = useState('')
  const [titleTouched, setTitleTouched] = useState(false)
  const [organiserId, setOrganiserId] = useState('')
  const [lolId, setLolId]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  // Courses + classes for the selected subject
  const [courses, setCourses]               = useState([])
  const [courseId, setCourseId]             = useState('')
  const [courseClasses, setCourseClasses]   = useState([])
  const [selectedClassIds, setSelectedClassIds] = useState([])

  useEffect(() => {
    setCourses([]); setCourseId(''); setCourseClasses([]); setSelectedClassIds([])
    if (!subjectId) return
    supabase
      .from('courses')
      .select('id, name, year_level, classes ( id, code, name )')
      .eq('subject_id', subjectId)
      .order('year_level')
      .then(({ data }) => { if (data) setCourses(data) })
  }, [subjectId])

  useEffect(() => {
    const course = courses.find((c) => c.id === courseId)
    setCourseClasses((course?.classes ?? []).slice().sort((a, b) => a.code.localeCompare(b.code)))
    setSelectedClassIds([])
  }, [courseId, courses])

  // Editable milestone list
  const [milestones, setMilestones]   = useState([])
  const [editingIdx, setEditingIdx]   = useState(null)
  const [insertAtIdx, setInsertAtIdx] = useState(null)

  const selectedFaculty  = faculties.find((f) => f.id === facultyId)
  const subjects         = (selectedFaculty?.subjects ?? []).sort((a, b) => a.name.localeCompare(b.name))
  const selectedSubject  = subjects.find((s) => s.id === subjectId)
  const selectedCourse   = courses.find((c) => c.id === courseId)

  // Templates filtered for the selected faculty: school-wide + faculty-specific
  const filteredTemplates = templates.filter(
    (t) => !t.faculty_id || t.faculty_id === facultyId
  )
  const selectedTemplate = filteredTemplates.find((t) => t.id === templateId)

  // Set default organiser to current user
  useEffect(() => { if (user && !organiserId) setOrganiserId(user.id) }, [user])

  // Reset template selection when faculty changes and selected template no longer applies
  useEffect(() => {
    const applicable = templates.filter((t) => !t.faculty_id || t.faculty_id === facultyId)
    if (templateId && !applicable.find((t) => t.id === templateId)) {
      setTemplateId('')
    }
  }, [facultyId, templates])

  // Load teachers for the selected faculty
  useEffect(() => {
    setFacultyTeachers([])
    setTeacherIds([])
    setLolId('')
    if (!facultyId) return
    supabase
      .from('profiles')
      .select('id, full_name, email, role, profile_faculties!inner(faculty_id)')
      .eq('profile_faculties.faculty_id', facultyId)
      .order('full_name')
      .then(({ data }) => { if (data) setFacultyTeachers(data) })
  }, [facultyId])

  // LoLs of the selected faculty — auto-select when there's exactly one
  const facultyLols = facultyTeachers.filter((p) => p.role === 'lol')
  useEffect(() => {
    if (facultyLols.length === 1) setLolId(facultyLols[0].id)
  }, [facultyTeachers]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild milestones when template / date / blackouts change
  useEffect(() => {
    if (!selectedTemplate || !anchorDate) { setMilestones([]); return }
    const built = buildMilestoneDates(selectedTemplate.template_milestones ?? [], anchorDate, blackouts)
    setMilestones(built.map((m, i) => ({ ...m, reminders_enabled: m.reminders_enabled ?? true, _key: `t-${i}-${Date.now()}` })))
    setEditingIdx(null)
    setInsertAtIdx(null)
  }, [templateId, anchorDate, blackouts])

  // Auto-fill title — only until the user types their own
  useEffect(() => {
    if (!titleTouched && selectedCourse && selectedTemplate) {
      setTitle(`${selectedCourse.name} — ${selectedTemplate.name}`)
    }
  }, [courseId, templateId, titleTouched])

  // Milestone list operations
  function moveUp(idx) {
    if (idx === 0) return
    setMilestones((ms) => { const n = [...ms]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n })
  }
  function moveDown(idx) {
    setMilestones((ms) => {
      if (idx >= ms.length - 1) return ms
      const n = [...ms]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n
    })
  }
  function deleteMilestone(idx) {
    setMilestones((ms) => ms.filter((_, i) => i !== idx))
    if (editingIdx === idx) setEditingIdx(null)
  }
  function toggleReminders(idx) {
    setMilestones((ms) => ms.map((m, i) =>
      i === idx ? { ...m, reminders_enabled: !(m.reminders_enabled ?? true) } : m
    ))
  }
  function setAllReminders(enabled) {
    setMilestones((ms) => ms.map((m) => ({ ...m, reminders_enabled: enabled })))
  }
  function saveEdit(updated) {
    setMilestones((ms) => ms.map((m, i) => i === editingIdx ? { ...updated, _key: m._key } : m))
    setEditingIdx(null)
  }
  function insertMilestone(atIdx, m) {
    setMilestones((ms) => {
      const n = [...ms]
      n.splice(atIdx, 0, { ...m, _key: `ins-${Date.now()}` })
      return n
    })
    setInsertAtIdx(null)
  }

  // Submit
  async function handleSubmit(e) {
    e.preventDefault()
    if (!subjectId || !courseId || !templateId || !anchorDate || !title.trim()) {
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
        course_id:     courseId,
        template_id:   templateId,
        template_type: selectedTemplate.template_type,
        anchor_date:   anchorDate,
        created_by:    organiserId || user.id,
        lol_id:        lolId || null,
        status:        'active',
        class_count:   selectedClassIds.length || courseClasses.length,
      })
      .select()
      .single()

    if (flowErr) { setError(flowErr.message); setSubmitting(false); return }

    if (milestones.length > 0) {
      const rows = milestones.map((m, i) => ({
        flow_id:               flow.id,
        stage_number:          m.stage_number ?? 1,
        sort_order:            i + 1,
        title:                 m.title,
        description:           m.description ?? null,
        assignee_mode:         m.assignee_mode ?? 'organiser',
        recipient_mode:        m.recipient_mode ?? 'assignee_only',
        due_date:              m.due_date,
        is_reporting_due:      m.is_reporting_due ?? false,
        requires_all_teachers: m.requires_all_teachers ?? false,
        offset_days:           m.is_custom ? null : (m.offset_days ?? null),
        is_custom:             m.is_custom ?? false,
        reminders_enabled:     m.reminders_enabled ?? true,
        email_subject:         m.default_email_subject ?? null,
        email_body:            m.default_email_body ?? null,
      }))
      const { error: msErr } = await supabase.from('flow_milestones').insert(rows)
      if (msErr) { setError(msErr.message); setSubmitting(false); return }
    }

    // Link selected classes to the flow
    const classIdsToLink = selectedClassIds.length > 0 ? selectedClassIds : courseClasses.map((c) => c.id)
    if (classIdsToLink.length > 0) {
      const classRows = classIdsToLink.map((classId) => ({ flow_id: flow.id, class_id: classId }))
      const { error: classErr } = await supabase.from('flow_classes').insert(classRows)
      if (classErr) { setError(classErr.message); setSubmitting(false); return }
    }

    // Tag flow members: organiser + LoL + selected class teachers (deduplicated,
    // first role assigned wins if the same person holds more than one).
    const organiserUid = organiserId || user.id
    const roleByUid = new Map()
    roleByUid.set(organiserUid, 'organiser')
    if (lolId) roleByUid.set(lolId, roleByUid.get(lolId) ?? 'lol')
    for (const id of teacherIds) roleByUid.set(id, roleByUid.get(id) ?? 'class_teacher')
    const memberRows = Array.from(roleByUid, ([user_id, role_in_flow]) => ({
      flow_id: flow.id,
      user_id,
      role_in_flow,
    }))
    const { error: membersErr } = await supabase.from('flow_members').insert(memberRows)
    if (membersErr) { setError(membersErr.message); setSubmitting(false); return }

    logAction({ actorId: user.id, actorName: profile?.full_name, actorEmail: profile?.email, action: 'flow.created', entityType: 'flow', entityId: flow.id, details: { title: title.trim(), faculty_name: selectedFaculty?.name } })
    refetchFlowsList()
    navigate(`/flows/${flow.id}`)
  }

  const canSubmit = !!subjectId && !!courseId && !!templateId && !!anchorDate && !!title.trim()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-slate-900 dark:text-slate-100">New assessment flow</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Choose a template and subject — milestone dates calculate automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/5"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">

          {/* Form fields — constrained so inputs don't stretch too wide */}
          <div className="mx-auto max-w-3xl space-y-5">

            {/* Subject + Template side by side */}
            <div className="grid gap-5 sm:grid-cols-2">

              {/* Subject — faculty → subject → year */}
              <div className="rounded-lg border border-[#e5e7eb] p-5 dark:border-white/[0.08]">
                <h2 className="mb-4 text-sm font-medium text-slate-700 dark:text-slate-300">Subject</h2>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Faculty</label>
                    <select
                      value={facultyId}
                      onChange={(e) => { setFacultyId(e.target.value); setSubjectId('') }}
                      className={SEL}
                    >
                      <option value="" disabled>Select a faculty…</option>
                      {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Subject</label>
                    <select
                      value={subjectId}
                      onChange={(e) => { setSubjectId(e.target.value); setCourseId('') }}
                      disabled={!facultyId}
                      className={SEL}
                    >
                      <option value="" disabled>
                        {facultyId ? 'Select a subject…' : 'Select a faculty first'}
                      </option>
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Year level</label>
                    <select
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      disabled={!subjectId}
                      className={SEL}
                    >
                      <option value="" disabled>
                        {subjectId ? (courses.length === 0 ? 'No year levels set up yet' : 'Select a year…') : 'Select a subject first'}
                      </option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>Year {c.year_level}</option>
                      ))}
                    </select>
                  </div>

                  {/* Classes for the selected year */}
                  {courseClasses.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">
                        Classes
                        <span className="ml-1 font-normal text-slate-400">(leave all unchecked to include all)</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {courseClasses.map((cls) => {
                          const checked = selectedClassIds.includes(cls.id)
                          return (
                            <label
                              key={cls.id}
                              className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                                checked
                                  ? 'border-[#4f6ef7] bg-[#4f6ef7]/10 text-[#4f6ef7]'
                                  : 'border-[#e5e7eb] text-slate-600 hover:border-[#4f6ef7]/50 dark:border-white/[0.08] dark:text-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() =>
                                  setSelectedClassIds((ids) =>
                                    checked ? ids.filter((id) => id !== cls.id) : [...ids, cls.id]
                                  )
                                }
                              />
                              {cls.code}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Template selector */}
              <div className="rounded-lg border border-[#e5e7eb] p-5 dark:border-white/[0.08]">
                <h2 className="mb-4 text-sm font-medium text-slate-700 dark:text-slate-300">Template</h2>
                {loadingTemplates ? (
                  <p className="text-sm text-slate-400">Loading…</p>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={templateId}
                      onChange={(e) => setTemplateId(e.target.value)}
                      className={SEL}
                    >
                      <option value="" disabled>
                        {filteredTemplates.length === 0
                          ? 'No templates available — create one in Templates first'
                          : 'Select a template…'}
                      </option>
                      {filteredTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.faculties?.name ? ` · ${t.faculties.name}` : ' · School-wide'}
                          {' · '}{t.template_milestones?.length ?? 0} milestones
                        </option>
                      ))}
                    </select>

                    {selectedTemplate && (
                      <div className="rounded-md bg-slate-50 px-4 py-3 dark:bg-white/[0.03]">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{selectedTemplate.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {selectedTemplate.template_type === 'rubric' ? 'Rubric-based' : 'Comment-based'}
                          {' · '}{selectedTemplate.template_milestones?.length ?? 0} milestones
                          {selectedTemplate.faculties?.name ? ` · ${selectedTemplate.faculties.name}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Assessment details + Staffing side by side */}
            <div className="grid gap-5 sm:grid-cols-2">

              {/* Assessment details */}
              <div className="rounded-lg border border-[#e5e7eb] p-5 dark:border-white/[0.08]">
                <h2 className="mb-4 text-sm font-medium text-slate-700 dark:text-slate-300">Assessment details</h2>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Assessment date</label>
                    <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} className={INP} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Assessment title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setTitleTouched(true) }}
                      placeholder="e.g. Year 11 Modern History — Source Analysis Task"
                      className={INP}
                    />
                  </div>
                </div>
              </div>

              {/* Staffing */}
              <div className="rounded-lg border border-[#e5e7eb] p-5 dark:border-white/[0.08]">
                <h2 className="mb-4 text-sm font-medium text-slate-700 dark:text-slate-300">Staffing</h2>
                <div className="space-y-3">
                  {isAdmin && staff.length > 0 ? (
                    <div>
                      <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Organising teacher</label>
                      <select value={organiserId} onChange={(e) => setOrganiserId(e.target.value)} className={SEL}>
                        {staff.map((p) => (
                          <option key={p.id} value={p.id}>{p.full_name ?? p.email} ({p.role})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    facultyId && (
                      <div>
                        <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Organising teacher</label>
                        <select value={organiserId} onChange={(e) => setOrganiserId(e.target.value)} className={SEL}>
                          {facultyTeachers.map((p) => (
                            <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>
                          ))}
                        </select>
                      </div>
                    )
                  )}

                  {facultyId && (
                    <div>
                      <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Leader of Learning</label>
                      <select value={lolId} onChange={(e) => setLolId(e.target.value)} className={SEL} disabled={facultyLols.length === 0}>
                        <option value="">
                          {facultyLols.length === 0 ? 'No LoL assigned to this faculty' : 'Select a LoL…'}
                        </option>
                        {facultyLols.map((p) => (
                          <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>
                        ))}
                      </select>
                      {facultyLols.length === 0 && (
                        <p className="mt-1 text-xs text-slate-400">No LoL is assigned to this faculty yet — add one from the Admin page first.</p>
                      )}
                      {facultyLols.length > 1 && !lolId && (
                        <p className="mt-1 text-xs text-amber-500">This faculty has multiple LoLs — pick the one for this task so reminders and the email signature go to the right person.</p>
                      )}
                    </div>
                  )}

                  {facultyId ? (
                    <div>
                      <label className="mb-1.5 block text-xs text-slate-500 dark:text-slate-400">Class teachers</label>
                      <TeacherPicker
                        teachers={facultyTeachers}
                        otherTeachers={staff}
                        value={teacherIds}
                        onChange={setTeacherIds}
                      />
                      {facultyTeachers.length === 0 && (
                        <p className="mt-1 text-xs text-slate-400">No teachers found for this faculty. Add staff from the Admin page first.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Select a faculty to choose class teachers.</p>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="w-full rounded-md bg-[#4f6ef7] px-4 py-3 text-sm font-medium text-white disabled:opacity-60 hover:bg-[#3d5ce6]"
            >
              {submitting ? 'Creating…' : 'Create assessment'}
            </button>
          </div>

          {/* Milestone schedule */}
          <div className="rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">

              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4 dark:border-white/[0.08]">
                <div>
                  <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Milestone schedule</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {milestones.length > 0
                      ? `${milestones.length} milestones · edit, reorder, or add before creating`
                      : 'Select a template and assessment date to preview.'}
                  </p>
                </div>
                {canManageReminders && milestones.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAllReminders(milestones.every((m) => !(m.reminders_enabled ?? true)))}
                    className="shrink-0 rounded px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10"
                  >
                    {milestones.every((m) => !(m.reminders_enabled ?? true)) ? 'Turn on all reminders' : 'Turn off all reminders'}
                  </button>
                )}
              </div>

              {milestones.length === 0 ? (
                <div className="flex items-center justify-center px-5 py-16 text-center">
                  <p className="text-sm text-slate-300 dark:text-slate-600">
                    Milestone dates appear here once you pick a template and assessment date.
                  </p>
                </div>
              ) : (
                <>
                  {/* Stepper track */}
                  <div className="border-b border-[#e5e7eb] px-4 py-4 dark:border-white/[0.08]">
                    <Stepper milestones={milestones} />
                  </div>

                  {/* Insert slot at start */}
                  {insertAtIdx === 0 ? (
                    <InsertForm onSave={(m) => insertMilestone(0, m)} onClose={() => setInsertAtIdx(null)} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setInsertAtIdx(0)}
                      className="block w-full py-1 text-center text-xs text-slate-200 hover:text-[#4f6ef7] dark:text-slate-700 dark:hover:text-[#4f6ef7]"
                    >
                      + add milestone at start
                    </button>
                  )}

                  {milestones.map((m, idx) => (
                    <div key={m._key}>
                      {editingIdx === idx ? (
                        <EditForm
                          milestone={m}
                          anchorDate={anchorDate}
                          blackouts={blackouts}
                          onSave={saveEdit}
                          onClose={() => setEditingIdx(null)}
                        />
                      ) : (
                        <div className="flex items-start gap-3 border-t border-[#e5e7eb] px-5 py-3 dark:border-white/[0.08]">
                          {/* Stage dot */}
                          <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor(m.stage_number)}`} />

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.title}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(m.due_date)}</span>
                              {m.offset_days != null && (
                                <span className="rounded bg-slate-100 px-1.5 py-px text-xs text-slate-500 dark:bg-white/10 dark:text-slate-400">
                                  {fmtOffset(m.offset_days)}
                                </span>
                              )}
                              {m.blackout_original_date && (
                                <span className="text-xs text-amber-500">
                                  moved from {fmtDate(m.blackout_original_date)}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-slate-400">
                                {ASSIGNEE_LABEL[m.assignee_mode] ?? m.assignee_mode}
                              </span>
                              {m.requires_all_teachers && (
                                <span className="rounded-full bg-blue-100 px-1.5 py-px text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  All teachers
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex shrink-0 items-center gap-0.5">
                            {canManageReminders && (
                              <Tooltip content={m.reminders_enabled ?? true ? 'Reminder emails on — click to turn off' : 'Reminder emails off — click to turn on'}>
                                <label className="flex items-center px-1.5 py-1">
                                  <input
                                    type="checkbox"
                                    checked={m.reminders_enabled ?? true}
                                    onChange={() => toggleReminders(idx)}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#4f6ef7] focus:ring-[#4f6ef7] dark:border-white/20"
                                  />
                                </label>
                              </Tooltip>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingIdx(idx)}
                              className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => moveUp(idx)}
                              disabled={idx === 0}
                              className="rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 disabled:opacity-20 dark:hover:bg-white/10"
                              title="Move up"
                            >▲</button>
                            <button
                              type="button"
                              onClick={() => moveDown(idx)}
                              disabled={idx === milestones.length - 1}
                              className="rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 disabled:opacity-20 dark:hover:bg-white/10"
                              title="Move down"
                            >▼</button>
                            <button
                              type="button"
                              onClick={() => deleteMilestone(idx)}
                              className="rounded px-2 py-1 text-xs text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                              title="Delete"
                            >✕</button>
                          </div>
                        </div>
                      )}

                      {/* Insert slot after this milestone */}
                      {insertAtIdx === idx + 1 ? (
                        <InsertForm
                          onSave={(m) => insertMilestone(idx + 1, m)}
                          onClose={() => setInsertAtIdx(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setInsertAtIdx(idx + 1)}
                          className="block w-full py-1 text-center text-xs text-slate-200 hover:text-[#4f6ef7] dark:text-slate-700 dark:hover:text-[#4f6ef7]"
                        >
                          + add milestone here
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
          </div>
        </div>
      </form>
    </div>
  )
}
