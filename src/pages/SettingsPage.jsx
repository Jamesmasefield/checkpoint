import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../hooks/useAuth'

function BlackoutRow({ bw, onDelete, onEdit }) {
  const fmt = (d) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
      <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">{bw.name}</td>
      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{fmt(bw.start_date)}</td>
      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{fmt(bw.end_date)}</td>
      <td className="px-4 py-2">
        <div className="flex gap-3">
          <button type="button" onClick={() => onEdit(bw)} className="text-xs text-[#4f6ef7] hover:underline">Edit</button>
          <button type="button" onClick={() => onDelete(bw.id)} className="text-xs text-red-500 hover:underline">Delete</button>
        </div>
      </td>
    </tr>
  )
}

function BlackoutForm({ bw, onSave, onCancel }) {
  const [name, setName]             = useState(bw?.name ?? '')
  const [startDate, setStartDate]   = useState(bw?.start_date ?? '')
  const [endDate, setEndDate]       = useState(bw?.end_date ?? '')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !startDate || !endDate) { setError('All fields required.'); return }
    if (endDate < startDate) { setError('End date must be on or after start date.'); return }
    setSaving(true)
    if (bw?.id) {
      const { error: err } = await supabase.from('blackout_weeks').update({ name: name.trim(), start_date: startDate, end_date: endDate }).eq('id', bw.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('blackout_weeks').insert({ name: name.trim(), start_date: startDate, end_date: endDate })
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaving(false)
    onSave()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-[#4f6ef7]/30 bg-[#4f6ef7]/5 p-4 dark:bg-[#4f6ef7]/10">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Term 2 Holidays"
            className="mt-1 block w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#0f1117] dark:text-slate-200"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">Start date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#0f1117] dark:text-slate-200"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600 dark:text-slate-300">End date</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#0f1117] dark:text-slate-200"
          />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={saving} className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
          {saving ? 'Saving…' : (bw?.id ? 'Update' : 'Add blackout week')}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-[#e5e7eb] px-3 py-2 text-sm dark:border-white/[0.08] dark:text-slate-300">Cancel</button>
      </div>
    </form>
  )
}

export default function SettingsPage() {
  const { profile, loading: profileLoading } = useProfile()
  const { updatePassword } = useAuth()
  const [blackouts, setBlackouts]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwStatus, setPwStatus]               = useState('idle') // idle | saving | saved | error
  const [pwError, setPwError]                 = useState('')
  const [dueSoonDays, setDueSoonDays] = useState(5)
  const [savingDays, setSavingDays] = useState(false)
  const [daysSaved, setDaysSaved]   = useState(false)
  const [adding, setAdding]         = useState(false)
  const [editing, setEditing]       = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingAll, setDeletingAll]     = useState(false)
  const [exporting, setExporting]         = useState(false)
  const [importPreview, setImportPreview] = useState(null)
  const [importing, setImporting]         = useState(false)
  const [importError, setImportError]     = useState('')
  const importInputRef = useRef(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: bwData }, { data: settingsData }] = await Promise.all([
      supabase.from('blackout_weeks').select('id, name, start_date, end_date').order('start_date'),
      supabase.from('settings').select('due_soon_days').limit(1).maybeSingle(),
    ])
    setBlackouts(bwData ?? [])
    if (settingsData?.due_soon_days != null) setDueSoonDays(settingsData.due_soon_days)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleDeleteBlackout(id) {
    await supabase.from('blackout_weeks').delete().eq('id', id)
    fetchData()
  }

  async function handleDeleteAllFlows() {
    setDeletingAll(true)
    const { error } = await supabase.from('flows').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setDeletingAll(false)
    setConfirmDelete(false)
    if (error) console.error('Delete all flows:', error)
  }

  async function saveDueSoonDays() {
    setSavingDays(true)
    await supabase.from('settings').upsert({ id: 1, due_soon_days: Number(dueSoonDays) })
    setSavingDays(false)
    setDaysSaved(true)
    setTimeout(() => setDaysSaved(false), 2000)
  }

  async function handleExport() {
    setExporting(true)
    const [
      { data: templates },
      { data: templateMilestones },
      { data: flows },
      { data: flowMilestones },
      { data: flowMembers },
      { data: flowClasses },
    ] = await Promise.all([
      supabase.from('templates').select('*'),
      supabase.from('template_milestones').select('*'),
      supabase.from('flows').select('*'),
      supabase.from('flow_milestones').select('*'),
      supabase.from('flow_members').select('*'),
      supabase.from('flow_classes').select('*'),
    ])
    const payload = {
      exported_at: new Date().toISOString(),
      version: 1,
      templates:          templates          ?? [],
      template_milestones: templateMilestones ?? [],
      flows:              flows              ?? [],
      flow_milestones:    flowMilestones     ?? [],
      flow_members:       flowMembers        ?? [],
      flow_classes:       flowClasses        ?? [],
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `checkpoint-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.version || !data.exported_at) throw new Error('Invalid backup file.')
      setImportPreview(data)
    } catch (err) {
      setImportError(err.message)
    }
    e.target.value = ''
  }

  async function confirmImport() {
    const d = importPreview
    setImporting(true)
    setImportError('')
    try {
      if (d.templates?.length)          await supabase.from('templates').upsert(d.templates, { onConflict: 'id' })
      if (d.template_milestones?.length) await supabase.from('template_milestones').upsert(d.template_milestones, { onConflict: 'id' })
      if (d.flows?.length)              await supabase.from('flows').upsert(d.flows, { onConflict: 'id' })
      if (d.flow_members?.length)       await supabase.from('flow_members').upsert(d.flow_members, { onConflict: 'id' })
      if (d.flow_classes?.length)       await supabase.from('flow_classes').upsert(d.flow_classes, { onConflict: 'flow_id,class_id' })
      if (d.flow_milestones?.length)    await supabase.from('flow_milestones').upsert(d.flow_milestones, { onConflict: 'id' })
      setImportPreview(null)
    } catch (err) {
      setImportError(err.message)
    }
    setImporting(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.')
      return
    }
    setPwStatus('saving')
    const { error } = await updatePassword(newPassword)
    if (error) {
      setPwError(error.message)
      setPwStatus('error')
      return
    }
    setPwStatus('saved')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPwStatus('idle'), 3000)
  }

  if (profileLoading || loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-medium text-slate-900 dark:text-slate-100">Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isAdmin ? 'Blackout weeks, reminder lead time, and system info.' : 'Manage your account.'}
        </p>
      </div>

      {/* Change password — visible to all users */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Change password</h3>
        <form onSubmit={handleChangePassword} className="max-w-sm space-y-2">
          <input
            type="password"
            required
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="block w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
          />
          <input
            type="password"
            required
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="block w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
          />
          {pwError && <p className="text-xs text-red-500">{pwError}</p>}
          <button
            type="submit"
            disabled={pwStatus === 'saving'}
            className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pwStatus === 'saving' ? 'Saving…' : pwStatus === 'saved' ? 'Password updated' : 'Update password'}
          </button>
        </form>
      </section>

      {isAdmin && (<>

      {/* Blackout weeks */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Blackout weeks</h3>
          {!adding && !editing && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="text-sm text-[#4f6ef7] hover:underline"
            >
              + Add blackout week
            </button>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Milestone due dates are automatically pushed past blackout weeks when flows are created.
          Editing a blackout week does not retroactively adjust existing flow milestone dates.
        </p>

        {adding && (
          <BlackoutForm
            bw={null}
            onSave={() => { setAdding(false); fetchData() }}
            onCancel={() => setAdding(false)}
          />
        )}
        {editing && (
          <BlackoutForm
            bw={editing}
            onSave={() => { setEditing(null); fetchData() }}
            onCancel={() => setEditing(null)}
          />
        )}

        <div className="overflow-x-auto rounded-lg border border-[#e5e7eb] dark:border-white/[0.08]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Start</th>
                <th className="px-4 py-2">End</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e7eb] dark:divide-white/[0.08]">
              {blackouts.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-3 text-slate-400">No blackout weeks defined.</td></tr>
              )}
              {blackouts.map((bw) => (
                <BlackoutRow
                  key={bw.id}
                  bw={bw}
                  onDelete={handleDeleteBlackout}
                  onEdit={(b) => { setEditing(b); setAdding(false) }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reminder lead time */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Reminder lead time</h3>
        <p className="text-xs text-slate-400">
          How many days before a milestone's due date the "due soon" status activates and the first auto-reminder fires.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={30}
            value={dueSoonDays}
            onChange={(e) => setDueSoonDays(e.target.value)}
            className="w-20 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200"
          />
          <span className="text-sm text-slate-500 dark:text-slate-400">days</span>
          <button
            type="button"
            onClick={saveDueSoonDays}
            disabled={savingDays}
            className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {savingDays ? 'Saving…' : daysSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </section>

      {/* App URL */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">App URL</h3>
        <p className="text-xs text-slate-400">
          Used in reminder email links. Update the <code className="rounded bg-slate-100 px-1 dark:bg-white/10">APP_URL</code> Edge Function secret if the Netlify domain changes.
        </p>
        <p className="rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-slate-500 dark:border-white/[0.08] dark:text-slate-400">
          {window.location.origin}
        </p>
      </section>

      {/* Data backup */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Data backup</h3>
          <p className="mt-1 text-xs text-slate-400">
            Export all templates and assessments as a JSON file. To restore, import a backup — existing records are updated, new records are added, nothing is deleted.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white hover:bg-[#3d5ce5] disabled:opacity-60"
          >
            {exporting ? 'Exporting…' : 'Export backup'}
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className="rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/5"
          >
            Import backup
          </button>
          <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          {importError && <p className="text-xs text-red-500">{importError}</p>}
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-3 rounded-lg border border-red-200 p-4 dark:border-red-900/40">
        <div>
          <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Danger zone</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            These actions are permanent and cannot be undone. Use at the end of the school year to reset all assessment flows.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-md border border-red-100 bg-red-50/50 px-4 py-3 dark:border-red-900/30 dark:bg-red-900/10">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Delete all assessments</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Permanently removes every flow, milestone, and member record from the system.
            </p>
          </div>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="shrink-0 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              Delete all
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Are you sure?</span>
              <button
                type="button"
                onClick={handleDeleteAllFlows}
                disabled={deletingAll}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingAll ? 'Deleting…' : 'Yes, delete all'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-[#e5e7eb] px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setImportPreview(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-[#161b27]">
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Import backup?</h2>
            <p className="mt-1 text-xs text-slate-400">
              Exported {new Date(importPreview.exported_at).toLocaleString('en-AU')}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <li>{importPreview.templates?.length ?? 0} templates</li>
              <li>{importPreview.template_milestones?.length ?? 0} template milestones</li>
              <li>{importPreview.flows?.length ?? 0} assessments</li>
              <li>{importPreview.flow_milestones?.length ?? 0} assessment milestones</li>
              <li>{importPreview.flow_members?.length ?? 0} assessment members</li>
            </ul>
            <p className="mt-3 text-xs text-slate-400">
              Existing records with matching IDs will be updated. New records will be added. Nothing is deleted.
            </p>
            {importError && <p className="mt-2 text-xs text-red-500">{importError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setImportPreview(null)} className="rounded-md border border-[#e5e7eb] px-3 py-2 text-sm dark:border-white/[0.08] dark:text-slate-300">Cancel</button>
              <button type="button" onClick={confirmImport} disabled={importing} className="rounded-md bg-[#4f6ef7] px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>)}
    </div>
  )
}
