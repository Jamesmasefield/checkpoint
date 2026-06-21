import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('profiles')
      .select('id, full_name, email, role, profile_faculties ( faculties ( id, name ) )')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('useProfile fetch error:', error)
          setProfile(null)
        } else {
          // Faculty affiliation is many-to-many (profile_faculties) — flatten
          // into profile.faculties: [{id, name}] for consumers.
          const { profile_faculties, ...rest } = data
          setProfile({ ...rest, faculties: profile_faculties.map((pf) => pf.faculties) })
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return { profile, loading }
}
