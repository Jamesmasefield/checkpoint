import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    supabase
      .from('templates')
      .select(`
        id, name, template_type, faculty_id, created_by, created_at,
        faculties ( name ),
        template_milestones (
          id, stage_number, sort_order, title, description,
          offset_days, assignee_mode, recipient_mode, is_reporting_due,
          requires_all_teachers, default_email_subject, default_email_body
        )
      `)
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('useTemplates fetch error:', error)
          setTemplates([])
        } else {
          setTemplates(
            data.map((t) => ({
              ...t,
              template_milestones: [...t.template_milestones].sort(
                (a, b) => a.sort_order - b.sort_order
              ),
            }))
          )
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  return { templates, loading, refetch }
}
