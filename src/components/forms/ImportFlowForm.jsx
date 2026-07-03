import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useBlackouts } from '../../hooks/useBlackouts'
import { buildMilestoneDates } from '../../lib/deadlines'
import { SELECT_CLASS, INPUT_CLASS } from '../../lib/formStyles'
import { ASSIGNEE_LABEL } from '../../lib/milestoneStatus'

const fmt = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function ImportFlowForm({ onClose, onCreated }) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { blackouts } = useBlackouts()

  const [sourceFlows, setSourceFlows]     = useState([])
  const [sourceFlowId, setSourceFlowId]   = useState('')
  const [sourceDetail, setSourceDetail]   = useState(null)
  const [loadingSource, setLoadingSource] = useState(false)

  const [title, setTitle]           = useState('')
  const [anchorDate, setAnchorDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  // Load all flows visible to this user as import sources.
  useEffect(() => {
    const myFacultyIds = (profile?.faculties ?? []).map((f) => f.id)
    const isAdmin = profile?.role === 'admin'

    let query = supabase
      .from('flows')
      .select('id, title, anchor_date, template_type, faculties ( name ), subjects ( name ), courses ( year_level )')
      .order('anchor_date', { ascending: false })

    if (!isAdmin && myFacultyIds.length > 0) {
      query = query.in('faculty_id', myFacultyIds)
    }

    query.then(({ data, err }) => {
      if (!err) setSourceFlows(data ?? [])
    })
  }, [profile])

  // Load selected source flow's milestones and classes.
  useEffect(() => {
    if (!sourceFlowId) { setSourceDetail(null); return }
    setLoadingSource(true)
    supabase
      .from('flows')
      .select(`
        id, title, template_type, faculty_id, course_id, template_id, anchor_date,
        flow_milestones (
          id, stage_number, sort_order, title, description,
          assignee_mode, recipient_mode, offset_days, is_reporting_due, is_custom, due_date
        ),
        flow_classes ( class_id )
      `)
      .eq('id', sourceFlowId)
      .single()
      .then(({ data, error: fetchErr }) => {
        setLoadingSource(false)
        if (fetchErr) { setError(fetchErr.message); return }
        setSourceDetail(data)
        setTitle(data.title)
      })
  }, [sourceFlowId])

  // Preview milestones with new anchor date applied.
  const previewMilestones = (() => {
    if (!sourceDetail || !anchorDate) return []
    const templateMilestones = (sourceDetail.flow_milestones ?? [])
      .filter((m) => !m.is_custom && m.offset_days != null)
    const resolved = buildMilestoneDates(templateMilestones, anchorDate, blackouts)
    const dateById = Object.fromEntries(resolved.map((m) => [m.id, m.due_date]))
    return (sourceDetail.flow_milestones ?? [])
      .sort((a, b) => a.stage_number - b.stage_number || a.sort_order - b.sort_order)
      .map((m) => ({
        ...m,
        due_date: m.is_custom ? m.due_date : (dateById[m.id] ?? m.due_date),
      }))
  })()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim() || !anchorDate || !sourceDetail) {
      setError('Source flow, title, and new assessment date are required.')
      return
    }
    setSubmitting(true)
    setError('')

    const { data: flow, error: flowErr } = await supabase
      .from('flows')
      .insert({
        title:          title.trim(),
        faculty_id:     sourceDetail.faculty_id,
        course_id:      sourceDetail.course_id,
        template_id:    sourceDetail.template_id,
        template_type:  sourceDetail.template_type,
        anchor_date:    anchorDate,
        created_by:     user.id,
        status:         'active',
        imported_from:  sourceDetail.id,
      })
      .select()
      .single()

    if (flowErr) { setError(flowErr.message); setSubmitting(false); return }

    // Copy class links.
    const classIds = (sourceDetail.flow_classes ?? []).map((fc) => fc.class_id)
    if (classIds.length > 0) {
      const { error: classErr } = await supabase
        .from('flow_classes')
        .insert(classIds.map((cid) => ({ flow_id: flow.id, class_id: cid })))
      if (classErr) { setError(classErr.message); setSubmitting(false); return }
    }

    // Insert milestones with recalculated dates.
    const milestoneRows = previewMilestones.map((m) => ({
      flow_id:          flow.id,
      stage_number:     m.stage_number,
      sort_order:       m.sort_order,
      title:            m.title,
      description:      m.description,
      assignee_mode:    m.assignee_mode,
      recipient_mode:   m.recipient_mode,
      due_date:         m.due_date,
      is_reporting_due: m.is_reporting_due,
      offset_days:      m.offset_days,
      is_custom:        m.is_custom,
    }))
    const { error: msErr } = await supabase.from('flow_milestones').insert(milestoneRows)
    if (msErr) { setError(msErr.message); setSubmitting(false); return }

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
          <div>
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Import previous flow</h2>
            <p className="mt-0.5 text-xs text-slate-400">Copies milestones from an existing flow with a new assessment date.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        </div>

        <label className="mt-5 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Import from</span>
          <select value={sourceFlowId} onChange={(e) => setSourceFlowId(e.target.value)} className={SELECT_CLASS}>
            <option value="" disabled>Select a previous flow…</option>
            {sourceFlows.map((f) => {
              const subject  = f.subjects?.name ?? f.faculties?.name ?? ''
              const year     = f.courses?.year_level ? `Year ${f.courses.year_level}` : ''
              const meta     = [subject, year].filter(Boolean).join(' · ')
              return (
                <option key={f.id} value={f.id}>
                  {f.title}{meta ? ` — ${meta}` : ''} · {fmt(f.anchor_date)}
                </option>
              )
            })}
          </select>
          {sourceFlows.length === 0 && <p className="mt-1 text-xs text-slate-400">No flows found yet.</p>}
        </label>

        {loadingSource && <p className="mt-3 text-xs text-slate-400">Loading flow…</p>}

        {sourceDetail && (
          <>
            <p className="mt-2 text-xs text-slate-400">
              {sourceDetail.template_type === 'rubric' ? 'Rubric-based' : 'Comment-based'} ·{' '}
              {sourceDetail.flow_milestones?.length ?? 0} milestones ·{' '}
              {sourceDetail.flow_classes?.length ?? 0} class{sourceDetail.flow_classes?.length !== 1 ? 'es' : ''} linked
            </p>

            <label className="mt-4 block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Title</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} />
            </label>

            <label className="mt-4 block text-sm">
              <span className="text-slate-600 dark:text-slate-300">New assessment date</span>
              <input type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} className={INPUT_CLASS} />
            </label>

            {anchorDate && previewMilestones.length > 0 && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Milestone preview</p>
                <div className="max-h-48 overflow-auto rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-[#e5e7eb] dark:divide-white/[0.08]">
                      {previewMilestones.map((m) => (
                        <tr key={m.id}>
                          <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">{m.title}</td>
                          <td className="px-3 py-1.5 text-slate-400">{ASSIGNEE_LABEL[m.assignee_mode] ?? m.assignee_mode}</td>
                          <td className="px-3 py-1.5 text-slate-400">{fmt(m.due_date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !sourceDetail || !anchorDate || !title.trim()}
          className="mt-5 w-full rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Importing…' : 'Import flow'}
        </button>
      </form>
    </div>
  )
}
