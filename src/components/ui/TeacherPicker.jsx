import { useRef, useState } from 'react'

const INP = 'block w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200'

export default function TeacherPicker({
  teachers = [],
  otherTeachers = [],
  otherLabel = 'staff outside this faculty',
  value = [],
  onChange,
  placeholder = 'Search teachers…',
}) {
  const [query, setQuery]           = useState('')
  const [open, setOpen]             = useState(false)
  const [showOthers, setShowOthers] = useState(false)
  const inputRef                    = useRef(null)

  // Staff outside the faculty who aren't already part of the primary list
  const others = otherTeachers.filter((t) => !teachers.some((p) => p.id === t.id))

  const selected = [...teachers, ...others].filter((t) => value.includes(t.id))
  const filtered  = teachers.filter(
    (t) => !value.includes(t.id) &&
      (!query || (t.full_name ?? t.email).toLowerCase().includes(query.toLowerCase()))
  )
  const filteredOthers = others.filter(
    (t) => !value.includes(t.id) &&
      (!query || (t.full_name ?? t.email).toLowerCase().includes(query.toLowerCase()))
  )

  function add(id) {
    onChange([...value, id])
    setQuery('')
    // keep open so the user can keep adding without re-clicking
    setOpen(true)
    inputRef.current?.focus()
  }

  function remove(id) {
    onChange(value.filter((x) => x !== id))
  }

  // Close only when focus leaves the entire picker (input + dropdown + chips)
  function handleBlur(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setOpen(false)
      setQuery('')
      setShowOthers(false)
    }
  }

  return (
    <div className="relative" onBlur={handleBlur}>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full bg-[#4f6ef7]/10 px-2.5 py-0.5 text-xs font-medium text-[#4f6ef7] dark:bg-[#4f6ef7]/20"
            >
              {t.full_name ?? t.email}
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="ml-0.5 leading-none opacity-60 hover:opacity-100"
                aria-label={`Remove ${t.full_name ?? t.email}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={selected.length === 0 ? placeholder : 'Add another…'}
        className={INP}
        autoComplete="off"
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-[#e5e7eb] bg-white shadow-lg dark:border-white/[0.08] dark:bg-[#161b27]">
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-slate-400">
              {query ? 'No teachers match.' : teachers.length === value.length ? 'All teachers selected.' : 'No teachers found.'}
            </p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => add(t.id)}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.05]"
              >
                {t.full_name ?? t.email}
              </button>
            ))
          )}

          {others.length > 0 && (
            showOthers ? (
              <>
                <p className="border-t border-[#e5e7eb] px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:border-white/[0.08]">
                  {otherLabel}
                </p>
                {filteredOthers.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-slate-400">
                    {query ? 'No staff match.' : 'All staff selected.'}
                  </p>
                ) : (
                  filteredOthers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => add(t.id)}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.05]"
                    >
                      {t.full_name ?? t.email}
                    </button>
                  ))
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowOthers(true)}
                className="flex w-full items-center border-t border-[#e5e7eb] px-3 py-2 text-left text-xs font-medium text-[#4f6ef7] hover:bg-slate-50 dark:border-white/[0.08] dark:hover:bg-white/[0.05]"
              >
                + Add {otherLabel}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}
