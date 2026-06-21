import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useFacultyPicker } from '../../hooks/useFacultyPicker'
import { FLOW_TEMPLATES } from '../../lib/flowTemplates'
import { calculateDueDate } from '../../lib/deadlines'
import { SELECT_CLASS, INPUT_CLASS } from '../../lib/formStyles'
import StaffTagger from './StaffTagger'

const YEAR_LEVELS = ['7', '8', '9', '10', '11', '12']

export default function NewFlowForm({ onClose, onCreated }) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { facultyId, setFacultyId, needsPicker: needsFacultyPicker, options: faculties } = useFacultyPicker(profile)

  const [title, setTitle] = useState('')
  const [templateType, setTemplateType] = useState('rubric')
  const [yearLevel, setYearLevel] = useState('')
  const [anchorDate, setAnchorDate] = useState('')
  const [staff, setStaff] = useState([])
  const [selectedStaffIds, setSelectedStaffIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!facultyId) {
      setStaff([])
      return
    }
    supabase
      .from('profiles')
      .select('id, full_name, email, role, profile_faculties!inner ( faculty_id )')
      .eq('profile_faculties.faculty_id', facultyId)
      .neq('role', 'admin')
      .order('full_name')
      .then(({ data, error: fetchError }) => {
        if (!fetchError) setStaff(data)
      })
  }, [facultyId])

  const addStaff = (id) => {
    setSelectedStaffIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const removeStaff = (id) => {
    setSelectedStaffIds((prev) => prev.filter((s) => s !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !anchorDate || !facultyId || !yearLevel) {
      setError('Title, faculty, year, and anchor date are required.')
      return
    }

    setSubmitting(true)
    setError('')

    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .insert({
        title: title.trim(),
        faculty_id: facultyId,
        template_type: templateType,
        year_level: yearLevel,
        anchor_date: anchorDate,
        created_by: user.id,
        status: 'active',
      })
      .select()
      .single()

    if (flowError) {
      setError(flowError.message)
      setSubmitting(false)
      return
    }

    if (selectedStaffIds.length > 0) {
      const memberRows = selectedStaffIds.map((staffId) => {
        const person = staff.find((s) => s.id === staffId)
        return { flow_id: flow.id, user_id: staffId, role_in_flow: person?.role ?? null }
      })
      const { error: membersError } = await supabase.from('flow_members').insert(memberRows)
      if (membersError) {
        setError(membersError.message)
        setSubmitting(false)
        return
      }
    }

    const templateSteps = FLOW_TEMPLATES[templateType].steps
    const stepRows = templateSteps.map((step, index) => ({
      flow_id: flow.id,
      stage_number: step.stage_number,
      step_number: step.step_number,
      description: step.description,
      default_role: step.default_role,
      due_date: calculateDueDate(anchorDate, step.description, step.stage_number),
      is_custom: false,
      sort_order: index + 1,
    }))
    const { error: stepsError } = await supabase.from('flow_steps').insert(stepRows)

    setSubmitting(false)

    if (stepsError) {
      setError(stepsError.message)
      return
    }

    onCreated(flow.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-lg bg-white p-6 dark:bg-[#161b27]"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Create new flow</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            ✕
          </button>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Year 10 Mathematics — Term 2 Assessment"
            className={INPUT_CLASS}
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm text-slate-600 dark:text-slate-300">Template</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {Object.entries(FLOW_TEMPLATES).map(([key, template]) => (
              <label
                key={key}
                className={`cursor-pointer rounded-md border p-3 text-sm ${
                  templateType === key
                    ? 'border-[#4f6ef7] bg-[#4f6ef7]/5'
                    : 'border-[#e5e7eb] dark:border-white/[0.08]'
                }`}
              >
                <input
                  type="radio"
                  name="templateType"
                  value={key}
                  checked={templateType === key}
                  onChange={() => setTemplateType(key)}
                  className="sr-only"
                />
                <p className="font-medium text-slate-900 dark:text-slate-100">{template.label}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {template.description} · {template.steps.length} steps
                </p>
              </label>
            ))}
          </div>
        </fieldset>

        {needsFacultyPicker && (
          <label className="mt-4 block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Faculty</span>
            <select value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className={SELECT_CLASS}>
              <option value="" disabled>
                Select a faculty…
              </option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Year level</span>
            <select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} className={SELECT_CLASS}>
              <option value="" disabled>
                Select a year…
              </option>
              {YEAR_LEVELS.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Anchor date (task due date)</span>
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <div className="mt-4">
          <span className="text-sm text-slate-600 dark:text-slate-300">Tag staff</span>
          <div className="mt-1">
            {staff.length === 0 ? (
              <p className="text-sm text-slate-400">No other staff found in your faculty yet.</p>
            ) : (
              <StaffTagger staff={staff} selectedIds={selectedStaffIds} onAdd={addStaff} onRemove={removeStaff} />
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create flow'}
        </button>
      </form>
    </div>
  )
}
