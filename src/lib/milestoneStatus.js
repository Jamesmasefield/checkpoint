// Shared milestone status logic — computed at runtime, never stored.
// Import from here rather than duplicating in each component.

export const STATUS_COLOR = {
  complete:   '#22c55e',
  overdue:    '#ef4444',
  'due-soon': '#f59e0b',
  upcoming:   '#4f6ef7',
}

export const ASSIGNEE_LABEL = {
  organiser:      'Flow organiser',
  class_teachers: 'Class teachers',
  lol:            'Leader of Learning',
}

export function getMilestoneStatus(milestone, dueSoonDays = 5) {
  if (milestone.completed_at) return 'complete'
  if (!milestone.due_date) return 'upcoming'
  const today = new Date().toISOString().slice(0, 10)
  if (milestone.due_date < today) return 'overdue'
  const days = Math.ceil((new Date(`${milestone.due_date}T00:00:00`) - new Date()) / 86400000)
  if (days <= dueSoonDays) return 'due-soon'
  return 'upcoming'
}

// Returns { label, color } describing the most urgent state in a flow's milestone list.
// Pass anchorDate (the flow's overall assessment date) to show days until the final
// due date rather than the next incomplete milestone's date.
export function getFlowUrgency(milestones, anchorDate = null) {
  if (!milestones || milestones.length === 0) return { label: 'No milestones', color: 'slate' }

  const today = new Date().toISOString().slice(0, 10)
  const incomplete = milestones.filter((m) => !m.completed_at)

  if (incomplete.length === 0) return { label: 'All complete', color: 'green' }

  const overdue = incomplete.filter((m) => m.due_date && m.due_date < today)
  if (overdue.length > 0) {
    return { label: `${overdue.length} overdue`, color: 'red' }
  }

  const dueDate = anchorDate ?? incomplete
    .filter((m) => m.due_date)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0]?.due_date

  if (!dueDate) return { label: 'No dates set', color: 'slate' }

  const days = Math.ceil((new Date(`${dueDate}T00:00:00`) - new Date()) / 86400000)
  if (days === 0) return { label: 'Due today', color: 'amber' }
  if (days === 1) return { label: 'Due tomorrow', color: 'amber' }
  if (days <= 5) return { label: `In ${days} days`, color: 'amber' }
  return { label: `In ${days} days`, color: 'slate' }
}
