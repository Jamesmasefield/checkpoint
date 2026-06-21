import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useFacultyPicker } from '../../hooks/useFacultyPicker'
import { calculateDueDate } from '../../lib/deadlines'
import { SELECT_CLASS, INPUT_CLASS } from '../../lib/formStyles'
import StaffTagger from './StaffTagger'

const YEAR_LEVELS = ['7', '8', '9', '10', '11', '12']

export default function ImportFlowForm({ onClose, onCreated }) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { facultyId, setFacultyId, needsPicker: needsFacultyPicker, options: faculties } = useFacultyPicker(profile)

  const [sourceFlows, setSourceFlows] = useState([])
  const [sourceFlowId, setSourceFlowId] = useState('')
  const [sourceDetail, setSourceDetail] = useState(null)
  const [loadingSource, setLoadingSource] = useState(false)

  const [title, setTitle] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [anchorDate, setAnchorDate] = useState('')
  const [staff, setStaff] = useState([])
  const [selectedStaffIds, setSelectedStaffIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setSourceFlowId('')
    setSourceDetail(null)
    if (!facultyId) {
      setStaff([])
      setSourceFlows([])
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
    supabase
      .from('flows')
      .select('id, title, anchor_date, template_type')
      .eq('faculty_id', facultyId)
      .order('anchor_date', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (!fetchError) setSourceFlows(data)
      })
  }, [facultyId])

  useEffect(() => {
    if (!sourceFlowId) {
      setSourceDetail(null)
      return
    }
    setLoadingSource(true)
    supabase
      .from('flows')
      .select(
        `id, title, template_type, year_level,
        flow_steps ( stage_number, step_number, description, default_role, is_custom, sort_order ),
        flow_members ( user_id )`,
      )
      .eq('id', sourceFlowId)
      .single()
      .then(({ data, error: fetchError }) => {
        setLoadingSource(false)
        if (fetchError) {
          setError(fetchError.message)
          return
        }
        setSourceDetail(data)
        setTitle(data.title)
        setYearLevel(data.year_level)
        setSelectedStaffIds(data.flow_members.map((m) => m.user_id))
      })
  }, [sourceFlowId])

  const addStaff = (id) => {
    setSelectedStaffIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  const removeStaff = (id) => {
    setSelectedStaffIds((prev) => prev.filter((s) => s !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !anchorDate || !facultyId || !yearLevel || !sourceDetail) {
      setError('Source flow, title, faculty, year, and anchor date are required.')
      return
    }

    setSubmitting(true)
    setError('')

    const { data: flow, error: flowError } = await supabase
      .from('flows')
      .insert({
        title: title.trim(),
        faculty_id: facultyId,
        template_type: sourceDetail.template_type,
        year_level: yearLevel,
        anchor_date: anchorDate,
        created_by: user.id,
        status: 'active',
        imported_from: sourceDetail.id,
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

    const sortedSteps = [...sourceDetail.flow_steps].sort((a, b) => a.sort_order - b.sort_order)
    const stepRows = sortedSteps.map((step, index) => ({
      flow_id: flow.id,
      stage_number: step.stage_number,
      step_number: step.step_number,
      description: step.description,
      default_role: step.default_role,
      due_date: calculateDueDate(anchorDate, step.description, step.stage_number),
      is_custom: step.is_custom,
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
          <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Import previous flow</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Carries over the template type, steps (including custom ones), and tagged staff into a new, independent flow.
          The original flow isn't affected.
        </p>

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

        <label className="mt-4 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Import from</span>
          <select value={sourceFlowId} onChange={(e) => setSourceFlowId(e.target.value)} disabled={!facultyId} className={SELECT_CLASS}>
            <option value="" disabled>
              {facultyId ? 'Select a previous flow…' : 'Select a faculty first'}
            </option>
            {sourceFlows.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title} ({new Date(f.anchor_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })})
              </option>
            ))}
          </select>
          {facultyId && sourceFlows.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">No previous flows found in this faculty yet.</p>
          )}
        </label>

        {loadingSource && <p className="mt-3 text-sm text-slate-400">Loading flow…</p>}

        {sourceDetail && (
          <>
            <p className="mt-3 text-xs text-slate-400">
              {sourceDetail.template_type === 'rubric' ? 'Rubric-based' : 'Comment-based'} ·{' '}
              {sourceDetail.flow_steps.length} steps · {sourceDetail.flow_members.length} staff tagged
            </p>

            <label className="mt-4 block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Title</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} />
            </label>

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
                <span className="text-slate-600 dark:text-slate-300">Anchor date (new task due date)</span>
                <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} className={INPUT_CLASS} />
              </label>
            </div>

            <div className="mt-4">
              <span className="text-sm text-slate-600 dark:text-slate-300">Tag staff</span>
              <p className="text-xs text-slate-400">Pre-filled from the original flow — update names that have changed.</p>
              <div className="mt-1">
                {staff.length === 0 ? (
                  <p className="text-sm text-slate-400">No staff found in this faculty yet.</p>
                ) : (
                  <StaffTagger staff={staff} selectedIds={selectedStaffIds} onAdd={addStaff} onRemove={removeStaff} />
                )}
              </div>
            </div>
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !sourceDetail}
          className="mt-5 w-full rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Importing…' : 'Import flow'}
        </button>
      </form>
    </div>
  )
}
