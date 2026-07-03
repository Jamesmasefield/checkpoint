import { useNavigate } from 'react-router-dom'
import { getFlowUrgency } from '../../lib/milestoneStatus'

const CIRC = 2 * Math.PI * 25 // ring circumference for r=25

const URGENCY_COLOR = {
  green: 'text-green-500',
  amber: 'text-amber-500',
  red:   'text-red-500',
  slate: 'text-slate-400 dark:text-slate-500',
}

function getNextStepLabel(milestones) {
  const today = new Date().toISOString().slice(0, 10)
  const next = milestones
    .filter((m) => !m.completed_at && m.due_date && m.due_date >= today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0]
  if (!next) return null
  const days = Math.ceil((new Date(`${next.due_date}T00:00:00`) - new Date()) / 86400000)
  if (days === 0) return 'Next step due today'
  if (days === 1) return 'Next step due tomorrow'
  return `Next step in ${days} days`
}

export default function FlowCard({ flow, onDelete }) {
  const navigate = useNavigate()
  const milestones = flow.flow_milestones ?? []
  const total = milestones.length
  const completed = milestones.filter((m) => !!m.completed_at).length
  const progress = total ? Math.round((completed / total) * 100) : 0
  const urgency = getFlowUrgency(milestones, flow.anchor_date ?? null)
  const nextStepLabel = getNextStepLabel(milestones)

  const subjectName = flow.subjects?.name ?? ''
  const facultyName = flow.faculties?.name ?? ''
  const yearLevel   = flow.courses?.year_level ?? null

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => navigate(`/flows/${flow.id}`)}
        className="flex w-full flex-col gap-3 rounded-lg border border-[#e5e7eb] bg-white p-4 text-left hover:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-white/[0.04]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{flow.title}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {[facultyName, subjectName].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex flex-col items-end gap-1">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {flow.template_type === 'rubric' ? 'Rubric' : 'Comment'}
              </span>
              {yearLevel && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                  Year {yearLevel}
                </span>
              )}
            </div>
            {/* Progress ring */}
            <div className="relative h-[60px] w-[60px] shrink-0">
              <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(79,110,247,0.18)" strokeWidth="5" />
                <circle
                  cx="30" cy="30" r="25"
                  fill="none"
                  stroke="#4f6ef7"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - progress / 100)}
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[12px] font-bold leading-none text-slate-800 dark:text-slate-100">{progress}%</span>
                <span className="mt-[3px] text-[8px] leading-none text-slate-500 dark:text-slate-400">{completed}/{total}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between text-xs">
          <span className={`font-medium ${URGENCY_COLOR[urgency.color]}`}>{urgency.label}</span>
          <div className="flex flex-col items-end gap-0.5">
            {nextStepLabel && (
              <span className="text-slate-400 dark:text-slate-500">{nextStepLabel}</span>
            )}
          </div>
        </div>
      </button>

      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(flow) }}
          className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 group-hover:flex dark:text-slate-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          title="Delete flow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  )
}
