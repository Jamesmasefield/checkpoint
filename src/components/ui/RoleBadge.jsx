// V2: three roles only — admin (purple), lol (blue), teacher (teal).
const STYLES = {
  admin:   'bg-purple-500/15 text-purple-600 dark:text-purple-300',
  lol:     'bg-blue-500/15 text-blue-600 dark:text-blue-300',
  teacher: 'bg-teal-500/15 text-teal-600 dark:text-teal-300',
}

const LABELS = {
  admin:   'Admin',
  lol:     'LoL',
  teacher: 'Teacher',
}

export default function RoleBadge({ role }) {
  if (!role) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[role] ?? STYLES.teacher}`}>
      {LABELS[role] ?? role}
    </span>
  )
}
