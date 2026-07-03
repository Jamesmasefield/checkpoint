import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { INPUT_CLASS } from '../../lib/formStyles'

export default function ClassManager({ cls, subjectStaff, onRefresh, canEdit }) {
  const [adding, setAdding] = useState(false)
  const teachers = cls.class_teachers ?? []

  async function removeTeacher(userId) {
    await supabase.from('class_teachers').delete().eq('class_id', cls.id).eq('user_id', userId)
    onRefresh()
  }

  async function addTeacher(userId) {
    await supabase.from('class_teachers').upsert({ class_id: cls.id, user_id: userId })
    onRefresh()
  }

  const assignedIds   = teachers.map((ct) => ct.user_id)
  const available     = (subjectStaff ?? []).filter((p) => !assignedIds.includes(p.id))

  return (
    <div className="rounded-md border border-[#e5e7eb] p-3 dark:border-white/[0.08]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {cls.name ?? cls.code}
          {cls.name && cls.code !== cls.name && (
            <span className="ml-1 text-xs text-slate-400">({cls.code})</span>
          )}
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setAdding((x) => !x)}
            className="text-xs text-[#4f6ef7] hover:underline"
          >
            {adding ? 'Done' : '+ Assign teacher'}
          </button>
        )}
      </div>

      {/* Current teachers */}
      <div className="mt-2 flex flex-wrap gap-1">
        {teachers.length === 0 && (
          <span className="text-xs text-slate-400">No teachers assigned</span>
        )}
        {teachers.map((ct) => {
          const p = ct.profiles
          return (
            <span
              key={ct.user_id}
              className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
            >
              {p?.full_name ?? p?.email ?? 'Unknown'}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeTeacher(ct.user_id)}
                  className="text-teal-500 hover:text-red-500"
                >
                  ✕
                </button>
              )}
            </span>
          )
        })}
      </div>

      {/* Add teacher picker */}
      {adding && canEdit && (
        <div className="mt-2">
          {available.length === 0 ? (
            <p className="text-xs text-slate-400">All subject staff are already assigned to this class.</p>
          ) : (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) { addTeacher(e.target.value); e.target.value = '' }
              }}
              className="w-full appearance-none rounded-md border border-[#e5e7eb] bg-white px-2 py-1.5 text-xs text-slate-900 outline-none dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
            >
              <option value="" disabled>Select teacher to assign…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name ?? p.email}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  )
}
