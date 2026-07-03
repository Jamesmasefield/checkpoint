import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useTemplates } from '../hooks/useTemplates'
import TemplateBuilder from '../components/templates/TemplateBuilder'
import { INPUT_CLASS, SELECT_CLASS } from '../lib/formStyles'

function NewTemplateModal({ onClose, onCreated }) {
  const { profile } = useProfile()
  const [name, setName]                 = useState('')
  const [templateType, setTemplateType] = useState('comment')
  const [facultyId, setFacultyId]       = useState('')
  const [faculties, setFaculties]       = useState([])
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')

  useEffect(() => {
    supabase.from('faculties').select('id, name').order('name').then(({ data }) => {
      if (data) setFaculties(data)
    })
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Name required.'); return }
    setSaving(true)

    const { data, error: insertErr } = await supabase
      .from('templates')
      .insert({
        name:          name.trim(),
        template_type: templateType,
        created_by:    profile?.id,
        faculty_id:    facultyId || null,
      })
      .select()
      .single()

    if (insertErr) { setSaving(false); setError(insertErr.message); return }

    // Find the matching school-wide base template and copy its milestones.
    const baseName = templateType === 'rubric' ? 'Rubric-based (Canvas)' : 'Comment-based (Non-Rubric)'
    const { data: baseTemplate } = await supabase
      .from('templates')
      .select('id')
      .eq('name', baseName)
      .is('subject_id', null)
      .single()

    let seedMilestones = []
    if (baseTemplate) {
      const { data: baseMilestones } = await supabase
        .from('template_milestones')
        .select('*')
        .eq('template_id', baseTemplate.id)
        .order('sort_order')

      if (baseMilestones?.length) {
        const rows = baseMilestones.map(({ id: _id, template_id: _tid, ...m }) => ({
          ...m,
          template_id: data.id,
        }))
        const { data: inserted } = await supabase
          .from('template_milestones')
          .insert(rows)
          .select()
        seedMilestones = inserted ?? []
      }
    }

    setSaving(false)
    onCreated({ ...data, template_milestones: seedMilestones })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-[#161b27]"
      >
        <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">New template</h2>

        <label className="mt-4 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Template name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} placeholder="e.g. Rubric Assessment Template" />
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Type</span>
          <select value={templateType} onChange={(e) => setTemplateType(e.target.value)} className={SELECT_CLASS}>
            <option value="comment">Comment-based</option>
            <option value="rubric">Rubric-based</option>
          </select>
        </label>

        <label className="mt-3 block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Faculty</span>
          <select value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className={SELECT_CLASS}>
            <option value="">School-wide (all faculties)</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>

        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-[#e5e7eb] px-3 py-2 text-sm dark:border-white/[0.08] dark:text-slate-300">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? 'Saving…' : 'Create'}</button>
        </div>
      </form>
    </div>
  )
}

export default function TemplatesPage() {
  const { viewAsProfile } = useOutletContext()
  const { profile: realProfile } = useProfile()
  const isAdmin = realProfile?.role === 'admin' && !viewAsProfile
  const isLol   = realProfile?.role === 'lol'   && !viewAsProfile
  const canCreate = (isAdmin || isLol)
  const lolFacultyIds = realProfile?.faculties?.map((f) => f.id) ?? []
  const canEditTemplate = (t) => isAdmin || (isLol && t.faculty_id && lolFacultyIds.includes(t.faculty_id))

  const { templates, loading, refetch } = useTemplates()

  const [showNew, setShowNew]                   = useState(false)
  const [buildingTemplate, setBuildingTemplate] = useState(null)
  const [deletingTemplate, setDeletingTemplate] = useState(null)
  const [deleting, setDeleting]                 = useState(false)

  async function handleDelete() {
    if (!deletingTemplate) return
    setDeleting(true)
    await supabase.from('template_milestones').delete().eq('template_id', deletingTemplate.id)
    await supabase.from('templates').delete().eq('id', deletingTemplate.id)
    setDeleting(false)
    setDeletingTemplate(null)
    refetch()
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Templates</h2>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white"
          >
            + New template
          </button>
        )}
      </div>

      {templates.length === 0 && (
        <p className="text-sm text-slate-400">No templates yet.</p>
      )}

      <div className="space-y-2">
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg border border-[#e5e7eb] px-4 py-3 dark:border-white/[0.08]"
          >
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.name}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {t.template_type === 'rubric' ? 'Rubric-based' : 'Comment-based'} ·{' '}
                {t.template_milestones?.length ?? 0} milestones ·{' '}
                {t.faculties?.name ? `Faculty: ${t.faculties.name}` : 'School-wide'}
              </p>
            </div>
            {canEditTemplate(t) && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBuildingTemplate(t)}
                  className="rounded-md bg-[#4f6ef7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3d5ce5] active:bg-[#3251d4]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingTemplate(t)}
                  className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 active:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showNew && (
        <NewTemplateModal
          onClose={() => setShowNew(false)}
          onCreated={(t) => { setShowNew(false); refetch(); setBuildingTemplate(t) }}
        />
      )}

      {buildingTemplate && (
        <TemplateBuilder
          template={buildingTemplate}
          onClose={() => setBuildingTemplate(null)}
          onSaved={() => { setBuildingTemplate(null); refetch() }}
        />
      )}

      {deletingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setDeletingTemplate(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-[#161b27]">
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Delete template?</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-200">{deletingTemplate.name}</span> and all its milestones will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingTemplate(null)} className="rounded-md border border-[#e5e7eb] px-3 py-2 text-sm dark:border-white/[0.08] dark:text-slate-300">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
