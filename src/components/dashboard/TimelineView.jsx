import { useNavigate } from 'react-router-dom'
import { getMilestoneStatus, getFlowUrgency } from '../../lib/milestoneStatus'

// Timeline uses gray for upcoming — keeps "due-soon" amber and "overdue" red prominent.
const DOT_COLOR = {
  complete:   '#22c55e',
  overdue:    '#ef4444',
  'due-soon': '#f59e0b',
  upcoming:   '#94a3b8',
}

const LEGEND = [
  { label: 'Complete', color: '#22c55e' },
  { label: 'Due soon', color: '#f59e0b' },
  { label: 'Overdue',  color: '#ef4444' },
  { label: 'Upcoming', color: '#94a3b8' },
]

const URGENCY_CLASS = {
  green: 'text-green-600 dark:text-green-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red:   'text-red-600   dark:text-red-400',
  slate: 'text-slate-400 dark:text-slate-500',
}

const fmt = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })

const fmtFull = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })

const addDays = (ts, n) => ts + n * 86_400_000

const LABEL_W = 'w-56' // 224 px — matches the header spacer exactly

export default function TimelineView({ flows }) {
  const navigate = useNavigate()

  const allDates = flows
    .flatMap((f) => f.flow_milestones ?? [])
    .map((m) => m.due_date)
    .filter(Boolean)
    .sort()

  if (allDates.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No milestone dates to display.</p>
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const rawMin = todayStr < allDates[0] ? todayStr : allDates[0]
  const rawMax = allDates[allDates.length - 1]

  const minTs = addDays(new Date(`${rawMin}T00:00:00`).getTime(), -7)
  const maxTs = addDays(new Date(`${rawMax}T00:00:00`).getTime(), 7)
  const span  = maxTs - minTs

  const toPct = (dateStr) => {
    const ts = new Date(`${dateStr}T00:00:00`).getTime()
    return Math.min(Math.max(((ts - minTs) / span) * 100, 0.5), 99.5)
  }

  const todayPct = Math.min(
    Math.max(((new Date(`${todayStr}T00:00:00`).getTime() - minTs) / span) * 100, 0),
    100,
  )

  const axisLabels = [0, 25, 50, 75, 100].map((pct) => ({
    pct,
    label: fmt(new Date(minTs + (span * pct) / 100).toISOString().slice(0, 10)),
  }))

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white dark:border-white/[0.08] dark:bg-[#161b27]">

      {/* ── Legend bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-5 border-b border-[#e5e7eb] px-4 py-2.5 dark:border-white/[0.08]">
        {LEGEND.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Axis header ─────────────────────────────────────────────── */}
      <div
        className="flex border-b border-[#e5e7eb] bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.02]"
        style={{ minWidth: 640 }}
      >
        {/* "Task" column label — exact same width as the label column in rows */}
        <div className={`${LABEL_W} shrink-0 px-4 py-2.5`}>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Task
          </span>
        </div>

        {/* Date axis */}
        <div className="relative flex-1 h-9">
          {axisLabels.map(({ pct, label }) => (
            <span
              key={pct}
              className="absolute text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap"
              style={{
                top: '50%',
                ...(pct === 0   && { left: 0,     transform: 'translateY(-50%)' }),
                ...(pct === 100 && { right: 0,    transform: 'translateY(-50%)' }),
                ...(pct > 0 && pct < 100 && { left: `${pct}%`, transform: 'translate(-50%, -50%)' }),
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Flow rows ────────────────────────────────────────────────── */}
      <div style={{ minWidth: 640 }}>
        {flows.map((flow, idx) => {
          const milestones  = (flow.flow_milestones ?? []).filter((m) => m.due_date)
          const subjectName = flow.subjects?.name ?? flow.faculties?.name ?? ''
          const yearLevel   = flow.courses?.year_level ? `Year ${flow.courses.year_level}` : ''
          const courseName  = [subjectName, yearLevel].filter(Boolean).join(' · ')
          const urgency     = getFlowUrgency(flow.flow_milestones ?? [], flow.anchor_date ?? null)

          return (
            <div
              key={flow.id}
              className={`flex items-stretch border-b border-[#e5e7eb] last:border-0 dark:border-white/[0.08] ${
                idx % 2 === 0
                  ? 'bg-white dark:bg-transparent'
                  : 'bg-slate-50/70 dark:bg-white/[0.015]'
              }`}
            >
              {/* Label column */}
              <button
                type="button"
                onClick={() => navigate(`/flows/${flow.id}`)}
                className={`${LABEL_W} shrink-0 px-4 py-4 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.04]`}
              >
                <p className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100 truncate">
                  {flow.title}
                </p>
                <p className="mt-0.5 text-xs text-[#4f6ef7] truncate">{courseName}</p>
                <p className={`mt-1 text-xs font-medium ${URGENCY_CLASS[urgency.color]}`}>
                  {urgency.label}
                </p>
              </button>

              {/* Track */}
              <div className="relative flex-1" style={{ minHeight: 72 }}>
                {/* Baseline */}
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-slate-200 dark:bg-white/[0.08]" />

                {/* Today marker */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-blue-700 opacity-70 dark:bg-blue-400"
                  style={{ left: `${todayPct}%` }}
                />

                {/* Milestone dots */}
                {milestones.map((m) => {
                  const status = getMilestoneStatus(m)
                  const color  = DOT_COLOR[status]
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => navigate(`/flows/${flow.id}`)}
                      className="group absolute rounded-full transition-transform hover:scale-125 focus:outline-none"
                      style={{
                        left:            `${toPct(m.due_date)}%`,
                        top:             '50%',
                        width:           14,
                        height:          14,
                        backgroundColor: color,
                        transform:       'translate(-50%, -50%)',
                        boxShadow:       '0 0 0 2px #fff',
                      }}
                    >
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg group-hover:block dark:bg-slate-700">
                        <span className="block font-medium">{m.title}</span>
                        <span className="block opacity-75">{fmtFull(m.due_date)}</span>
                        <span className="block capitalize opacity-75">{status.replace('-', ' ')}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
