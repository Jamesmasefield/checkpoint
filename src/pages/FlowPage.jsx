import { useCallback, useEffect, useState } from 'react'
import { useParams, useOutletContext } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import StageBlock from '../components/flows/StageBlock'
import TaskDetailPanel from '../components/flows/TaskDetailPanel'
import CustomStepForm from '../components/forms/CustomStepForm'
import StatCard from '../components/ui/StatCard'

// Stage names/colours per BRIEF.md's "Stage header colours" section —
// generic across both templates, even though the seeded steps use slightly
// more specific stage labels (e.g. "Canvas & Compass Setup").
const STAGES = [
  { number: 1, title: 'Task Creation & Setup', color: '#22c55e' },
  { number: 2, title: 'Platform Setup', color: '#4f6ef7' },
  { number: 3, title: 'Submission & Marking', color: '#f59e0b' },
  { number: 4, title: 'Comments & Publishing', color: '#fb7185' },
]

// "Teachers should never see steps that are not assigned to their role in
// a given flow" — LoL/Assistant LoL/Admin have full oversight visibility
// (per the brief: Assistant LoL "has visibility of all flow steps"),
// Course Delegate and Classroom Teacher only see steps whose default_role
// text mentions them (e.g. "Course Delegate (LoL oversight)").
const ROLE_LABELS = {
  course_delegate: 'Course Delegate',
  classroom_teacher: 'Classroom Teacher',
}

function isStepVisibleToRole(role, defaultRoleText) {
  if (role === 'admin' || role === 'lol' || role === 'assistant_lol') return true
  const label = ROLE_LABELS[role]
  if (!label) return false
  return (defaultRoleText ?? '').includes(label)
}

export default function FlowPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { viewAsProfile } = useOutletContext()
  const { profile: realProfile } = useProfile()
  const profile = viewAsProfile ?? realProfile
  // Admin "view as" mode is read-only — disable all mutations regardless
  // of what the impersonated role would normally be allowed to do.
  const readOnly = !!viewAsProfile
  const [flow, setFlow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedStepId, setSelectedStepId] = useState(null)
  const [showCustomStepForm, setShowCustomStepForm] = useState(false)

  const fetchFlow = useCallback(() => {
    setLoading(true)
    return supabase
      .from('flows')
      .select(
        `*,
        faculties ( name ),
        flow_steps (
          id, stage_number, step_number, description, default_role, due_date, is_custom, sort_order, assigned_to, reminder_email_body,
          assigned_profile:profiles ( id, full_name, email ),
          step_completions ( id, completed_at, notes, completed_by_profile:profiles ( id, full_name, email ) )
        ),
        flow_members ( id, user_id, role_in_flow, profile:profiles ( id, full_name, email ) )`,
      )
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('FlowPage fetch error:', error)
          setFlow(null)
        } else {
          setFlow(data)
        }
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    fetchFlow()
  }, [fetchFlow])

  const handleToggleStep = async (step) => {
    if (readOnly) return
    const isCompleted = (step.step_completions?.length ?? 0) > 0
    if (isCompleted) {
      await supabase.from('step_completions').delete().eq('step_id', step.id)
    } else {
      await supabase.from('step_completions').insert({ step_id: step.id, completed_by: user.id })
    }
    fetchFlow()
  }

  const handleSaveReminderEmailBody = async (step, body) => {
    if (readOnly) return
    await supabase.from('flow_steps').update({ reminder_email_body: body }).eq('id', step.id)
    fetchFlow()
  }

  const handleDeleteStep = async (step) => {
    if (readOnly) return
    await supabase.from('flow_steps').delete().eq('id', step.id)
    setSelectedStepId(null)
    fetchFlow()
  }

  const handleSaveAssignment = async (step, assignedTo) => {
    if (readOnly) return
    await supabase.from('flow_steps').update({ assigned_to: assignedTo || null }).eq('id', step.id)
    fetchFlow()
  }

  const handleSaveDueDate = async (step, dueDate) => {
    if (readOnly) return
    await supabase.from('flow_steps').update({ due_date: dueDate }).eq('id', step.id)
    fetchFlow()
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading flow…</p>
  if (!flow) return <p className="text-sm text-slate-500 dark:text-slate-400">Flow not found.</p>

  const steps = (flow.flow_steps ?? []).filter((s) => isStepVisibleToRole(profile?.role, s.default_role))
  const totalSteps = steps.length
  const completedSteps = steps.filter((s) => (s.step_completions?.length ?? 0) > 0).length
  const overallProgress = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0
  const today = new Date().toISOString().slice(0, 10)
  const overdueSteps = steps.filter((s) => {
    const isCompleted = (s.step_completions?.length ?? 0) > 0
    return !isCompleted && s.due_date && s.due_date < today
  }).length
  const daysToDeadline = Math.ceil((new Date(flow.anchor_date) - new Date(today)) / 86400000)
  const teacherCount = flow.flow_members?.length ?? 0
  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-slate-900 dark:text-slate-100">{flow.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {flow.faculties?.name ?? 'Unknown faculty'} · Year {flow.year_level} · {teacherCount} teacher{teacherCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {flow.template_type === 'rubric' ? 'Rubric-based' : 'Comment-based'}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Due {new Date(flow.anchor_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowCustomStepForm(true)}
              className="rounded-md border border-[#e5e7eb] px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:bg-white/5"
            >
              + Add Custom Step
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Overall progress" value={`${overallProgress}%`} />
        <StatCard label="Completed steps" value={`${completedSteps}/${totalSteps}`} />
        <StatCard label="Overdue steps" value={overdueSteps} />
        <StatCard label="Days to deadline" value={daysToDeadline} />
      </div>

      <div className="space-y-4">
        {STAGES.map((stage) => {
          const stageSteps = steps.filter((s) => s.stage_number === stage.number).sort((a, b) => a.sort_order - b.sort_order)
          if (stageSteps.length === 0) return null

          return (
            <StageBlock
              key={stage.number}
              title={`Stage ${stage.number} — ${stage.title}`}
              colorHex={stage.color}
              steps={stageSteps}
              onToggleStep={handleToggleStep}
              onSelectStep={(step) => setSelectedStepId(step.id)}
              readOnly={readOnly}
            />
          )
        })}
      </div>

      {selectedStep && (
        <TaskDetailPanel
          step={selectedStep}
          profile={profile}
          readOnly={readOnly}
          flowMembers={flow.flow_members ?? []}
          onClose={() => setSelectedStepId(null)}
          onToggle={handleToggleStep}
          onDeleteStep={handleDeleteStep}
          onSaveReminderEmailBody={handleSaveReminderEmailBody}
          onSaveAssignment={handleSaveAssignment}
          onSaveDueDate={handleSaveDueDate}
        />
      )}

      {showCustomStepForm && (
        <CustomStepForm
          flow={flow}
          onClose={() => setShowCustomStepForm(false)}
          onCreated={() => {
            setShowCustomStepForm(false)
            fetchFlow()
          }}
        />
      )}
    </div>
  )
}
