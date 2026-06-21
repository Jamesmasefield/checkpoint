const COLORS = {
  on_track: '#22c55e',
  in_progress: '#4f6ef7',
  attention: '#f59e0b',
  overdue: '#ef4444',
  not_started: '#94a3b8',
}

export default function StatusDot({ status }) {
  const color = COLORS[status] ?? COLORS.not_started

  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-label={status}
    />
  )
}
