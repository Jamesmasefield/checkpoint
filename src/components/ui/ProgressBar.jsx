export default function ProgressBar({ percent }) {
  const clamped = Math.max(0, Math.min(100, percent))

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
      <div className="h-full rounded-full bg-[#4f6ef7]" style={{ width: `${clamped}%` }} />
    </div>
  )
}
