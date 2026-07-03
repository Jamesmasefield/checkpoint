import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Fetches all blackout weeks, sorted by start date.
// Used by the flow creation wizard to preview and resolve milestone dates.
export function useBlackouts() {
  const [blackouts, setBlackouts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('blackout_weeks')
      .select('id, name, start_date, end_date')
      .order('start_date')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('useBlackouts fetch error:', error)
          setBlackouts([])
        } else {
          setBlackouts(data)
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { blackouts, loading }
}
