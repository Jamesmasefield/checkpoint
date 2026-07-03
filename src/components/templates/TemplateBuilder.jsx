import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import MilestoneEditModal from './MilestoneEditModal'
import { ASSIGNEE_LABEL } from '../../lib/milestoneStatus'

const STAGE_COLORS = { 1: 'text-green-600', 2: 'text-blue-600', 3: 'text-amber-600', 4: 'text-rose-500' }

function MilestoneRow({ milestone, index, total, onEdit, onDelete, onMove }) {
  const isFirst = index === 0
  const isLast  = index === total - 1

  const offsetLabel = (() => {
    const n = milestone.offset_days
    if (n === 0)  return 'Day of'
    if (n < 0)    return `${Math.abs(n)}d before`
    return `+${n}d`
  })()

  return (
    <div className="flex items-center gap-2 rounded-md border border-[#e5e7eb] px-3 py-2 dark:border-white/[0.08]">
      {/* Reorder */}
      <div className="flex shrink-0 flex-col gap-0.5">
        <button type="button" onClick={() => onMove(index, -1)} disabled={isFirst} className="text-slate-300 hover:text-slate-600 disabled:opacity-20 dark:text-slate-600 dark:hover:text-slate-300">▲</button>
        <button type="button" onClick={() => onMove(index, 1)}  disabled={isLast}  className="text-slate-300 hover:text-slate-600 disabled:opacity-20 dark:text-slate-600 dark:hover:text-slate-300">▼</button>
      </div>

      {/* Stage colour dot */}
      <span className={`shrink-0 text-xs font-bold ${STAGE_COLORS[milestone.stage_number] ?? 'text-slate-400'}`}>
        S{milestone.stage_number}
      </span>

      {/* Title */}
      <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{milestone.title}</span>

      {/* Meta */}
      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-white/10 dark:text-slate-400">
        {offsetLabel}
      </span>
      <span className="shrink-0 text-xs text-slate-400">{ASSIGNEE_LABEL[milestone.assignee_mode] ?? milestone.assignee_mode}</span>

      {milestone.is_reporting_due && (
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Reporting due
        </span>
      )}
      {milestone.requires_all_teachers && (
        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          All teachers
        </span>
      )}

      {/* Actions */}
      <button type="button" onClick={() => onEdit(milestone)} className="shrink-0 rounded-md bg-[#4f6ef7] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#3d5ce5] active:bg-[#3251d4]">Edit</button>
      <button type="button" onClick={() => onDelete(milestone)} className="shrink-0 rounded-md bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 active:bg-red-700">✕</button>
    </div>
  )
}

export default function TemplateBuilder({ template, onClose, onSaved }) {
  // Work on a local draft of milestones. Changes are saved to DB only on "Save changes" click.
  const [name, setName] = useState(template.name)
  const [milestones, setMilestones] = useState(
    [...(template.template_milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  )
  const [editingMilestone, setEditingMilestone] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleMove(index, direction) {
    const next = [...milestones]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= next.length) return
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    setMilestones(next.map((m, i) => ({ ...m, sort_order: i + 1 })))
  }

  function handleEdit(milestone) {
    setEditingMilestone(milestone)
    setAddingNew(false)
  }

  function handleDelete(milestone) {
    setMilestones((prev) => prev.filter((m) => m !== milestone).map((m, i) => ({ ...m, sort_order: i + 1 })))
  }

  function handleSaveMilestone(data) {
    if (addingNew) {
      setMilestones((prev) => [
        ...prev,
        { ...data, sort_order: prev.length + 1, _new: true, id: `new_${Date.now()}` },
      ])
    } else {
      setMilestones((prev) =>
        prev.map((m) => (m === editingMilestone ? { ...m, ...data } : m))
      )
    }
    setEditingMilestone(null)
    setAddingNew(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    // Update template name.
    const { error: nameErr } = await supabase
      .from('templates')
      .update({ name })
      .eq('id', template.id)

    if (nameErr) { setError(nameErr.message); setSaving(false); return }

    // Delete all existing milestones and re-insert (simplest way to handle reorders + edits).
    await supabase.from('template_milestones').delete().eq('template_id', template.id)

    const rows = milestones.map(({ id: _id, _new, ...m }, i) => ({
      template_id:           template.id,
      title:                 m.title,
      description:           m.description,
      offset_days:           m.offset_days,
      stage_number:          m.stage_number,
      sort_order:            i + 1,
      assignee_mode:         m.assignee_mode,
      recipient_mode:        m.recipient_mode,
      is_reporting_due:      m.is_reporting_due,
      requires_all_teachers: m.requires_all_teachers ?? false,
    }))

    const { error: insertErr } = await supabase.from('template_milestones').insert(rows)
    setSaving(false)
    if (insertErr) { setError(insertErr.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white dark:bg-[#161b27]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4 dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-transparent bg-transparent text-sm font-medium text-slate-900 outline-none focus:border-[#4f6ef7] focus:bg-white dark:text-slate-100 dark:focus:bg-white/5 px-2 py-1"
            />
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-white/10 dark:text-slate-400">
              {template.template_type === 'rubric' ? 'Rubric-based' : 'Comment-based'}
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        {/* Milestone list */}
        <div className="flex-1 space-y-1.5 overflow-y-auto px-5 py-4">
          {milestones.length === 0 && (
            <p className="text-sm text-slate-400">No milestones yet — add one below.</p>
          )}
          {milestones.map((m, i) => (
            <MilestoneRow
              key={m.id ?? i}
              milestone={m}
              index={i}
              total={milestones.length}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMove={handleMove}
            />
          ))}
        </div>

        {error && <p className="px-5 pb-2 text-xs text-red-500">{error}</p>}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#e5e7eb] px-5 py-4 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => { setAddingNew(true); setEditingMilestone({}) }}
            className="text-sm text-[#4f6ef7] hover:underline"
          >
            + Add milestone
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-[#e5e7eb] px-3 py-2 text-sm dark:border-white/[0.08] dark:text-slate-300">Cancel</button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-[#4f6ef7] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Milestone edit modal */}
      {editingMilestone && (
        <MilestoneEditModal
          milestone={addingNew ? null : editingMilestone}
          onSave={handleSaveMilestone}
          onClose={() => { setEditingMilestone(null); setAddingNew(false) }}
        />
      )}
    </div>
  )
}
