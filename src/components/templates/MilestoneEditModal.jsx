import { useState } from 'react'
import { INPUT_CLASS, SELECT_CLASS } from '../../lib/formStyles'

const ASSIGNEE_OPTIONS = [
  { value: 'organiser',       label: 'Flow organiser (LoL)' },
  { value: 'class_teachers',  label: 'Class teachers' },
  { value: 'lol',             label: 'Leader of Learning' },
]

const RECIPIENT_OPTIONS = [
  { value: 'assignee_only',    label: 'Assignee only' },
  { value: 'assignee_and_lol', label: 'Assignee + LoL (CC)' },
]

export default function MilestoneEditModal({ milestone, onSave, onClose }) {
  const [title, setTitle]               = useState(milestone?.title ?? '')
  const [description, setDescription]   = useState(milestone?.description ?? '')
  const [offsetDays, setOffsetDays]     = useState(milestone?.offset_days ?? 0)
  const [stageNumber, setStageNumber]   = useState(milestone?.stage_number ?? 1)
  const [assigneeMode, setAssigneeMode] = useState(milestone?.assignee_mode ?? 'organiser')
  const [recipientMode, setRecipientMode] = useState(milestone?.recipient_mode ?? 'assignee_only')
  const [isReportingDue, setIsReportingDue]         = useState(milestone?.is_reporting_due ?? false)
  const [requiresAllTeachers, setRequiresAllTeachers] = useState(milestone?.requires_all_teachers ?? false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      ...(milestone ?? {}),
      title:                title.trim(),
      description:          description.trim() || null,
      offset_days:          Number(offsetDays),
      stage_number:         Number(stageNumber),
      assignee_mode:        assigneeMode,
      recipient_mode:       recipientMode,
      is_reporting_due:     isReportingDue,
      requires_all_teachers: assigneeMode === 'class_teachers' ? requiresAllTeachers : false,
    })
  }

  const offsetHint = (() => {
    const n = Number(offsetDays)
    if (n === 0)  return 'On assessment day'
    if (n < 0)    return `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} before assessment`
    return `${n} day${n === 1 ? '' : 's'} after assessment`
  })()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-lg bg-white p-6 dark:bg-[#161b27]"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {milestone ? 'Edit milestone' : 'Add milestone'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} />
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Description (optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#0f1117] dark:text-slate-200"
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Stage</span>
            <select value={stageNumber} onChange={(e) => setStageNumber(e.target.value)} className={SELECT_CLASS}>
              <option value={1}>Stage 1</option>
              <option value={2}>Stage 2</option>
              <option value={3}>Stage 3</option>
              <option value={4}>Stage 4</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Offset days</span>
            <input
              type="number"
              value={offsetDays}
              onChange={(e) => setOffsetDays(e.target.value)}
              className={INPUT_CLASS}
            />
            <p className="mt-0.5 text-xs text-slate-400">{offsetHint}</p>
          </label>
        </div>

        <label className="mt-3 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Assigned to</span>
          <select value={assigneeMode} onChange={(e) => setAssigneeMode(e.target.value)} className={SELECT_CLASS}>
            {ASSIGNEE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Email recipients</span>
          <select value={recipientMode} onChange={(e) => setRecipientMode(e.target.value)} className={SELECT_CLASS}>
            {RECIPIENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isReportingDue}
            onChange={(e) => setIsReportingDue(e.target.checked)}
            className="rounded border-slate-300"
          />
          <span className="text-slate-600 dark:text-slate-300">Mark as "Reporting due" milestone</span>
        </label>

        {assigneeMode === 'class_teachers' && (
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiresAllTeachers}
              onChange={(e) => setRequiresAllTeachers(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-slate-600 dark:text-slate-300">
              Require sign-off from <strong>all</strong> class teachers
            </span>
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-[#e5e7eb] px-3 py-2 text-sm dark:border-white/[0.08] dark:text-slate-300">Cancel</button>
          <button type="submit" disabled={!title.trim()} className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60">Save</button>
        </div>
      </form>
    </div>
  )
}
