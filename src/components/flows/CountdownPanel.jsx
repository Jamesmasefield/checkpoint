import StageStepper from './StageStepper'

const CIRC = 2 * Math.PI * 52 // 326.73 — SVG ring circumference

export default function CountdownPanel({ flow, milestones, stages, children }) {
  // ── Countdown logic (unchanged) ──────────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const assessmentDate = new Date(`${flow.anchor_date}T00:00:00`)

  let days, label, phase

  if (today < assessmentDate) {
    days = Math.ceil((assessmentDate - today) / 86400000)
    label = 'days until assessment'
    phase = 'Pre-assessment phase'
  } else {
    const reporting = milestones.find((m) => m.is_reporting_due && !m.completed_at)
    const target =
      reporting ??
      [...milestones]
        .filter((m) => m.due_date)
        .sort((a, b) => b.due_date.localeCompare(a.due_date))[0]

    if (target?.due_date) {
      const targetDate = new Date(`${target.due_date}T00:00:00`)
      days = Math.ceil((targetDate - today) / 86400000)
      label = days >= 0 ? 'days until results due' : 'days since results due'
    } else {
      days = 0
      label = 'no results deadline set'
    }
    phase = 'Reporting phase'
  }

  // ── Progress data ─────────────────────────────────────────────────────────
  const total     = milestones.length
  const completed = milestones.filter((m) => m.completed_at).length
  const progress  = total ? Math.round((completed / total) * 100) : 0

  // ── Display data ──────────────────────────────────────────────────────────
  const classTeachers   = (flow.flow_members ?? []).filter((m) => m.role_in_flow === 'class_teacher' && m.profiles)
  const subjectName     = flow.subjects?.name ?? ''
  const facultyName     = flow.faculties?.name ?? ''
  const subLine         = [facultyName, subjectName].filter(Boolean).join(' · ')
  const assessmentLabel = flow.anchor_date
    ? new Date(`${flow.anchor_date}T00:00:00`).toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : null

  // ── Stage stepper data ────────────────────────────────────────────────────
  const stagesWithData = (stages ?? []).map((stage) => {
    const sm = milestones.filter((m) => m.stage_number === stage.number)
    return { ...stage, done: sm.filter((m) => m.completed_at).length, total: sm.length }
  })

  return (
    <section
      className="relative overflow-hidden rounded-[var(--r-xl)] p-[26px_30px_24px]"
      style={{ background: 'var(--hero-grad)', boxShadow: 'var(--shadow-lg)', color: 'var(--hero-ink)' }}
    >
      {/* Radial glow decoration */}
      <div
        className="pointer-events-none absolute -right-[8%] -top-[40%] h-[420px] w-[420px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14), transparent 65%)' }}
      />

      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-6">

        {/* Left — identity */}
        <div className="min-w-[200px]">
          <div
            className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.4px]"
            style={{ color: 'var(--hero-ink-dim)' }}
          >
            <span className="h-[7px] w-[7px] rounded-full bg-[#7ef0c0] shadow-[0_0_8px_#7ef0c0]" />
            {phase}
          </div>

          <h1 className="font-display text-[26px] font-bold tracking-[-0.3px]">{flow.title}</h1>

          {subLine && (
            <p className="mt-0.5 text-[13px]" style={{ color: 'var(--hero-ink-dim)' }}>
              {subLine}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className="rounded-full px-3 py-[5px] text-[12px] font-semibold backdrop-blur-sm"
              style={{ background: 'var(--hero-glass)', border: '1px solid var(--hero-glass-border)' }}
            >
              {flow.template_type === 'rubric' ? 'Rubric-based' : 'Comment-based'}
            </span>
            {classTeachers.length > 0 && (
              <span
                className="rounded-full px-3 py-[5px] text-[12px] font-semibold backdrop-blur-sm"
                style={{ background: 'var(--hero-glass)', border: '1px solid var(--hero-glass-border)' }}
              >
                {classTeachers.length} class teacher{classTeachers.length !== 1 ? 's' : ''}
              </span>
            )}
            <span
              className="rounded-full px-3 py-[5px] text-[12px] font-semibold backdrop-blur-sm"
              style={{ background: 'var(--hero-glass)', border: '1px solid var(--hero-glass-border)' }}
            >
              {total} milestone{total !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Right — countdown + progress ring */}
        <div className="flex items-center gap-[26px]">
          <div className="text-right">
            <div className="font-display text-[64px] font-bold leading-[0.95] tracking-[-2px]">
              {Math.abs(days)}
            </div>
            <div className="mt-0.5 text-[13px]" style={{ color: 'var(--hero-ink-dim)' }}>
              {label}
            </div>
            {assessmentLabel && (
              <div
                className="mt-1.5 inline-block rounded-lg px-2.5 py-1 text-[12px] font-semibold"
                style={{ background: 'var(--hero-glass)', border: '1px solid var(--hero-glass-border)' }}
              >
                {assessmentLabel}
              </div>
            )}
          </div>

          {/* SVG progress ring */}
          <div className="relative h-[118px] w-[118px] shrink-0">
            <svg
              width="118"
              height="118"
              viewBox="0 0 118 118"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle
                cx="59" cy="59" r="52"
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="9"
              />
              <circle
                cx="59" cy="59" r="52"
                fill="none"
                stroke="#fff"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progress / 100)}
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <div className="font-display text-[26px] font-bold leading-none">{progress}%</div>
                <div className="mt-px text-[10.5px]" style={{ color: 'var(--hero-ink-dim)' }}>
                  {completed} of {total} done
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas links + class teachers slot */}
      {children && (
        <div
          className="mt-5 pt-4"
          style={{ borderTop: '1px solid var(--hero-glass-border)' }}
        >
          {children}
        </div>
      )}

      {/* Stage stepper */}
      {stagesWithData.length > 0 && <StageStepper stages={stagesWithData} />}
    </section>
  )
}
