import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

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

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TaskDetailPanel({
  step,
  profile,
  readOnly,
  flowMembers,
  onClose,
  onToggle,
  onDeleteStep,
  onSaveReminderEmailBody,
  onSaveAssignment,
  onSaveDueDate,
}) {
  const { user } = useAuth()
  const [reminderEmailBody, setReminderEmailBody] = useState(step.reminder_email_body ?? '')
  const [savingEmail, setSavingEmail] = useState(false)
  const [dueDate, setDueDate] = useState(step.due_date ?? '')

  const [notes, setNotes] = useState([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const [reminders, setReminders] = useState([])
  const [loadingReminders, setLoadingReminders] = useState(true)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [sendResult, setSendResult] = useState('')

  const canManage = !readOnly && (profile?.role === 'admin' || profile?.role === 'lol' || profile?.role === 'assistant_lol')
  const isCompleted = (step.step_completions?.length ?? 0) > 0
  const completion = step.step_completions?.[0]

  useEffect(() => {
    setReminderEmailBody(step.reminder_email_body ?? '')
  }, [step.id, step.reminder_email_body])

  useEffect(() => {
    setDueDate(step.due_date ?? '')
  }, [step.id, step.due_date])

  const fetchNotes = useCallback(() => {
    setLoadingNotes(true)
    return supabase
      .from('step_notes')
      .select('id, body, created_at, author:profiles ( full_name, email )')
      .eq('step_id', step.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('TaskDetailPanel notes fetch error:', error)
          setNotes([])
        } else {
          setNotes(data)
        }
        setLoadingNotes(false)
      })
  }, [step.id])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const fetchReminders = useCallback(() => {
    setLoadingReminders(true)
    return supabase
      .from('reminder_log')
      .select('id, sent_at, trigger_type')
      .eq('step_id', step.id)
      .order('sent_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('TaskDetailPanel reminders fetch error:', error)
          setReminders([])
        } else {
          setReminders(data)
        }
        setLoadingReminders(false)
      })
  }, [step.id])

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    await supabase.from('step_notes').insert({ step_id: step.id, author_id: user.id, body: newNote.trim() })
    setNewNote('')
    setAddingNote(false)
    fetchNotes()
  }

  const handleDeleteNote = async (noteId) => {
    await supabase.from('step_notes').delete().eq('id', noteId)
    fetchNotes()
  }

  const handleDeleteAllNotes = async () => {
    if (!window.confirm('Delete all notes on this step? This cannot be undone.')) return
    await supabase.from('step_notes').delete().eq('step_id', step.id)
    fetchNotes()
  }

  const handleSaveEmail = async () => {
    setSavingEmail(true)
    await onSaveReminderEmailBody(step, reminderEmailBody)
    setSavingEmail(false)
  }

  const handleRemoveStep = () => {
    if (!window.confirm('Remove this step from the flow? This cannot be undone.')) return
    onDeleteStep(step)
  }

  const handleSendReminderNow = async () => {
    setSendingReminder(true)
    setSendResult('')
    // The Edge Function reads reminder_email_body fresh from the database —
    // save any unsaved draft first so "send" actually uses what's in the box.
    if (reminderEmailBody !== (step.reminder_email_body ?? '')) {
      await onSaveReminderEmailBody(step, reminderEmailBody)
    }
    const { data, error } = await supabase.functions.invoke('send-reminders', { body: { step_id: step.id } })
    setSendingReminder(false)
    if (error) {
      // supabase-js's generic "non-2xx status code" message hides the
      // actual error our function returned in its JSON body — read it
      // directly off the underlying Response (error.context) instead.
      const detail = await error.context?.json?.().catch(() => null)
      setSendResult(`Failed to send: ${detail?.error ?? error.message}`)
      return
    }
    if (data?.skipped) {
      setSendResult(`Not sent: ${data.skipped}`)
      return
    }
    setSendResult(`Sent to ${data?.recipient ?? 'recipient'}.`)
    fetchReminders()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 dark:bg-[#161b27]"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Step {step.step_number}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            ✕
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{step.description}</p>

        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {step.default_role}
          </span>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-slate-500 dark:text-slate-400">Assigned to</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {canManage ? (
                <select
                  value={step.assigned_to ?? ''}
                  onChange={(e) => onSaveAssignment(step, e.target.value)}
                  className="appearance-none rounded-md border border-[#e5e7eb] bg-white p-1.5 text-sm text-slate-900 dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
                >
                  <option value="">Unassigned</option>
                  {flowMembers.map((m) => (
                    <option key={m.id} value={m.user_id}>
                      {m.profile?.full_name ?? m.profile?.email}
                    </option>
                  ))}
                </select>
              ) : (
                step.assigned_profile?.full_name ?? step.assigned_profile?.email ?? 'Unassigned'
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-slate-500 dark:text-slate-400">Due date</dt>
            <dd className="text-slate-700 dark:text-slate-200">
              {canManage ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={() => dueDate !== step.due_date && onSaveDueDate(step, dueDate)}
                  className="rounded-md border border-[#e5e7eb] bg-white p-1.5 text-sm text-slate-900 dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
                />
              ) : (
                formatDate(step.due_date)
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500 dark:text-slate-400">Status</dt>
            <dd className="text-slate-700 dark:text-slate-200">{isCompleted ? 'Complete' : 'Incomplete'}</dd>
          </div>
        </dl>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onToggle(step)}
            disabled={readOnly}
            className="flex-1 rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-white/5"
          >
            {isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
          </button>
          {canManage && (
            <button
              type="button"
              onClick={handleRemoveStep}
              className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Remove step
            </button>
          )}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</h3>
            {canManage && notes.length > 0 && (
              <button type="button" onClick={handleDeleteAllNotes} className="text-xs text-red-500 hover:underline">
                Delete all
              </button>
            )}
          </div>

          <ul className="mt-2 space-y-2">
            {!loadingNotes && notes.length === 0 && <li className="text-sm text-slate-400">No notes yet.</li>}
            {notes.map((note) => (
              <li key={note.id} className="rounded-md border border-[#e5e7eb] p-2 text-sm dark:border-white/[0.08]">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-slate-700 dark:text-slate-200">{note.body}</p>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="shrink-0 text-xs text-slate-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {note.author?.full_name ?? note.author?.email ?? 'Unknown'} · {formatDateTime(note.created_at)}
                </p>
              </li>
            ))}
          </ul>

          {canManage && (
            <div className="mt-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                placeholder="Add a note for this step…"
                className="w-full rounded-md border border-[#e5e7eb] p-2 text-sm outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-transparent dark:text-slate-200"
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="mt-2 rounded-md bg-[#4f6ef7] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {addingNote ? 'Adding…' : 'Add note'}
              </button>
            </div>
          )}
        </div>

        {canManage && (
          <div className="mt-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Reminder email message</h3>
            <p className="mt-1 text-xs text-slate-400">
              Draft text included in this step's reminder email, alongside the flow name, step details, due date, and
              footer (added automatically).
            </p>
            <textarea
              value={reminderEmailBody}
              onChange={(e) => setReminderEmailBody(e.target.value)}
              rows={3}
              placeholder="e.g. Please make sure this is completed before the marking deadline…"
              className="mt-2 w-full rounded-md border border-[#e5e7eb] p-2 text-sm outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-transparent dark:text-slate-200"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveEmail}
                disabled={savingEmail}
                className="rounded-md border border-[#e5e7eb] px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-white/5"
              >
                {savingEmail ? 'Saving…' : 'Save message'}
              </button>
              <button
                type="button"
                onClick={handleSendReminderNow}
                disabled={sendingReminder || !step.assigned_to}
                title={!step.assigned_to ? 'Assign this step to someone first' : undefined}
                className="rounded-md bg-[#4f6ef7] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {sendingReminder ? 'Sending…' : 'Send reminder now'}
              </button>
            </div>
            {sendResult && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{sendResult}</p>}
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Activity log</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {isCompleted && completion && (
              <li>
                Completed by{' '}
                {completion.completed_by_profile?.full_name ?? completion.completed_by_profile?.email ?? 'someone'} on{' '}
                {formatDateTime(completion.completed_at)}
                {completion.notes && <p className="text-xs text-slate-400">"{completion.notes}"</p>}
              </li>
            )}
            {!loadingReminders &&
              reminders.map((r) => (
                <li key={r.id}>
                  {r.trigger_type === 'manual' ? 'Manual' : 'Automatic'} reminder sent on {formatDateTime(r.sent_at)}
                </li>
              ))}
            {!isCompleted && !loadingReminders && reminders.length === 0 && (
              <li className="text-slate-400">No activity yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
