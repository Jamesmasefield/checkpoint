import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Fetches subjects with their courses and classes.
// facultyId: optional filter — if omitted, fetches all subjects (admin use).
export function useSubjects(facultyId) {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    let query = supabase
      .from('subjects')
      .select(`
        id, name, faculty_id, created_at,
        faculties ( id, name ),
        subject_lols ( user_id, profiles!subject_lols_user_id_fkey ( id, full_name, email ) ),
        subject_staff ( user_id, profiles!subject_staff_user_id_fkey ( id, full_name, email ) ),
        courses (
          id, name, year_level, created_at,
          classes (
            id, code, name, created_at,
            class_teachers ( user_id, profiles!class_teachers_user_id_fkey ( id, full_name, email ) )
          )
        )
      `)
      .order('name')

    if (facultyId) {
      query = query.eq('faculty_id', facultyId)
    }

    query.then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        console.error('useSubjects fetch error:', error)
        setSubjects([])
      } else {
        setSubjects(data)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [facultyId])

  return { subjects, loading }
}
