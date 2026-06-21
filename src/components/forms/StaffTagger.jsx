import { useState } from 'react'

// Search-as-you-type staff tagger — used instead of a plain checkbox list
// since a faculty roster can run into the dozens of names.
export default function StaffTagger({ staff, selectedIds, onAdd, onRemove }) {
  const [query, setQuery] = useState('')

  const selected = selectedIds.map((id) => staff.find((s) => s.id === id)).filter(Boolean)
  const trimmed = query.trim().toLowerCase()
  const results = trimmed
    ? staff.filter((s) => !selectedIds.includes(s.id) && (s.full_name ?? s.email ?? '').toLowerCase().includes(trimmed)).slice(0, 8)
    : []

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selected.map((person) => (
            <span
              key={person.id}
              className="inline-flex items-center gap-1 rounded-full bg-[#4f6ef7]/10 px-2 py-1 text-xs text-[#4f6ef7]"
            >
              {person.full_name ?? person.email}
              <button type="button" onClick={() => onRemove(person.id)} className="text-[#4f6ef7] hover:text-red-500">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search staff by name…"
        className="w-full rounded-md border border-[#e5e7eb] p-2 text-sm outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-transparent dark:text-slate-200"
      />

      {results.length > 0 && (
        <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-[#e5e7eb] dark:border-white/[0.08]">
          {results.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => {
                onAdd(person.id)
                setQuery('')
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <span className="text-slate-700 dark:text-slate-200">{person.full_name ?? person.email}</span>
              <span className="text-xs text-slate-400">{person.role}</span>
            </button>
          ))}
        </div>
      )}
      {trimmed && results.length === 0 && <p className="mt-1 text-xs text-slate-400">No matches.</p>}
    </div>
  )
}
