import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// A flow belongs to exactly one faculty, but a person can now belong to
// several (or, for admin, none) — so creating/importing a flow needs an
// explicit picker whenever there's more than one faculty to choose from.
// Someone with exactly one faculty gets it pre-selected with no picker shown.
export function useFacultyPicker(profile) {
  const myFaculties = profile?.faculties ?? []
  const isAdmin = profile?.role === 'admin'
  const needsPicker = isAdmin || myFaculties.length !== 1

  const [facultyId, setFacultyId] = useState(myFaculties.length === 1 ? myFaculties[0].id : '')
  const [allFaculties, setAllFaculties] = useState([])

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('faculties')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (!error) setAllFaculties(data)
      })
  }, [isAdmin])

  const options = isAdmin ? allFaculties : myFaculties

  return { facultyId, setFacultyId, needsPicker, options }
}
