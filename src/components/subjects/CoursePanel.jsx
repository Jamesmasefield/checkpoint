import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { INPUT_CLASS } from '../../lib/formStyles'
import ClassManager from './ClassManager'

function AddClassForm({ courseId, onCreated }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!code.trim()) return
    setSaving(true)
    await supabase.from('classes').insert({ course_id: courseId, code: code.trim(), name: name.trim() || null })
    setSaving(false)
    setCode('')
    setName('')
    onCreated()
  }

  return (
    <form onSubmit={handleAdd} className="flex gap-2 mt-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Code (e.g. 11MH1)"
        className="w-28 rounded-md border border-[#e5e7eb] bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Display name (optional)"
        className="flex-1 rounded-md border border-[#e5e7eb] bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
      />
      <button
        type="submit"
        disabled={saving || !code.trim()}
        className="rounded-md bg-[#4f6ef7] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        Add
      </button>
    </form>
  )
}

export default function CoursePanel({ subject, onRefresh, canEdit }) {
  const [addingClassTo, setAddingClassTo] = useState(null)
  const [addingCourse, setAddingCourse] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseYear, setNewCourseYear] = useState('')

  const courses = subject.courses ?? []

  // Flatten subject staff for class teacher picker.
  const subjectStaff = (subject.subject_staff ?? []).map((ss) => ss.profiles).filter(Boolean)

  async function handleAddCourse(e) {
    e.preventDefault()
    if (!newCourseName.trim()) return
    await supabase.from('courses').insert({
      subject_id: subject.id,
      name: newCourseName.trim(),
      year_level: newCourseYear ? parseInt(newCourseYear, 10) : null,
    })
    setNewCourseName('')
    setNewCourseYear('')
    setAddingCourse(false)
    onRefresh()
  }

  if (courses.length === 0 && !canEdit) {
    return <p className="mt-4 text-sm text-slate-400">No courses added yet.</p>
  }

  return (
    <div className="mt-4 space-y-4">
      {courses.map((course) => (
        <div key={course.id} className="rounded-lg border border-[#e5e7eb] p-4 dark:border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{course.name}</p>
              {course.year_level && (
                <p className="text-xs text-slate-400">Year {course.year_level}</p>
              )}
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setAddingClassTo(addingClassTo === course.id ? null : course.id)}
                className="text-xs text-[#4f6ef7] hover:underline"
              >
                {addingClassTo === course.id ? 'Cancel' : '+ Add class'}
              </button>
            )}
          </div>

          {/* Classes */}
          <div className="mt-3 space-y-2">
            {(course.classes ?? []).length === 0 && (
              <p className="text-xs text-slate-400">No classes yet.</p>
            )}
            {(course.classes ?? []).map((cls) => (
              <ClassManager
                key={cls.id}
                cls={cls}
                subjectStaff={subjectStaff}
                onRefresh={onRefresh}
                canEdit={canEdit}
              />
            ))}
          </div>

          {/* Add class inline form */}
          {addingClassTo === course.id && (
            <AddClassForm
              courseId={course.id}
              onCreated={() => { setAddingClassTo(null); onRefresh() }}
            />
          )}
        </div>
      ))}

      {/* Add course */}
      {canEdit && !addingCourse && (
        <button
          type="button"
          onClick={() => setAddingCourse(true)}
          className="text-sm text-[#4f6ef7] hover:underline"
        >
          + Add course
        </button>
      )}
      {canEdit && addingCourse && (
        <form onSubmit={handleAddCourse} className="flex gap-2">
          <input
            type="text"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="Course name"
            className="flex-1 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
          />
          <select
            value={newCourseYear}
            onChange={(e) => setNewCourseYear(e.target.value)}
            className="appearance-none rounded-md border border-[#e5e7eb] bg-white px-2 py-2 text-sm text-slate-900 outline-none dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
          >
            <option value="">Year…</option>
            {[7, 8, 9, 10, 11, 12].map((y) => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!newCourseName.trim()}
            className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAddingCourse(false)}
            className="rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-slate-600 dark:border-white/[0.08] dark:text-slate-300"
          >
            Cancel
          </button>
        </form>
      )}
    </div>
  )
}
