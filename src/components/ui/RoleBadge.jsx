const STYLES = {
  lol: 'bg-purple-500/15 text-purple-600 dark:text-purple-300',
  assistant_lol: 'bg-orange-500/15 text-orange-600 dark:text-orange-300',
  course_delegate: 'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  classroom_teacher: 'bg-teal-500/15 text-teal-600 dark:text-teal-300',
  admin: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
}

const LABELS = {
  lol: 'LoL',
  assistant_lol: 'Assistant LoL',
  course_delegate: 'Course Delegate',
  classroom_teacher: 'Classroom Teacher',
  admin: 'Admin',
}

export default function RoleBadge({ role }) {
  if (!role) return null

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[role] ?? STYLES.admin}`}
    >
      {LABELS[role] ?? role}
    </span>
  )
}
