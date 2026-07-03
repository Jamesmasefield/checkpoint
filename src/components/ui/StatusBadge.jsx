const STYLES = {
  complete:   { background: 'var(--ok-soft)',     color: 'var(--ok)' },
  overdue:    { background: 'var(--danger-soft)', color: 'var(--danger)' },
  'due-soon': { background: 'var(--warn-soft)',   color: 'var(--warn)' },
  upcoming:   { background: 'var(--idle-soft)',   color: 'var(--idle)' },
}

const LABELS = {
  complete:   'Complete',
  overdue:    'Overdue',
  'due-soon': 'Due soon',
  upcoming:   'Upcoming',
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] ?? STYLES.upcoming
  return (
    <span
      className="inline-flex shrink-0 rounded-full px-[11px] py-1 text-[11px] font-bold tracking-[0.2px]"
      style={style}
    >
      {LABELS[status] ?? status}
    </span>
  )
}
