import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useOutletContext, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useFlowsContext } from '../hooks/FlowsContext'
import { useBlackouts } from '../hooks/useBlackouts'
import { buildMilestoneDates } from '../lib/deadlines'
import { logAction } from '../lib/actionLog'
import StageBlock from '../components/flows/StageBlock'
import MilestoneDetailPanel from '../components/flows/MilestoneDetailPanel'
import CustomMilestoneForm from '../components/flows/CustomMilestoneForm'
import CountdownPanel from '../components/flows/CountdownPanel'
import ProgressTrack from '../components/flows/ProgressTrack'
import TeacherPicker from '../components/ui/TeacherPicker'

const STAGES = [
  { number: 1, title: 'Task Creation & Setup',     color: '#8b5cf6' },
  { number: 2, title: 'Platform Setup',            color: '#4f6ef7' },
  { number: 3, title: 'Submission & Marking',      color: '#f59e0b' },
  { number: 4, title: 'Comments & Publishing',     color: '#14b8a6' },
]

export default function FlowPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { viewAsProfile } = useOutletContext()
  const { profile: realProfile } = useProfile()
  const profile = viewAsProfile ?? realProfile
  const effectiveUserId = viewAsProfile?.id ?? user?.id

  const { blackouts } = useBlackouts()
  const { refetch: refetchFlowsList } = useFlowsContext()

  const [flow, setFlow]                       = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null)
  const [showCustomForm, setShowCustomForm]   = useState(false)
  const [addingCanvasUrl, setAddingCanvasUrl]   = useState(false)
  const [newCanvasTitle, setNewCanvasTitle]     = useState('')
  const [newCanvasUrl, setNewCanvasUrl]         = useState('')
  const canvasInputRef = useRef(null)

  const [editingTeachers, setEditingTeachers] = useState(false)
  const [facultyTeachers, setFacultyTeachers] = useState([])
  const [draftTeacherIds, setDraftTeacherIds] = useState([])
  const [savingTeachers, setSavingTeachers]   = useState(false)

  const fetchFlow = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    return supabase
      .from('flows')
      .select(
        `*,
        faculties ( name ),
        subjects ( name ),
        flow_milestones (
          id, stage_number, sort_order, title, description,
          assignee_mode, recipient_mode, due_date, reminder_date, is_custom,
          completed_at, completed_by, notes, reminders_enabled,
          offset_days, is_reporting_due, requires_all_teachers,
          email_subject, email_body,
          completed_by_profile:profiles!flow_milestones_completed_by_fkey ( id, full_name, email ),
          milestone_sign_offs ( user_id, signed_at, profiles ( id, full_name, email ) )
        ),
        flow_members (
          user_id, role_in_flow, profiles ( id, full_name, email )
        )`
      )
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) { console.error('FlowPage fetch:', error); if (!silent) setFlow(null) }
        else setFlow(data)
        if (!silent) setLoading(false)
      })
  }, [id])

  useEffect(() => { fetchFlow() }, [fetchFlow])

  // Derive milestone dates from anchor_date + template offsets + blackout weeks.
  // Template milestones have offset_days; custom milestones have a stored due_date.
  const milestones = (() => {
    if (!flow) return []
    const raw = (flow.flow_milestones ?? []).sort((a, b) => {
      if (a.stage_number !== b.stage_number) return a.stage_number - b.stage_number
      return a.sort_order - b.sort_order
    })
    if (!flow.anchor_date) return raw
    // Build dates for template milestones (those with offset_days).
    const resolved = buildMilestoneDates(
      raw.filter((m) => m.offset_days != null),
      flow.anchor_date,
      blackouts
    )
    // Index resolved dates by id for O(1) lookup.
    const dateById = Object.fromEntries(resolved.map((m) => [m.id, m.due_date]))
    return raw.map((m) => ({
      ...m,
      due_date: m.is_custom ? m.due_date : (dateById[m.id] ?? m.due_date),
    }))
  })()

  // Named roster of class teachers tagged to this flow — used both to render
  // who has/hasn't signed off and as the completion threshold for milestones
  // that require every teacher to sign off individually.
  const classTeachers = (flow?.flow_members ?? [])
    .filter((m) => m.role_in_flow === 'class_teacher' && m.profiles)
    .map((m) => m.profiles)

  const canDelete = profile?.role === 'admin' || profile?.role === 'lol'

  const handleDeleteFlow = async () => {
    if (!canDelete) return
    if (!window.confirm(`Delete "${flow?.title}"? This cannot be undone.`)) return
    logAction({ actorId: effectiveUserId, actorName: profile?.full_name, actorEmail: profile?.email, action: 'flow.deleted', entityType: 'flow', entityId: id, details: { title: flow?.title, ...(viewAsProfile ? { impersonated_by: realProfile?.full_name } : {}) } })
    const { error } = await supabase.from('flows').delete().eq('id', id)
    if (error) { console.error('Delete flow:', error); return }
    refetchFlowsList()
    navigate('/')
  }

  const handleToggleMilestone = async (milestone) => {
    if (!milestone.requires_all_teachers) {
      // Single-toggle: one person marks the whole milestone done/undone.
      const completing = !milestone.completed_at
      const now = new Date().toISOString()
      const newCompletedAt = completing ? now : null
      const newCompletedBy = completing ? effectiveUserId : null

      setFlow((prev) => ({
        ...prev,
        flow_milestones: prev.flow_milestones.map((m) =>
          m.id === milestone.id ? { ...m, completed_at: newCompletedAt, completed_by: newCompletedBy } : m
        ),
      }))

      await supabase
        .from('flow_milestones')
        .update({ completed_at: newCompletedAt, completed_by: newCompletedBy })
        .eq('id', milestone.id)

      logAction({ actorId: effectiveUserId, actorName: profile?.full_name, actorEmail: profile?.email, action: completing ? 'milestone.completed' : 'milestone.uncompleted', entityType: 'milestone', entityId: milestone.id, details: { milestone_title: milestone.title, flow_title: flow?.title, ...(viewAsProfile ? { impersonated_by: realProfile?.full_name } : {}) } })

      fetchFlow(true)
      refetchFlowsList()
      return
    }

    // Multi-sign-off: toggle the effective user's sign-off row.
    const existingSignOff = (milestone.milestone_sign_offs ?? []).find((s) => s.user_id === effectiveUserId)

    if (existingSignOff) {
      await supabase.from('milestone_sign_offs')
        .delete()
        .eq('flow_milestone_id', milestone.id)
        .eq('user_id', effectiveUserId)
      logAction({ actorId: effectiveUserId, actorName: profile?.full_name, actorEmail: profile?.email, action: 'milestone.sign_off_removed', entityType: 'milestone', entityId: milestone.id, details: { milestone_title: milestone.title, flow_title: flow?.title, ...(viewAsProfile ? { impersonated_by: realProfile?.full_name } : {}) } })
      // Clear overall completion — not all teachers are signed off any more.
      if (milestone.completed_at) {
        await supabase.from('flow_milestones')
          .update({ completed_at: null, completed_by: null })
          .eq('id', milestone.id)
      }
    } else {
      await supabase.from('milestone_sign_offs')
        .insert({ flow_milestone_id: milestone.id, user_id: effectiveUserId })
      logAction({ actorId: effectiveUserId, actorName: profile?.full_name, actorEmail: profile?.email, action: 'milestone.signed_off', entityType: 'milestone', entityId: milestone.id, details: { milestone_title: milestone.title, flow_title: flow?.title, ...(viewAsProfile ? { impersonated_by: realProfile?.full_name } : {}) } })

      // Auto-complete once every named class teacher on the flow has signed off.
      const signedAfter = (milestone.milestone_sign_offs ?? []).length + 1
      if (signedAfter >= classTeachers.length) {
        await supabase.from('flow_milestones')
          .update({ completed_at: new Date().toISOString(), completed_by: effectiveUserId })
          .eq('id', milestone.id)
      }
    }

    fetchFlow(true)
    refetchFlowsList()
  }

  const handleAddCanvasUrl = async () => {
    const trimmedUrl = newCanvasUrl.trim()
    if (!trimmedUrl) { setAddingCanvasUrl(false); return }
    const trimmedTitle = newCanvasTitle.trim()
    const updated = [...(flow.canvas_links ?? []), { title: trimmedTitle || trimmedUrl, url: trimmedUrl }]
    await supabase.from('flows').update({ canvas_links: updated }).eq('id', id)
    setFlow((prev) => ({ ...prev, canvas_links: updated }))
    setNewCanvasTitle('')
    setNewCanvasUrl('')
    setAddingCanvasUrl(false)
  }

  const handleRemoveCanvasUrl = async (index) => {
    const updated = (flow.canvas_links ?? []).filter((_, i) => i !== index)
    await supabase.from('flows').update({ canvas_links: updated }).eq('id', id)
    setFlow((prev) => ({ ...prev, canvas_links: updated }))
  }

  const handleNewCanvasUrlKeyDown = (e) => {
    if (e.key === 'Enter') handleAddCanvasUrl()
    if (e.key === 'Escape') { setAddingCanvasUrl(false); setNewCanvasTitle(''); setNewCanvasUrl('') }
  }

  const openTeacherEditor = async () => {
    if (!flow.faculty_id) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, profile_faculties!inner(faculty_id)')
      .eq('profile_faculties.faculty_id', flow.faculty_id)
      .order('full_name')
    setFacultyTeachers(data ?? [])
    setDraftTeacherIds(classTeachers.map((t) => t.id))
    setEditingTeachers(true)
  }

  const saveTeachers = async () => {
    setSavingTeachers(true)
    const currentIds = classTeachers.map((t) => t.id)
    const toAdd    = draftTeacherIds.filter((tid) => !currentIds.includes(tid))
    const toRemove = currentIds.filter((tid) => !draftTeacherIds.includes(tid))

    if (toAdd.length > 0) {
      await supabase.from('flow_members').insert(
        toAdd.map((uid) => ({ flow_id: id, user_id: uid, role_in_flow: 'class_teacher' }))
      )
    }
    if (toRemove.length > 0) {
      await supabase.from('flow_members')
        .delete()
        .eq('flow_id', id)
        .eq('role_in_flow', 'class_teacher')
        .in('user_id', toRemove)
    }

    if (toAdd.length > 0 || toRemove.length > 0) {
      const added   = toAdd.map((tid) => facultyTeachers.find((t) => t.id === tid)?.full_name ?? tid)
      const removed = toRemove.map((tid) => classTeachers.find((t) => t.id === tid)?.full_name ?? tid)
      logAction({ actorId: effectiveUserId, actorName: profile?.full_name, actorEmail: profile?.email, action: 'flow.teachers_updated', entityType: 'flow', entityId: id, details: { flow_title: flow?.title, added, removed, ...(viewAsProfile ? { impersonated_by: realProfile?.full_name } : {}) } })
    }

    setSavingTeachers(false)
    setEditingTeachers(false)
    fetchFlow(true)
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading flow…</p>
  if (!flow)   return <p className="text-sm text-slate-500 dark:text-slate-400">Flow not found.</p>

  const isTeacher  = profile?.role === 'teacher'
  const today      = new Date().toISOString().slice(0, 10)
  const total      = milestones.length
  const completed  = milestones.filter((m) => !!m.completed_at).length
  const overdue    = milestones.filter((m) => !m.completed_at && m.due_date && m.due_date < today).length
  const progress   = total ? Math.round((completed / total) * 100) : 0

  const selectedMilestone = milestones.find((m) => m.id === selectedMilestoneId) ?? null

  // Teachers only see milestones assigned to them (class_teachers or organiser if they created the flow).
  const visibleMilestones = isTeacher
    ? milestones.filter(
        (m) =>
          m.assignee_mode === 'class_teachers' ||
          (m.assignee_mode === 'organiser' && flow.created_by === profile?.id)
      )
    : milestones

  const subjectName  = flow.subjects?.name ?? ''
  const facultyName  = flow.faculties?.name ?? ''

  return (
    <div className="space-y-5">
      {/* Header / breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--muted)' }}>
          <span>Flows</span>
          <span>›</span>
          <b style={{ color: 'var(--ink)', fontWeight: 600 }}>
            {[flow.title, subjectName].filter(Boolean).join(' — ')}
          </b>
        </div>
        <div className="flex items-center gap-2">
          {!isTeacher && (
            <button
              type="button"
              onClick={() => setShowCustomForm(true)}
              className="inline-flex items-center gap-1.5 rounded-[9px] border px-[14px] py-2 text-[13px] font-semibold transition-all duration-150 hover:border-primary hover:text-primary"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-2)', background: 'var(--surface)' }}
            >
              ＋ Custom milestone
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDeleteFlow}
              className="inline-flex items-center rounded-[9px] border border-transparent px-[14px] py-2 text-[13px] font-semibold transition-all duration-150 hover:bg-red-500/10 hover:border-danger"
              style={{ color: 'var(--danger)' }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Hero — countdown, canvas links, class teachers */}
      <CountdownPanel flow={flow} milestones={milestones} stages={STAGES}>
        <div className="flex flex-wrap gap-6">

          {/* Canvas links */}
          {((flow.canvas_links ?? []).length > 0 || !isTeacher) && (
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ color: 'var(--hero-ink-dim)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
                <span className="text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: 'var(--hero-ink-dim)' }}>
                  Canvas submissions
                </span>
              </div>

              <div className="space-y-1">
                {(flow.canvas_links ?? []).map((link, i) => (
                  <div key={i} className="flex items-center gap-2 min-w-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-xs font-medium hover:underline"
                      style={{ color: 'var(--hero-ink)' }}
                      title={link.url}
                    >
                      {link.title || link.url}
                    </a>
                    {!isTeacher && (
                      <button
                        onClick={() => handleRemoveCanvasUrl(i)}
                        className="shrink-0 opacity-50 hover:opacity-100"
                        style={{ color: 'var(--hero-ink)' }}
                        title="Remove"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}

                {addingCanvasUrl && (
                  <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                    <input
                      type="text"
                      value={newCanvasTitle}
                      onChange={(e) => setNewCanvasTitle(e.target.value)}
                      onKeyDown={handleNewCanvasUrlKeyDown}
                      placeholder="Link title (optional)"
                      className="w-32 shrink-0 rounded-md px-2 py-1 text-xs outline-none"
                      style={{ background: 'var(--hero-glass)', border: '1px solid var(--hero-glass-border)', color: 'var(--hero-ink)' }}
                      autoFocus
                    />
                    <input
                      ref={canvasInputRef}
                      type="url"
                      value={newCanvasUrl}
                      onChange={(e) => setNewCanvasUrl(e.target.value)}
                      onKeyDown={handleNewCanvasUrlKeyDown}
                      placeholder="https://canvas.edu/…"
                      className="w-44 rounded-md px-2 py-1 text-xs outline-none"
                      style={{ background: 'var(--hero-glass)', border: '1px solid var(--hero-glass-border)', color: 'var(--hero-ink)' }}
                    />
                    <button onClick={handleAddCanvasUrl} className="text-xs font-semibold" style={{ color: 'var(--hero-ink)' }}>Add</button>
                    <button onClick={() => { setAddingCanvasUrl(false); setNewCanvasTitle(''); setNewCanvasUrl('') }} className="text-xs opacity-60 hover:opacity-100" style={{ color: 'var(--hero-ink)' }}>Cancel</button>
                  </div>
                )}

                {!isTeacher && !addingCanvasUrl && (
                  <button
                    onClick={() => setAddingCanvasUrl(true)}
                    className="mt-0.5 text-xs opacity-60 hover:opacity-100"
                    style={{ color: 'var(--hero-ink)' }}
                  >
                    + Add submission link
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Class teachers */}
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ color: 'var(--hero-ink-dim)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
                <span className="text-[11px] font-semibold uppercase tracking-[1px]" style={{ color: 'var(--hero-ink-dim)' }}>
                  Class teachers
                </span>
              </div>
              {canDelete && !editingTeachers && (
                <button
                  type="button"
                  onClick={openTeacherEditor}
                  className="text-xs opacity-60 hover:opacity-100"
                  style={{ color: 'var(--hero-ink)' }}
                >
                  Edit
                </button>
              )}
            </div>

            {editingTeachers ? (
              <div className="space-y-2">
                <TeacherPicker
                  teachers={facultyTeachers}
                  value={draftTeacherIds}
                  onChange={setDraftTeacherIds}
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={saveTeachers}
                    disabled={savingTeachers}
                    className="rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                    style={{ background: 'rgba(255,255,255,0.25)', color: 'var(--hero-ink)' }}
                  >
                    {savingTeachers ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTeachers(false)}
                    className="rounded-md px-3 py-1.5 text-xs opacity-70 hover:opacity-100"
                    style={{ background: 'var(--hero-glass)', border: '1px solid var(--hero-glass-border)', color: 'var(--hero-ink)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : classTeachers.length === 0 ? (
              <p className="text-xs opacity-50" style={{ color: 'var(--hero-ink)' }}>No class teachers added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {classTeachers
                  .slice()
                  .sort((a, b) => (a.full_name ?? a.email ?? '').localeCompare(b.full_name ?? b.email ?? ''))
                  .map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm"
                      style={{ background: 'var(--hero-glass)', border: '1px solid var(--hero-glass-border)', color: 'var(--hero-ink)' }}
                    >
                      {t.full_name ?? t.email}
                    </span>
                  ))}
              </div>
            )}
          </div>

        </div>
      </CountdownPanel>

      {/* Progress track */}
      <ProgressTrack
        milestones={milestones}
        selectedId={selectedMilestoneId}
        onSelect={setSelectedMilestoneId}
      />

      {/* Stage blocks */}
      <div className="space-y-3">
        {STAGES.map((stage) => {
          const stageMilestones = visibleMilestones.filter((m) => m.stage_number === stage.number)
          if (stageMilestones.length === 0) return null
          return (
            <StageBlock
              key={stage.number}
              id={`stage-${stage.number}`}
              stageNumber={stage.number}
              title={`Stage ${stage.number} — ${stage.title}`}
              colorHex={stage.color}
              milestones={stageMilestones}
              onToggle={handleToggleMilestone}
              onSelect={(m) => setSelectedMilestoneId(m.id)}
              readOnly={false}
              classTeachers={classTeachers}
              currentUserId={effectiveUserId}
            />
          )
        })}
      </div>

      {/* Detail panel */}
      {selectedMilestone && (
        <MilestoneDetailPanel
          milestone={selectedMilestone}
          flow={flow}
          profile={profile}
          userId={effectiveUserId}
          readOnly={false}
          onClose={() => setSelectedMilestoneId(null)}
          onToggle={handleToggleMilestone}
          onSaved={() => fetchFlow(true)}
        />
      )}

      {/* Custom milestone form */}
      {showCustomForm && (
        <CustomMilestoneForm
          flow={flow}
          onClose={() => setShowCustomForm(false)}
          onCreated={() => { setShowCustomForm(false); fetchFlow() }}
        />
      )}
    </div>
  )
}
