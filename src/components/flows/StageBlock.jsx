import ProgressBar from '../ui/ProgressBar'
import TaskRow from './TaskRow'

export default function StageBlock({ title, colorHex, steps, onToggleStep, onSelectStep, readOnly }) {
  const totalSteps = steps.length
  const completedSteps = steps.filter((s) => (s.step_completions?.length ?? 0) > 0).length
  const progress = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0

  return (
    <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white dark:border-white/[0.08] dark:bg-white/[0.04]">
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: `${colorHex}1A` }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorHex }} />
          <h3 className="text-sm font-medium" style={{ color: colorHex }}>
            {title}
          </h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {completedSteps}/{totalSteps}
        </span>
      </div>

      <div className="px-4 pt-3">
        <ProgressBar percent={progress} />
      </div>

      <div className="divide-y divide-[#e5e7eb] dark:divide-white/[0.08]">
        {steps.map((step) => (
          <TaskRow key={step.id} step={step} onToggle={onToggleStep} onSelect={onSelectStep} readOnly={readOnly} />
        ))}
      </div>
    </div>
  )
}
