import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useFlowsContext } from '../hooks/FlowsContext'
import { useProfile } from '../hooks/useProfile'
import { getMilestoneStatus } from '../lib/milestoneStatus'
import StatCard from '../components/ui/StatCard'
import TimelineView from '../components/dashboard/TimelineView'
import CardGridView from '../components/dashboard/CardGridView'
import TaskQueue from '../components/dashboard/TaskQueue'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VIEW_KEY = 'dashboard_view'

function KpiCards({ flows }) {
  const today = new Date().toISOString().slice(0, 10)
  const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const allMilestones = flows.flatMap((f) => f.flow_milestones ?? [])
  const active = flows.filter((f) => !f.archived).length

  let overdue = 0
  let dueSoon = 0
  let totalCompleted = 0
  let total = allMilestones.length

  for (const m of allMilestones) {
    const status = getMilestoneStatus(m)
    if (status === 'overdue')   overdue++
    if (status === 'due-soon')  dueSoon++
    if (status === 'complete')  totalCompleted++
  }

  const avgCompletion = total ? Math.round((totalCompleted / total) * 100) : 0

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="Active flows"       value={active} />
      <StatCard label="Overdue milestones" value={overdue} />
      <StatCard label="Due this week"      value={dueSoon} />
      <StatCard label="Avg completion"     value={`${avgCompletion}%`} />
    </div>
  )
}

export default function Dashboard() {
  const { viewAsProfile } = useOutletContext()
  const { profile: realProfile } = useProfile()
  const { user } = useAuth()
  const effectiveProfile = viewAsProfile ?? realProfile
  const effectiveUserId = viewAsProfile?.id ?? user?.id

  const { flows, loading, refetch } = useFlowsContext()
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) ?? 'card')

  const isTeacher = effectiveProfile?.role === 'teacher'
  const isLol = effectiveProfile?.role === 'lol'
  const canSeeGrid = !isTeacher
  const canDelete = effectiveProfile?.role === 'admin' || effectiveProfile?.role === 'lol'

  function setViewMode(mode) {
    setView(mode)
    localStorage.setItem(VIEW_KEY, mode)
  }

  async function handleDeleteFlow(flow) {
    if (!canDelete) return
    if (!window.confirm(`Delete "${flow.title}"? This cannot be undone.`)) return
    const { error } = await supabase.from('flows').delete().eq('id', flow.id)
    if (error) { console.error('Delete flow:', error); return }
    refetch()
  }

  async function handleToggleMilestone(milestone, flow) {
    if (milestone.requires_all_teachers) {
      const existingSignOff = (milestone.milestone_sign_offs ?? []).find((s) => s.user_id === effectiveUserId)
      if (existingSignOff) {
        await supabase.from('milestone_sign_offs')
          .delete()
          .eq('flow_milestone_id', milestone.id)
          .eq('user_id', effectiveUserId)
        if (milestone.completed_at) {
          await supabase.from('flow_milestones')
            .update({ completed_at: null, completed_by: null })
            .eq('id', milestone.id)
        }
      } else {
        await supabase.from('milestone_sign_offs')
          .insert({ flow_milestone_id: milestone.id, user_id: effectiveUserId })
        const classTeacherCount = (flow.flow_members ?? []).filter((m) => m.role_in_flow === 'class_teacher').length
        const signedAfter = (milestone.milestone_sign_offs ?? []).length + 1
        if (signedAfter >= classTeacherCount) {
          await supabase.from('flow_milestones')
            .update({ completed_at: new Date().toISOString(), completed_by: effectiveUserId })
            .eq('id', milestone.id)
        }
      }
    } else {
      if (milestone.completed_at) {
        await supabase.from('flow_milestones')
          .update({ completed_at: null, completed_by: null })
          .eq('id', milestone.id)
      } else {
        await supabase.from('flow_milestones')
          .update({ completed_at: new Date().toISOString(), completed_by: effectiveUserId })
          .eq('id', milestone.id)
      }
    }
    refetch()
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>

  return (
    <div className="space-y-6">
      <KpiCards flows={flows} />

      {isTeacher ? (
        <>
          <TaskQueue flows={flows} profile={effectiveProfile} onToggle={handleToggleMilestone} />
          {flows.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">My flows</h2>
              <CardGridView flows={flows} />
            </>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {view === 'mytasks' ? 'My tasks' : 'All flows'}
            </h2>
            <div className="flex gap-1 rounded-md border border-[#e5e7eb] p-0.5 dark:border-white/[0.08]">
              {[
                { key: 'card',     label: 'Cards' },
                { key: 'timeline', label: 'Timeline' },
                ...(isLol ? [{ key: 'mytasks', label: 'My Tasks' }] : []),
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setViewMode(key)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    view === key
                      ? 'bg-[#4f6ef7] text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {view === 'mytasks' && isLol ? (
            <TaskQueue
              flows={flows}
              profile={effectiveProfile}
              onToggle={handleToggleMilestone}
              isLol
            />
          ) : (
            <>
              {flows.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No flows yet.</p>
              )}
              {flows.length > 0 && view === 'card'     && <CardGridView flows={flows} onDelete={canDelete ? handleDeleteFlow : undefined} />}
              {flows.length > 0 && view === 'timeline' && <TimelineView flows={flows} />}
            </>
          )}
        </>
      )}
    </div>
  )
}
