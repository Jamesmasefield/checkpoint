import MilestoneRow from './MilestoneRow'

export default function StageBlock({ id, stageNumber, title, colorHex, milestones, onToggle, onSelect, readOnly, classTeachers, currentUserId }) {
  const total     = milestones.length
  const completed = milestones.filter((m) => !!m.completed_at).length
  const progress  = total ? Math.round((completed / total) * 100) : 0

  // Extract just the name from "Stage N — Name"
  const stageName = title.includes(' — ') ? title.split(' — ').slice(1).join(' — ') : title

  // If stageNumber isn't passed (e.g. from other callers), fall back to colorHex for the accent
  const stageVar     = stageNumber ? `var(--s${stageNumber})`      : colorHex
  const stageSoftVar = stageNumber ? `var(--s${stageNumber}-soft)` : `${colorHex}1A`

  return (
    <div
      id={id}
      className="overflow-hidden rounded-[var(--r-lg)] border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Stage header */}
      <div
        className="relative flex items-center gap-3 px-5 py-[13px]"
        style={{ background: stageSoftVar }}
      >
        {/* Left accent bar */}
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: stageVar }}
        />

        {/* Number badge */}
        <span
          className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] font-display text-[13px] font-bold text-white"
          style={{ background: stageVar }}
        >
          {stageNumber ?? ''}
        </span>

        {/* Stage name */}
        <span
          className="text-[14.5px] font-bold tracking-[-0.1px]"
          style={{ color: 'var(--ink)' }}
        >
          {stageName}
        </span>

        {/* Fraction + inline progress bar */}
        <div className="ml-auto flex items-center gap-3">
          <span className="font-display text-[12.5px] font-semibold" style={{ color: 'var(--muted)' }}>
            {completed}/{total}
          </span>
          <div
            className="h-[5px] w-[90px] overflow-hidden rounded-[3px]"
            style={{ background: 'var(--border)' }}
          >
            <div
              className="h-full rounded-[3px] transition-all duration-300"
              style={{ width: `${progress}%`, background: stageVar }}
            />
          </div>
        </div>
      </div>

      {/* Milestone rows */}
      <div>
        {milestones.map((m) => (
          <MilestoneRow
            key={m.id}
            milestone={m}
            onToggle={onToggle}
            onSelect={onSelect}
            readOnly={readOnly}
            classTeachers={classTeachers}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  )
}
