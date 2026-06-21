import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Takes the profile to fetch flows "as" — the real logged-in profile
// normally, or an impersonated one during admin "view as" mode. profile.id
// is the same as the underlying auth.users id, so this works for either
// case without needing a separate user id.
export function useFlows(profile) {
  const [flows, setFlows] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFlows = useCallback(() => {
    if (!profile) return

    setLoading(true)

    const myFacultyIds = (profile.faculties ?? []).map((f) => f.id)
    const isFacultyWide = (profile.role === 'lol' || profile.role === 'assistant_lol') && myFacultyIds.length > 0
    const embed = `
      *,
      faculties ( name ),
      flow_steps ( id, due_date, step_completions ( id ) )
    `

    let query = supabase.from('flows').select(embed)

    if (profile.role === 'admin') {
      // school-wide view, no filter
    } else if (isFacultyWide) {
      query = query.in('faculty_id', myFacultyIds)
    } else {
      query = supabase
        .from('flows')
        .select(`${embed}, flow_members!inner(user_id)`)
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
