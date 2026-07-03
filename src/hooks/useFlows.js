import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useFlows(profile) {
  const [flows, setFlows] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFlows = useCallback(() => {
    if (!profile) return

    setLoading(true)

    const myFacultyIds = (profile.faculties ?? []).map((f) => f.id)
    const isAdmin = profile.role === 'admin'
    const isLol   = profile.role === 'lol'

    const baseEmbed = `
      *,
      faculties ( name ),
      subjects ( name ),
      courses ( year_level ),
      flow_milestones ( id, title, due_date, completed_at, assignee_mode, requires_all_teachers, milestone_sign_offs ( user_id ) )
    `

    let query

    if (isAdmin) {
      query = supabase.from('flows').select(`${baseEmbed}, flow_members ( user_id, role_in_flow )`)
    } else if (isLol && myFacultyIds.length > 0) {
      query = supabase.from('flows').select(`${baseEmbed}, flow_members ( user_id, role_in_flow )`)
        .in('faculty_id', myFacultyIds)
    } else {
      // Teachers: inner join filters to flows they belong to; also returns role_in_flow for sign-off counts.
      query = supabase
        .from('flows')
        .select(`${baseEmbed}, flow_members!inner(user_id, role_in_flow)`)
        .eq('flow_members.user_id', profile.id)
    }

    return query.order('anchor_date', { ascending: true }).then(({ data, error }) => {
      if (error) {
        console.error('useFlows fetch error:', error)
        setFlows([])
      } else {
        setFlows(data)
      }
      setLoading(false)
    })
  }, [profile])

  useEffect(() => {
    fetchFlows()
  }, [fetchFlows])

  return { flows, loading, refetch: fetchFlows }
}
