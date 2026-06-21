import { useOutletContext } from 'react-router-dom'
import { useFlows } from '../hooks/useFlows'
import { useProfile } from '../hooks/useProfile'
import FlowCard from '../components/flows/FlowCard'
import StatCard from '../components/ui/StatCard'

export default function Dashboard() {
  const { viewAsProfile } = useOutletContext()
  const { profile: realProfile } = useProfile()
  const { flows, loading } = useFlows(viewAsProfile ?? realProfile)

  const allSteps = flows.flatMap((f) => f.flow_steps ?? [])
  const totalSteps = allSteps.length
  const completedSteps = allSteps.filter((s) => (s.step_completions?.length ?? 0) > 0).length
  const today = new Date().toISOString().slice(0, 10)
  const overdueSteps = allSteps.filter((s) => {
    const isCompleted = (s.step_completions?.length ?? 0) > 0
    return !isCompleted && s.due_date && s.due_date < today
  }).length
  const overallProgress = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading flows…</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Flows" value={flows.length} />
        <StatCard label="Overall progress" value={`${overallProgress}%`} />
        <StatCard label="Steps completed" value={`${completedSteps}/${totalSteps}`} />
        <StatCard label="Overdue steps" value={overdueSteps} />
      </div>

      {flows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No flows yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <FlowCard key={flow.id} flow={flow} />
          ))}
        </div>
      )}
    </div>
  )
}
