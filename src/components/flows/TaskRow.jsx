function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default function TaskRow({ step, onToggle, onSelect, readOnly }) {
  const isCompleted = (step.step_completions?.length ?? 0) > 0
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = !isCompleted && step.due_date && step.due_date < today

  return (
    <div
      onClick={() => onSelect(step)}
      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5"
    >
      <input
        type="checkbox"
        checked={isCompleted}
        disabled={readOnly}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onToggle(step)}
        className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#4f6ef7] focus:ring-[#4f6ef7] disabled:opacity-50"
      />
      <p className={`flex-1 text-sm ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
        {step.description}
      </p>
      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
        {step.default_role}
      </span>
      <span className={`shrink-0 text-xs ${isOverdue ? 'font-medium text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
        {isOverdue ? 'Overdue · ' : ''}
        {formatDate(step.due_date)}
      </span>
    </div>
  )
}
