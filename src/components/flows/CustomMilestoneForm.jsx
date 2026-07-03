import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SELECT_CLASS, INPUT_CLASS } from '../../lib/formStyles'

const STAGES = [
  { value: 1, label: 'Stage 1 — Task Creation' },
  { value: 2, label: 'Stage 2 — Platform Setup' },
  { value: 3, label: 'Stage 3 — Submission & Marking' },
  { value: 4, label: 'Stage 4 — Comments & Publishing' },
]

export default function CustomMilestoneForm({ flow, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stage, setStage] = useState(1)
  const [assigneeMode, setAssigneeMode] = useState('class_teachers')
  const [recipientMode, setRecipientMode] = useState('assignee_and_lol')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError(null)

    // Place after the last existing milestone in this stage.
    const lastInStage = (flow.flow_milestones ?? [])
      .filter((m) => m.stage_number === stage)
      .sort((a, b) => b.sort_order - a.sort_order)[0]
    const sortOrder = (lastInStage?.sort_order ?? 0) + 10

    const { error: err } = await supabase.from('flow_milestones').insert({
      flow_id: flow.id,
      stage_number: stage,
      sort_order: sortOrder,
      title: title.trim(),
      description: description.trim() || null,
      assignee_mode: assigneeMode,
      recipient_mode: recipientMode,
      due_date: dueDate || null,
      is_custom: true,
    })

    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      onCreated()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-xl dark:border-white/[0.08] dark:bg-[#161b27]">
        <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Add custom milestone</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={INPUT_CLASS}
              placeholder="Milestone title"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Description (optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={INPUT_CLASS}
              placeholder="Additional context…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Stage</label>
              <select value={stage} onChange={(e) => setStage(Number(e.target.value))} className={SELECT_CLASS}>
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Assigned to</label>
              <select value={assigneeMode} onChange={(e) => setAssigneeMode(e.target.value)} className={SELECT_CLASS}>
                <option value="class_teachers">Class teachers</option>
                <option value="organiser">Flow organiser</option>
                <option value="lol">LoL</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Reminder to</label>
              <select value={recipientMode} onChange={(e) => setRecipientMode(e.target.value)} className={SELECT_CLASS}>
                <option value="assignee_and_lol">Assignee + LoL</option>
                <option value="assignee_only">Assignee only</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#e5e7eb] px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#4f6ef7] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d5ce4] disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
