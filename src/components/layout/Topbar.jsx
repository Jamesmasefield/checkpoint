import RoleBadge from '../ui/RoleBadge'

// V2: View-As picker moved to Sidebar footer.
// Topbar shows only the page title, and an amber banner when impersonating.
export default function Topbar({ title, viewAsProfile, onSetViewAs }) {
  if (viewAsProfile) {
    return (
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-amber-200 bg-amber-50 px-6 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <span>
            Acting as <strong>{viewAsProfile.full_name ?? viewAsProfile.email}</strong>
          </span>
          <RoleBadge role={viewAsProfile.role} />
        </div>
        <button
          type="button"
          onClick={() => onSetViewAs(null)}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
        >
          Exit — back to my profile
        </button>
      </header>
    )
  }

  return (
    <header className="flex h-12 shrink-0 items-center border-b border-[#e5e7eb] bg-white px-6 dark:border-white/[0.08] dark:bg-transparent">
      <h1 className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</h1>
    </header>
  )
}
