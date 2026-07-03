export default function SubjectTabs({ subjects, activeId, onSelect, onNew, canCreate }) {
  return (
    <div className="flex items-end gap-1 overflow-x-auto border-b border-[#e5e7eb] dark:border-white/[0.08]">
      {subjects.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className={`whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
            activeId === s.id
              ? 'border border-b-white bg-white text-[#4f6ef7] dark:border-white/[0.08] dark:border-b-[#0f1117] dark:bg-[#0f1117] dark:text-[#4f6ef7]'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {s.name}
        </button>
      ))}
      {canCreate && (
        <button
          type="button"
          onClick={onNew}
          className="mb-1 ml-2 rounded-md px-3 py-1.5 text-xs font-medium text-[#4f6ef7] hover:bg-[#4f6ef7]/10"
        >
          + New subject
        </button>
      )}
    </div>
  )
}
