import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { calculateDueDate } from '../../lib/deadlines'
import { SELECT_CLASS, INPUT_CLASS } from '../../lib/formStyles'

// Same generic stage names/colours used in FlowPage's STAGES constant.
const STAGES = [
  { number: 1, title: 'Task Creation & Setup' },
  { number: 2, title: 'Platform Setup' },
  { number: 3, title: 'Submission & Marking' },
  { number: 4, title: 'Comments & Publishing' },
]

const ROLE_LABELS = ['LoL', 'Assistant LoL', 'Course Delegate', 'Classroom Teacher']

function nextStepNumber(existingSteps) {
  const max = existingSteps.reduce((acc, s) => {
    const match = /^(\d+)/.exec(s.step_number ?? '')
    const n = match ? parseInt(match[1], 10) : 0
    return Math.max(acc, n)
  }, 0)
  return String(max + 1)
}

export default function CustomStepForm({ flow, onClose, onCreated }) {
  const [description, setDescription] = useState('')
  const [stageNumber, setStageNumber] = useState(1)
  const [roles, setRoles] = useState([])
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Suggest a due date from the same trigger-phrase logic as templated
  // steps whenever the stage changes — the LoL can freely override it.
  useEffect(() => {
    setDueDate(calculateDueDate(flow.anchor_date, '', stageNumber))
  }, [flow.anchor_date, stageNumber])

  const toggleRole = (label) => {
    setRoles((prev) => (prev.includes(label) ? prev.filter((r) => r !== label) : [...prev, label]))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim() || roles.length === 0 || !dueDate) {
      setError('Description, responsibility, and due date are required.')
      return
    }

    setSubmitting(true)
    setError('')

    const { error: insertError } = await supabase.from('flow_steps').insert({
      flow_id: flow.id,
      stage_number: stageNumber,
      step_number: nextStepNumber(flow.flow_steps ?? []),
      description: description.trim(),
      default_role: roles.join(' / '),
      due_date: dueDate,
      assigned_to: assignedTo || null,
      is_custom: true,
      sort_order: (flow.flow_steps ?? []).length + 1,
    })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-lg bg-white p-6 dark:bg-[#161b27]"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Add custom step</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            ✕
          </button>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What needs to happen?"
            className={INPUT_CLASS}
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Stage</span>
            <select value={stageNumber} onChange={(e) => setStageNumber(Number(e.target.value))} className={SELECT_CLASS}>
              {STAGES.map((s) => (
                <option key={s.number} value={s.number}>
                  Stage {s.number} — {s.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Due date</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={INPUT_CLASS} />
          </label>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm text-slate-600 dark:text-slate-300">Responsibility</legend>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {ROLE_LABELS.map((label) => (
              <label key={label} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={roles.includes(label)}
                  onChange={() => toggleRole(label)}
                  className="h-4 w-4 rounded border-slate-300 text-[#4f6ef7] focus:ring-[#4f6ef7]"
                />
                <span className="text-slate-700 dark:text-slate-200">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Assigned to (optional)</span>
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={SELECT_CLASS}>
            <option value="">Unassigned</option>
            {(flow.flow_members ?? []).map((m) => (
              <option key={m.id} value={m.user_id}>
                {m.profile?.full_name ?? m.profile?.email}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add step'}
        </button>
      </form>
    </div>
  )
}
