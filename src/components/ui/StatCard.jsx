export default function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.04]">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-medium text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}
