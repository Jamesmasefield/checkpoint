import StatusBadge from '../ui/StatusBadge'
import { getMilestoneStatus, ASSIGNEE_LABEL } from '../../lib/milestoneStatus'

const fmt = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

// Role chip styles mapped to design tokens
const ROLE_CHIP = {
  organiser:      { background: 'var(--s2-soft)', color: 'var(--s2)' },
  lol:            { background: 'var(--s1-soft)', color: 'var(--s1)' },
  class_teachers: { background: 'var(--s4-soft)', color: 'var(--s4)' },
}

function teacherInitials(profile) {
  if (profile.full_name) {
    const parts = profile.full_name.trim().split(/\s+/)
    return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  }
  return (profile.email ?? '??').slice(0, 2).toUpperCase()
}

export default function MilestoneRow({ milestone, onToggle, onSelect, readOnly, classTeachers, currentUserId }) {
  const status          = getMilestoneStatus(milestone)
  const isCompleted     = !!milestone.completed_at
  const isOverdue       = status === 'overdue'
  const isMultiSignOff  = milestone.requires_all_teachers && milestone.assignee_mode === 'class_teachers'

  const signedCount       = isMultiSignOff ? (milestone.milestone_sign_offs?.length ?? 0) : 0
  const classTeacherCount = classTeachers?.length ?? 0
  const currentUserSigned = isMultiSignOff
    && (milestone.milestone_sign_offs ?? []).some((s) => s.user_id === currentUserId)

  return (
    <div
      className="flex w-full cursor-pointer items-center gap-3.5 px-5 py-[13px] text-left transition-colors duration-[120ms]"
      style={{
        borderTop: '1px solid var(--border)',
        background: 'transparent',
        boxShadow: isOverdue && !isCompleted ? 'inset 3px 0 0 var(--danger)' : undefined,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      onClick={() => onSelect(milestone)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(milestone) }}
    >
      {isMultiSignOff ? (
        /* Avatar cluster + fraction for multi-teacher sign-off */
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!readOnly) onToggle(milestone)
          }}
          disabled={readOnly}
          title={currentUserSigned ? 'Remove your sign-off' : 'Add your sign-off'}
          className="flex shrink-0 items-center"
          style={{ cursor: readOnly ? 'default' : 'pointer' }}
        >
          <span className="flex items-center">
            {(classTeachers ?? []).slice(0, 4).map((teacher, i) => {
              const signed = (milestone.milestone_sign_offs ?? []).some((s) => s.user_id === teacher.id)
              return (
                <span
                  key={teacher.id}
                  className="grid h-[23px] w-[23px] place-items-center rounded-full text-[8.5px] font-bold text-white"
                  style={{
                    border: '2px solid var(--surface)',
                    background: signed ? 'var(--ok)' : 'var(--idle)',
                    marginLeft: i === 0 ? 0 : -7,
                  }}
                  title={teacher.full_name ?? teacher.email}
                >
                  {teacherInitials(teacher)}
                </span>
              )
            })}
          </span>
          <span className="ml-1.5 font-display text-[11px] font-bold" style={{ color: 'var(--muted)' }}>
            {signedCount}/{classTeacherCount}
          </span>
        </button>
      ) : (
        /* Standard single-tick checkbox */
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!readOnly) onToggle(milestone)
          }}
          disabled={readOnly}
          className="grid h-[23px] w-[23px] shrink-0 place-items-center rounded-[8px] border-2 transition-all duration-150"
          style={{
            background: isCompleted ? 'var(--ok)' : 'var(--surface)',
            borderColor: isCompleted ? 'var(--ok)' : 'var(--border-strong)',
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            className="h-[13px] w-[13px] text-white transition-opacity duration-150"
            style={{ opacity: isCompleted ? 1 : 0 }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      )}

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div
          className="text-[14px] font-semibold tracking-[-0.05px]"
          style={{
            color: isCompleted ? 'var(--muted)' : 'var(--ink)',
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}
        >
          {milestone.title}
        </div>
        <div className="mt-[3px] flex flex-wrap items-center gap-2">
          {/* Role chip */}
          <span
            className="rounded-[5px] px-2 py-[2px] text-[10.5px] font-bold tracking-[0.2px]"
            style={ROLE_CHIP[milestone.assignee_mode] ?? { background: 'var(--idle-soft)', color: 'var(--idle)' }}
          >
            {ASSIGNEE_LABEL[milestone.assignee_mode] ?? milestone.assignee_mode}
          </span>

          {/* Sign-off context text */}
          {isMultiSignOff && (
            <span className="text-[11px]" style={{ color: currentUserSigned ? 'var(--ok)' : 'var(--muted)' }}>
              {currentUserSigned ? '· You signed off' : '· Your sign-off pending'}
            </span>
          )}

          {/* Date */}
          {milestone.due_date && (
            <span className="font-display text-[11.5px] font-semibold" style={{ color: 'var(--muted)' }}>
              {fmt(milestone.due_date)}
            </span>
          )}
        </div>
      </div>

      <StatusBadge status={status} />
    </div>
  )
}
