import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getMilestoneStatus, ASSIGNEE_LABEL } from '../../lib/milestoneStatus'
import StatusBadge from '../ui/StatusBadge'

const fmt = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

// Derive the resolved assignee display names from flow context.
function resolveAssignees(milestone) {
  switch (milestone.assignee_mode) {
    case 'organiser':      return ['Flow organiser']
    case 'class_teachers': return ['Class teachers']
    case 'lol':            return ['Leader of Learning']
    default:               return [ASSIGNEE_LABEL[milestone.assignee_mode] ?? milestone.assignee_mode]
  }
}

function Checkbox({ checked, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
        checked
          ? 'border-green-500 bg-green-500'
          : 'border-slate-300 dark:border-white/20'
      } ${disabled ? 'cursor-default' : 'hover:border-green-400'}`}
    >
      {checked && (
        <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5 text-white">
          <path d="M1.5 5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export default function MilestoneDetailPanel({ milestone, flow, profile, userId, readOnly, onClose, onToggle, onSaved, onDeleteMilestone }) {
  const canWrite = !readOnly && (profile?.role === 'admin' || profile?.role === 'lol')
  const status = getMilestoneStatus(milestone)
  const isCompleted = !!milestone.completed_at
  const isMultiSignOff = milestone.requires_all_teachers && milestone.assignee_mode === 'class_teachers'

  // Named roster of class teachers tagged to the flow — the full set of
  // people expected to sign off, so pending (not-yet-signed) teachers can be
  // shown by name alongside those who have already signed.
  const classTeachers = (flow?.flow_members ?? [])
    .filter((m) => m.role_in_flow === 'class_teacher' && m.profiles)
    .map((m) => m.profiles)

  const [dueDate, setDueDate] = useState(milestone.due_date ?? '')
  const [reminderDate, setReminderDate] = useState(milestone.reminder_date ?? milestone.due_date ?? '')
  const [notes, setNotes] = useState(milestone.notes ?? '')
  const [emailSubject, setEmailSubject] = useState(milestone.email_subject ?? '')
  const [emailBody, setEmailBody] = useState(milestone.email_body ?? '')
  const [remindersEnabled, setRemindersEnabled] = useState(milestone.reminders_enabled ?? true)
  const [savingDate, setSavingDate] = useState(false)
  const [savingReminderDate, setSavingReminderDate] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [reminderLog, setReminderLog] = useState([])
  const [sendingReminder, setSendingReminder] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [signOffSaving, setSignOffSaving] = useState(false)

  const notesTimer = useRef(null)

  const fetchReminderLog = useCallback(() => {
    supabase
      .from('reminder_log')
      .select('id, sent_at, trigger_type, days_before, recipient:profiles!reminder_log_recipient_id_fkey(full_name, email)')
      .eq('flow_milestone_id', milestone.id)
      .order('sent_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setReminderLog(data ?? []))
  }, [milestone.id])

  useEffect(() => {
    fetchReminderLog()
    return () => clearTimeout(notesTimer.current)
  }, [fetchReminderLog])

  // Reset local state when milestone prop changes (panel navigated to different milestone).
  useEffect(() => {
    setDueDate(milestone.due_date ?? '')
    setReminderDate(milestone.reminder_date ?? milestone.due_date ?? '')
    setNotes(milestone.notes ?? '')
    setEmailSubject(milestone.email_subject ?? '')
    setEmailBody(milestone.email_body ?? '')
    setRemindersEnabled(milestone.reminders_enabled ?? true)
    setSendResult(null)
  }, [milestone.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveDueDate = async (value) => {
    if (!canWrite) return
    setSavingDate(true)
    const prevDue = milestone.due_date ?? ''
    const update = { due_date: value || null }
    // Keep reminder_date in sync when it was matching the old due date
    if (reminderDate === prevDue || !reminderDate) {
      update.reminder_date = value || null
      setReminderDate(value)
    }
    await supabase.from('flow_milestones').update(update).eq('id', milestone.id)
    setSavingDate(false)
  }

  const saveReminderDate = async (value) => {
    if (!canWrite) return
    setSavingReminderDate(true)
    await supabase.from('flow_milestones').update({ reminder_date: value || null }).eq('id', milestone.id)
    setSavingReminderDate(false)
  }

  const saveNotes = async (value) => {
    if (!canWrite) return
    setSavingNotes(true)
    await supabase.from('flow_milestones').update({ notes: value }).eq('id', milestone.id)
    setSavingNotes(false)
  }

  const handleNotesChange = (value) => {
    setNotes(value)
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => saveNotes(value), 800)
  }

  const saveEmailTemplate = async () => {
    if (!canWrite) return
    await supabase.from('flow_milestones').update({ email_subject: emailSubject, email_body: emailBody }).eq('id', milestone.id)
  }

  const toggleRemindersEnabled = async () => {
    if (!canWrite) return
    const next = !remindersEnabled
    setRemindersEnabled(next)
    await supabase.from('flow_milestones').update({ reminders_enabled: next }).eq('id', milestone.id)
  }

  const handleSendReminder = async () => {
    if (!canWrite || !remindersEnabled) return
    setSendingReminder(true)
    setSendResult(null)

    if (emailSubject !== (milestone.email_subject ?? '') || emailBody !== (milestone.email_body ?? '')) {
      await supabase.from('flow_milestones').update({ email_subject: emailSubject, email_body: emailBody }).eq('id', milestone.id)
    }

    try {
      const { error } = await supabase.functions.invoke('send-reminders', {
        body: { flow_milestone_id: milestone.id },
      })
      if (error) {
        const detail = await error.context?.json?.().catch(() => null)
        setSendResult({ ok: false, msg: detail?.error ?? error.message ?? 'Send failed' })
      } else {
        setSendResult({ ok: true, msg: 'Reminder sent.' })
        fetchReminderLog()
      }
    } catch (err) {
      setSendResult({ ok: false, msg: err instanceof Error ? err.message : String(err) })
    }
    setSendingReminder(false)
  }

  // Toggle an individual teacher's sign-off row.
  const handleSignOffToggle = async (teacherId) => {
    if (readOnly) return
    const isSelf = teacherId === userId
    if (!isSelf && !canWrite) return  // Teachers can only toggle their own sign-off

    setSignOffSaving(true)

    const existingSignOff = (milestone.milestone_sign_offs ?? []).find((s) => s.user_id === teacherId)

    if (existingSignOff) {
      await supabase.from('milestone_sign_offs')
        .delete()
        .eq('flow_milestone_id', milestone.id)
        .eq('user_id', teacherId)
      // Clear overall completion since at least one teacher is no longer signed off.
      if (isCompleted) {
        await supabase.from('flow_milestones')
          .update({ completed_at: null, completed_by: null })
          .eq('id', milestone.id)
      }
    } else {
      await supabase.from('milestone_sign_offs')
        .insert({ flow_milestone_id: milestone.id, user_id: teacherId })

      // Auto-complete once every named class teacher on the flow has signed off.
      const signedAfter = (milestone.milestone_sign_offs ?? []).length + 1
      if (signedAfter >= classTeachers.length) {
        await supabase.from('flow_milestones')
          .update({ completed_at: new Date().toISOString(), completed_by: teacherId })
          .eq('id', milestone.id)
      }
    }

    setSignOffSaving(false)
    onSaved()
  }

  // LoL/admin override: force-complete or clear without waiting for all sign-offs.
  const handleOverrideComplete = async () => {
    if (!canWrite) return
    await supabase.from('flow_milestones')
      .update({ completed_at: new Date().toISOString(), completed_by: userId })
      .eq('id', milestone.id)
    onSaved()
  }

  const handleOverrideClear = async () => {
    if (!canWrite) return
    await supabase.from('flow_milestones')
      .update({ completed_at: null, completed_by: null })
      .eq('id', milestone.id)
    onSaved()
  }

  const assignees = resolveAssignees(milestone)
  const signOffs = milestone.milestone_sign_offs ?? []
  const signOffByUserId = new Map(signOffs.map((s) => [s.user_id, s]))
  const signedCount = signOffs.length
  const classCount = classTeachers.length
  const currentUserSigned = signOffByUserId.has(userId)

  return (
    <div className="fixed right-0 top-0 z-40 flex h-screen w-full max-w-md flex-col border-l border-[#e5e7eb] bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#161b27]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4 dark:border-white/[0.08]">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Stage {milestone.stage_number} · {ASSIGNEE_LABEL[milestone.assignee_mode] ?? milestone.assignee_mode}
          </p>
          <h3 className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{milestone.title}</h3>
          {milestone.description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{milestone.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Status + assignees */}
        <div className="flex items-center justify-between">
          <StatusBadge status={status} />
          <div className="text-right">
            <p className="text-xs text-slate-400 dark:text-slate-500">Assigned to</p>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {assignees.join(', ')}
            </p>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Due date</label>
          <div className="mt-1 flex gap-2">
            <input
              type="date"
              value={dueDate}
              disabled={!canWrite}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={(e) => saveDueDate(e.target.value)}
              className="flex-1 rounded-md border border-[#e5e7eb] p-2 text-sm outline-none focus:border-[#4f6ef7] disabled:bg-slate-50 disabled:text-slate-400 dark:border-white/[0.08] dark:bg-transparent dark:text-slate-200 dark:disabled:bg-transparent"
            />
            {savingDate && <span className="self-center text-xs text-slate-400">Saving…</span>}
          </div>
        </div>

        {/* Reminder date */}
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Reminder date</label>
          <div className="mt-1 flex gap-2">
            <input
              type="date"
              value={reminderDate}
              disabled={!canWrite}
              onChange={(e) => setReminderDate(e.target.value)}
              onBlur={(e) => saveReminderDate(e.target.value)}
              max={dueDate || undefined}
              className="flex-1 rounded-md border border-[#e5e7eb] p-2 text-sm outline-none focus:border-[#4f6ef7] disabled:bg-slate-50 disabled:text-slate-400 dark:border-white/[0.08] dark:bg-transparent dark:text-slate-200 dark:disabled:bg-transparent"
            />
            {savingReminderDate && <span className="self-center text-xs text-slate-400">Saving…</span>}
          </div>
          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
            {reminderDate && dueDate && reminderDate < dueDate
              ? `Reminder sends ${Math.round((new Date(`${dueDate}T00:00:00`) - new Date(`${reminderDate}T00:00:00`)) / 86400000)} days before due`
              : 'Defaults to due date if not set'}
          </p>
        </div>

        {isMultiSignOff ? (
          /* ── Multi-sign-off section ── */
          <div className="space-y-3">
            {/* Count summary */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Teacher sign-offs</p>
              <span className={`text-xs font-medium ${classCount > 0 && signedCount >= classCount ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {signedCount}/{classCount} teachers signed off
                {isCompleted && <span className="ml-1">· Complete</span>}
              </span>
            </div>

            {/* Full roster: every class teacher tagged to this flow, signed or pending */}
            {classTeachers.length === 0 ? (
              <p className="text-xs text-slate-400">No class teachers are tagged to this flow yet.</p>
            ) : (
              <ul className="divide-y divide-[#e5e7eb] rounded-md border border-[#e5e7eb] dark:divide-white/[0.08] dark:border-white/[0.08]">
                {classTeachers
                  .slice()
                  .sort((a, b) => (a.full_name ?? a.email ?? '').localeCompare(b.full_name ?? b.email ?? ''))
                  .map((teacher) => {
                    const isSelf = teacher.id === userId
                    const signOff = signOffByUserId.get(teacher.id)
                    const signed = !!signOff
                    const canToggle = !readOnly && (isSelf || canWrite)
                    return (
                      <li key={teacher.id} className="flex items-center gap-3 px-3 py-2">
                        <Checkbox
                          checked={signed}
                          onClick={() => canToggle && !signOffSaving && handleSignOffToggle(teacher.id)}
                          disabled={!canToggle || signOffSaving}
                        />
                        <span className={`min-w-0 flex-1 text-xs ${signed ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                          {teacher.full_name ?? teacher.email ?? 'Unknown'}
                          {isSelf && <span className="ml-1 text-slate-400">(you)</span>}
                        </span>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {signed ? fmt(signOff.signed_at.slice(0, 10)) : 'Pending'}
                        </span>
                      </li>
                    )
                  })}
              </ul>
            )}

            {/* LoL override controls */}
            {canWrite && (
              <div>
                {isCompleted ? (
                  <button
                    type="button"
                    onClick={handleOverrideClear}
                    className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Clear completion (override)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOverrideComplete}
                    className="text-xs text-amber-600 underline hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    Force complete (override)
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── Standard single-person completion section ── */
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completion</p>
            {isCompleted ? (
              <div className="mt-1 flex items-center justify-between rounded-md bg-green-50 px-3 py-2 dark:bg-green-900/20">
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-300">
                    Completed by {milestone.completed_by_profile?.full_name ?? 'someone'}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">{fmt(milestone.completed_at.slice(0, 10))}</p>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onToggle(milestone)}
                    className="text-xs text-green-600 underline hover:text-green-800 dark:text-green-400"
                  >
                    Undo
                  </button>
                )}
              </div>
            ) : (
              !readOnly && (
                <button
                  type="button"
                  onClick={() => onToggle(milestone)}
                  className="mt-1 w-full rounded-md border border-[#e5e7eb] py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/5"
                >
                  Mark complete
                </button>
              )
            )}
          </div>
        )}

        {/* LoL notes (canWrite only) */}
        {canWrite && (
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
              LoL notes {savingNotes && <span className="text-slate-400">(saving…)</span>}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes visible to all LoLs and admins…"
              className="mt-1 w-full rounded-md border border-[#e5e7eb] p-2 text-sm outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-transparent dark:text-slate-200 dark:placeholder-slate-600"
            />
          </div>
        )}

        {/* Reminder email */}
        {canWrite && (
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Reminder email
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={remindersEnabled}
                  onChange={toggleRemindersEnabled}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#4f6ef7] focus:ring-[#4f6ef7] dark:border-white/20"
                />
                Send reminder emails
              </label>
            </div>
            {!remindersEnabled && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Reminders are off for this step — no automatic or manual emails will be sent.
              </p>
            )}
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject…"
              className="mt-2 w-full rounded-md border border-[#e5e7eb] p-2 text-sm outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-transparent dark:text-slate-200 dark:placeholder-slate-600"
            />
            <textarea
              rows={8}
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Email body…"
              className="mt-1.5 w-full rounded-md border border-[#e5e7eb] p-2 font-mono text-xs leading-relaxed outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-transparent dark:text-slate-200 dark:placeholder-slate-600"
            />
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
              Variables: {'{{first_name}}'}, {'{{lol_name}}'}, {'{{assessment_title}}'}, {'{{course_name}}'}, {'{{step_due_date}}'}, {'{{checkpoint_link}}'}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={saveEmailTemplate}
                className="rounded-md border border-[#e5e7eb] px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/5"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={sendingReminder || isCompleted || !remindersEnabled}
                title={!remindersEnabled ? 'Reminders are off for this step' : undefined}
                className="rounded-md bg-[#4f6ef7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3d5ce4] disabled:opacity-50"
              >
                {sendingReminder ? 'Sending…' : 'Send reminder now'}
              </button>
            </div>
            {sendResult && (
              <p className={`mt-2 text-xs ${sendResult.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {sendResult.ok ? '✓ ' : '✗ '}{sendResult.msg}
              </p>
            )}
          </div>
        )}

        {/* Reminder history */}
        {reminderLog.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Reminder history</p>
            <ul className="mt-1 space-y-1">
              {reminderLog.map((r) => (
                <li key={r.id} className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {r.trigger_type === 'manual' ? 'Manual' : `Auto (${r.days_before}d before)`} →{' '}
                    {r.recipient?.full_name ?? r.recipient?.email ?? 'unknown'}
                  </span>
                  <span>{new Date(r.sent_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Remove milestone (custom only) */}
        {canWrite && milestone.is_custom && (
          <div className="border-t border-[#e5e7eb] pt-4 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Remove this custom milestone?')) onDeleteMilestone(milestone)
              }}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
            >
              Remove milestone
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
