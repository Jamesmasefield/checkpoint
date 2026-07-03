import FlowCard from '../flows/FlowCard'

export default function CardGridView({ flows, onDelete }) {
  if (flows.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No active flows.</p>
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {flows.map((flow) => (
        <FlowCard key={flow.id} flow={flow} onDelete={onDelete} />
      ))}
    </div>
  )
}
