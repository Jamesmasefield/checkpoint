import { createContext, useContext } from 'react'
import { useFlows } from './useFlows'

const FlowsContext = createContext(null)

// Single shared flows fetch for the whole app shell — Sidebar and the routed
// pages both read from this so a delete/refetch in one place is reflected
// everywhere, instead of each consumer holding its own stale copy.
export function FlowsProvider({ profile, children }) {
  const value = useFlows(profile)
  return <FlowsContext.Provider value={value}>{children}</FlowsContext.Provider>
}

export function useFlowsContext() {
  const ctx = useContext(FlowsContext)
  if (!ctx) throw new Error('useFlowsContext must be used within a FlowsProvider')
  return ctx
}
