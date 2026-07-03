import { useNavigate } from 'react-router-dom'
import StatusBadge from '../ui/StatusBadge'
import { getMilestoneStatus } from '../../lib/milestoneStatus'

const fmt = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

function daysLabel(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${dateStr}T00:00:00`)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due - today) / 86400000)
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, color: 'text-red-500 dark:text-red-400' }
  if (diff === 0) return { text: 'Today', color: 'text-orange-500 dark:text-orange-400' }
  if (diff === 1) return { text: 'Tomorrow', color: 'text-orange-400 dark:text-orange-300' }
  return { text: `${diff}d`, color: 'text-slate-400 dark:text-slate-500' }
}

export default function TaskQueue({ flows, profile, onToggle, isLol = false }) {
  const navigate = useNavigate()

  const tasks = flows
    .flatMap((flow) =>
      (flow.flow_milestones ?? [])
        .filter((m) => {
          if (m.completed_at) return false
          if (isLol) {
            const isMember = (flow.flow_members ?? []).some((mem) => mem.user_id === profile?.id)
            return (
              m.assignee_mode === 'lol' ||
              (m.assignee_mode === 'class_teachers' && isMember) ||
              (m.assignee_mode === 'organiser' && flow.created_by === profile?.id)
            )
          }
          return (
            m.assignee_mode === 'class_teachers' ||
            (m.assignee_mode === 'organiser' && flow.created_by === profile?.id)
          )
        })
        .map((m) => ({ ...m, flow }))
    )
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    })

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-[#e5e7eb] bg-white p-8 text-center dark:border-white/[0.08] dark:bg-white/[0.04]">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">All done</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">No incomplete tasks assigned to you.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white divide-y divide-[#e5e7eb] dark:border-white/[0.08] dark:bg-white/[0.04] dark:divide-white/[0.08]">
      {tasks.map((task) => {
        const status = getMilestoneStatus(task)
        const isSigned = task.requires_all_teachers
          ? (task.milestone_sign_offs ?? []).some((s) => s.user_id === profile?.id)
          : false
        const isChecked = isSigned || !!task.completed_at
        const dayInfo = !isChecked ? daysLabel(task.due_date) : null

        return (
          <div
            key={task.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{ opacity: isChecked ? 0.55 : 1 }}
          >
            <div className="shrink-0 flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => onToggle(task, task.flow)}
              className="flex h-4 w-4 items-center justify-center rounded border-2 transition-colors"
              style={{
                background: isChecked ? 'var(--ok)' : 'transparent',
                borderColor: isChecked ? 'var(--ok)' : 'var(--border-strong, #cbd5e1)',
              }}
            >
              {isChecked && (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" className="h-2.5 w-2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            {dayInfo && (
              <span className={`text-[9px] font-semibold leading-none ${dayInfo.color}`}>
                {dayInfo.text}
              </span>
            )}
            </div>

            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => navigate(`/flows/${task.flow.id}`)}
            >
              <p
                className="truncate text-sm text-slate-900 dark:text-slate-100"
                style={{ textDecoration: isChecked ? 'line-through' : 'none' }}
              >
                {task.title}
              </p>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                {task.flow.title}
                {task.flow.subjects?.name ? ` · ${task.flow.subjects.name}` : ''}
                {task.due_date ? ` · Due ${fmt(task.due_date)}` : ''}
              </p>
            </button>

            <StatusBadge status={status} />
          </div>
        )
      })}
    </div>
  )
}
