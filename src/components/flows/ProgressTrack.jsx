import Tooltip from '../ui/Tooltip'
import { getMilestoneStatus } from '../../lib/milestoneStatus'

const STAGE_VAR = {
  1: 'var(--s1)',
  2: 'var(--s2)',
  3: 'var(--s3)',
  4: 'var(--s4)',
}

function dotColor(m, status) {
  if (status === 'complete') return 'var(--ok)'
  if (status === 'overdue')  return 'var(--danger)'
  if (status === 'due-soon') return 'var(--warn)'
  return STAGE_VAR[m.stage_number] ?? 'var(--idle)'
}

const fmtShort = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })

const todayPill = () => {
  const d = new Date()
  const part = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }).toUpperCase()
  return `TODAY · ${part}`
}

const LEGEND = [
  { label: 'Complete', color: 'var(--ok)' },
  { label: 'Due soon', color: 'var(--warn)' },
  { label: 'Overdue',  color: 'var(--danger)' },
  { label: 'Upcoming', color: 'var(--idle)' },
]

export default function ProgressTrack({ milestones, selectedId, onSelect }) {
  const withDates = milestones
    .filter((m) => m.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  if (withDates.length < 2) return null

  const LABEL_W    = 120
  const PX_PAD     = 60
  const trackWidth = Math.max(1250, withDates.length * 200)
  const usable     = trackWidth - PX_PAD * 2
  const n          = withDates.length

  const nodeX = (i) => PX_PAD + ((i + 1) / (n + 1)) * usable

  // Interpolate todayX in the same node coordinate space
  const todayStr = new Date().toISOString().slice(0, 10)
  let todayX
  if (todayStr <= withDates[0].due_date) {
    todayX = nodeX(0) - 40
  } else if (todayStr >= withDates[n - 1].due_date) {
    todayX = nodeX(n - 1) + 40
  } else {
    let lo = 0
    for (let i = 0; i < n - 1; i++) {
      if (todayStr >= withDates[i].due_date && todayStr <= withDates[i + 1].due_date) {
        lo = i; break
      }
    }
    const t0      = new Date(`${withDates[lo].due_date}T00:00:00`).getTime()
    const t1      = new Date(`${withDates[lo + 1].due_date}T00:00:00`).getTime()
    const todayTs = new Date(`${todayStr}T00:00:00`).getTime()
    const frac    = t1 === t0 ? 0.5 : (todayTs - t0) / (t1 - t0)
    todayX = nodeX(lo) + frac * (nodeX(lo + 1) - nodeX(lo))
  }

  const todayPct = Math.max(0, Math.min(100, (todayX / trackWidth) * 100))

  const plotted = withDates.map((m, i) => ({
    ...m,
    x:      nodeX(i),
    above:  i % 2 === 0,
    status: getMilestoneStatus(m),
  }))

  return (
    <div
      className="rounded-[var(--r-lg)] border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-[22px] pb-0 pt-4">
        <p className="text-[11px] font-bold uppercase tracking-[1.3px]" style={{ color: 'var(--muted)' }}>
          Milestone timeline
        </p>
        <div className="flex items-center gap-3.5 text-[11.5px]" style={{ color: 'var(--muted)' }}>
          {LEGEND.map(({ label, color }) => (
            <span key={label} className="flex items-center gap-[5px]">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Scrollable timeline */}
      <div className="overflow-x-auto px-[22px] pb-5 pt-2.5">
        <div className="relative select-none" style={{ minWidth: trackWidth, height: 170 }}>

          {/* Gradient track with primary fill up to today */}
          <div
            className="absolute rounded-[3px]"
            style={{
              left: 0, right: 0,
              top: '50%', height: 5,
              transform: 'translateY(-50%)',
              background: 'linear-gradient(90deg, var(--s1-soft), var(--s2-soft) 35%, var(--s3-soft) 65%, var(--s4-soft))',
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-[3px]"
              style={{ width: `${todayPct}%`, background: 'var(--primary)', opacity: 0.85 }}
            />
          </div>

          {/* Today marker line + pill */}
          <div
            className="absolute z-10"
            style={{ top: 12, bottom: 12, left: todayX, width: 2, background: 'var(--primary)' }}
          >
            <span
              className="absolute whitespace-nowrap rounded-full font-display text-[10px] font-bold tracking-[0.4px] text-white"
              style={{
                top: -6,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--primary)',
                padding: '3px 9px',
                boxShadow: '0 2px 8px rgba(79,95,238,0.4)',
              }}
            >
              {todayPill()}
            </span>
          </div>

          {/* Milestone nodes */}
          {plotted.map((m) => {
            const isSelected = m.id === selectedId
            const color      = dotColor(m, m.status)

            return (
              <div
                key={m.id}
                className="absolute cursor-pointer"
                style={{ left: m.x, top: '50%', transform: 'translate(-50%, -50%)', color }}
              >
                {/* Label above track */}
                {m.above && (
                  <div
                    className="absolute text-center"
                    style={{ bottom: 26, left: '50%', transform: 'translateX(-50%)', width: LABEL_W }}
                  >
                    <p
                      className="font-semibold leading-[1.25]"
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-2)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {m.title}
                    </p>
                    <p className="mt-0.5 font-display text-[10.5px] font-semibold" style={{ color: 'var(--muted)' }}>
                      {fmtShort(m.due_date)}
                    </p>
                  </div>
                )}

                {/* Dot */}
                <Tooltip content={`${m.title} · ${fmtShort(m.due_date)}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(m)}
                    className="block rounded-full transition-transform duration-150 hover:scale-[1.35] focus:outline-none"
                    style={{
                      width: 15,
                      height: 15,
                      background: 'currentColor',
                      border: '3px solid var(--surface)',
                      boxShadow: isSelected
                        ? `0 0 0 3px ${color}, 0 2px 6px rgba(0,0,0,0.2)`
                        : '0 0 0 2px currentColor, 0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  />
                </Tooltip>

                {/* Label below track */}
                {!m.above && (
                  <div
                    className="absolute text-center"
                    style={{ top: 26, left: '50%', transform: 'translateX(-50%)', width: LABEL_W }}
                  >
                    <p
                      className="font-semibold leading-[1.25]"
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-2)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {m.title}
                    </p>
                    <p className="mt-0.5 font-display text-[10.5px] font-semibold" style={{ color: 'var(--muted)' }}>
                      {fmtShort(m.due_date)}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
