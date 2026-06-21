import { useNavigate } from 'react-router-dom'
import ProgressBar from '../ui/ProgressBar'

export default function FlowCard({ flow }) {
  const navigate = useNavigate()
  const steps = flow.flow_steps ?? []
  const totalSteps = steps.length
  const completedSteps = steps.filter((s) => (s.step_completions?.length ?? 0) > 0).length
  const progress = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0
  const today = new Date().toISOString().slice(0, 10)
  const overdueSteps = steps.filter((s) => {
    const isCompleted = (s.step_completions?.length ?? 0) > 0
    return !isCompleted && s.due_date && s.due_date < today
  }).length

  return (
    <button
      type="button"
      onClick={() => navigate(`/flows/${flow.id}`)}
      className="flex w-full flex-col gap-3 rounded-lg border border-[#e5e7eb] bg-white p-4 text-left hover:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{flow.title}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {flow.faculties?.name ?? 'Unknown faculty'} · Year {flow.year_level}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {flow.template_type === 'rubric' ? 'Rubric-based' : 'Comment-based'}
        </span>
      </div>

      <ProgressBar percent={progress} />

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{completedSteps}/{totalSteps} steps complete</span>
        {overdueSteps > 0 && <span className="font-medium text-red-500">{overdueSteps} overdue</span>}
        <span>Due {new Date(flow.anchor_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
      </div>
    </button>
  )
}
