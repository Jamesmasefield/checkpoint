/**
 * Checkpoint — Class Hierarchy Import
 * -------------------------------------
 * Populates the Faculty → Subject → Course → Class hierarchy from the
 * embedded CLASS_DATA array. Safe to re-run: uses find-or-create at every
 * level so no duplicates are produced.
 *
 * Usage:
 *   node scripts/import-classes.mjs
 *
 * Prerequisites:
 *   VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.
 *   Faculties must already exist in the database (run import-staff.mjs or
 *   create them via Admin → Settings first).
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Faculty name normalisation ───────────────────────────────────────────────
// Maps raw source values to the canonical names stored in the faculties table.

const FACULTY_NAME_MAP = {
  PeformingArts:   'Performing Arts',
  Diverse_Learning: 'Diverse Learning',
  VisualArts:      'Visual Arts',
}

function normaliseFaculty(raw) {
  return FACULTY_NAME_MAP[raw] ?? raw
}

// ─── Year-level extraction ────────────────────────────────────────────────────
// Reads the leading digit(s) from a class code. e.g. "11MHI1" → 11, "7ART1" → 7.

function yearFromCode(code) {
  const m = code.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

// ─── Class data ───────────────────────────────────────────────────────────────

const CLASS_DATA = [
  { faculty: 'VisualArts', subject: 'Visual Arts', code: '7ART1' },
  { faculty: 'TAS', subject: 'Technology (Digital Technologies)', code: '7DTE1' },
  { faculty: 'English', subject: 'English', code: '7ENG1' },
  { faculty: 'TAS', subject: 'Technology (Food & Agriculture)', code: '7FAA1' },
  { faculty: 'HSIE', subject: 'Geography', code: '7GEO1' },
  { faculty: 'HSIE', subject: 'History', code: '7HIS1' },
  { faculty: 'Maths', subject: 'Mathematics', code: '7MAT1' },
  { faculty: 'PeformingArts', subject: 'Music', code: '7MUS1' },
  { faculty: 'PDHPE', subject: 'PDHPE', code: '7PDH1' },
  { faculty: 'Religion', subject: 'Religion', code: '7REL1' },
  { faculty: 'Science', subject: 'Science', code: '7SCI1' },
  { faculty: 'VisualArts', subject: 'Visual Arts', code: '8ART1' },
  { faculty: 'English', subject: 'English', code: '8ENG1' },
  { faculty: 'TAS', subject: 'Technology (Engineered Systems)', code: '8ESY1' },
  { faculty: 'LOTE', subject: 'French', code: '8FRE1' },
  { faculty: 'HSIE', subject: 'Geography', code: '8GEO1' },
  { faculty: 'HSIE', subject: 'History', code: '8HIS1' },
  { faculty: 'Maths', subject: 'Mathematics', code: '8MAT1' },
  { faculty: 'TAS', subject: 'Technology (Material Technologies)', code: '8MTE1' },
  { faculty: 'PeformingArts', subject: 'Music', code: '8MUS1' },
  { faculty: 'PDHPE', subject: 'PDHPE', code: '8PDH1' },
  { faculty: 'Religion', subject: 'Religion', code: '8REL1' },
  { faculty: 'Science', subject: 'Science', code: '8SCI1' },
  { faculty: 'VisualArts', subject: 'Visual Arts', code: '9ART1' },
  { faculty: 'HSIE', subject: 'Commerce', code: '9COM1' },
  { faculty: 'TAS', subject: 'Computing Technology', code: '9CTE1' },
  { faculty: 'PeformingArts', subject: 'Lights, Camera, Action (Drama)', code: '9DRA1' },
  { faculty: 'English', subject: 'English', code: '9ENG1' },
  { faculty: 'LOTE', subject: 'French', code: '9FRE1' },
  { faculty: 'TAS', subject: 'Food Technology', code: '9FTE1' },
  { faculty: 'HSIE', subject: 'Geography', code: '9GEO1' },
  { faculty: 'HSIE', subject: 'History', code: '9HIS1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Metal)', code: '9ITM1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Timber)', code: '9ITT1' },
  { faculty: 'Maths', subject: 'Mathematics Advanced Pathway', code: '9MAA1' },
  { faculty: 'Maths', subject: 'Mathematics Core', code: '9MAC1' },
  { faculty: 'Science', subject: 'Marine & Aquaculture Technology', code: '9MAR1' },
  { faculty: 'Maths', subject: 'Mathematics Standard Pathway', code: '9MAS1' },
  { faculty: 'Diverse_Learning', subject: 'Mentoring', code: '9MEN1' },
  { faculty: 'PeformingArts', subject: 'Music', code: '9MUS1' },
  { faculty: 'PDHPE', subject: 'Physical Activity & Sport Studies', code: '9PAS1' },
  { faculty: 'PDHPE', subject: 'PDHPE', code: '9PDH1' },
  { faculty: 'Religion', subject: 'Religion', code: '9REL1' },
  { faculty: 'Science', subject: 'Science', code: '9SCI1' },
  { faculty: 'TAS', subject: 'iSTEM', code: '9STE1' },
  { faculty: 'HSIE', subject: 'Aboriginal Studies', code: '10ABS1' },
  { faculty: 'HSIE', subject: 'Commerce', code: '10COM1' },
  { faculty: 'TAS', subject: 'Computing Technology', code: '10CTE1' },
  { faculty: 'PeformingArts', subject: 'Lights, Camera, Action (Drama)', code: '10DRA1' },
  { faculty: 'English', subject: 'English', code: '10ENG1' },
  { faculty: 'TAS', subject: 'Food Technology', code: '10FTE1' },
  { faculty: 'HSIE', subject: 'Geography', code: '10GEO1' },
  { faculty: 'HSIE', subject: 'History', code: '10HIS1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Metal)', code: '10ITM1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Timber)', code: '10ITT1' },
  { faculty: 'Maths', subject: 'Mathematics Advanced Pathway', code: '10MAA1' },
  { faculty: 'Maths', subject: 'Mathematics Core', code: '10MAC1' },
  { faculty: 'Science', subject: 'Marine & Aquaculture Technology', code: '10MAR1' },
  { faculty: 'Maths', subject: 'Mathematics Standard Pathway', code: '10MAS1' },
  { faculty: 'Diverse_Learning', subject: 'Mentoring', code: '10MEN1' },
  { faculty: 'Maths', subject: 'Maths in Trades', code: '10MIT1' },
  { faculty: 'PeformingArts', subject: 'Music', code: '10MUS1' },
  { faculty: 'PDHPE', subject: 'Physical Activity & Sport Studies', code: '10PAS1' },
  { faculty: 'PDHPE', subject: 'PDHPE', code: '10PDH1' },
  { faculty: 'VisualArts', subject: 'Photographic & Digital Media', code: '10PDM1' },
  { faculty: 'Religion', subject: 'Religion', code: '10REL1' },
  { faculty: 'Science', subject: 'Science', code: '10SCI1' },
  { faculty: 'TAS', subject: 'iSTEM', code: '10STE1' },
  { faculty: 'HSIE', subject: 'Ancient History', code: '11AHI1' },
  { faculty: 'VisualArts', subject: 'Visual Arts', code: '11ART1' },
  { faculty: 'Science', subject: 'Biology', code: '11BIO1' },
  { faculty: 'HSIE', subject: 'Business Studies', code: '11BST1' },
  { faculty: 'Science', subject: 'Chemistry', code: '11CHM1' },
  { faculty: 'TAS', subject: 'Construction VET', code: '11CON1' },
  { faculty: 'PeformingArts', subject: 'Drama', code: '11DRA1' },
  { faculty: 'HSIE', subject: 'Economics', code: '11ECO1' },
  { faculty: 'Science', subject: 'Earth & Environmental Science (SJC)', code: '11EES1' },
  { faculty: 'English', subject: 'English Extension 1', code: '11ENE11' },
  { faculty: 'English', subject: 'English Advanced', code: '11ENGA1' },
  { faculty: 'English', subject: 'English Standard', code: '11ENGS1' },
  { faculty: 'TAS', subject: 'Engineering Studies', code: '11ENS1' },
  { faculty: 'English', subject: 'English Studies', code: '11ENST1' },
  { faculty: 'PeformingArts', subject: 'Entertainment VET', code: '11ENT1' },
  { faculty: 'HSIE', subject: 'Financial Services VET', code: '11FIN1' },
  { faculty: 'LOTE', subject: 'French Continuers', code: '11FRC1' },
  { faculty: 'TAS', subject: 'Food Technology', code: '11FTE1' },
  { faculty: 'HSIE', subject: 'Geography', code: '11GEO1' },
  { faculty: 'PDHPE', subject: 'Health & Movement Science', code: '11HMS1' },
  { faculty: 'TAS', subject: 'Hospitality (Kitchen Operations) VET', code: '11HOS1' },
  { faculty: 'Science', subject: 'Investigating Science', code: '11ISC1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Graphics)', code: '11ITG1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Metal)', code: '11ITM1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Multimedia)', code: '11ITMM1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Timber)', code: '11ITT1' },
  { faculty: 'HSIE', subject: 'Legal Studies', code: '11LST1' },
  { faculty: 'Maths', subject: 'Mathematics Advanced', code: '11MAD1' },
  { faculty: 'Maths', subject: 'Mathematics Extension 1', code: '11MAE11' },
  { faculty: 'Maths', subject: 'Mathematics Standard', code: '11MAS1' },
  { faculty: 'TAS', subject: 'Manufacturing & Engineering VET', code: '11MEG1' },
  { faculty: 'HSIE', subject: 'Modern History', code: '11MHI1' },
  { faculty: 'Maths', subject: 'Maths in Trades', code: '11MIT1' },
  { faculty: 'Science', subject: 'Marine Studies', code: '11MST1' },
  { faculty: 'PeformingArts', subject: 'Music 1', code: '11MUS11' },
  { faculty: 'PDHPE', subject: 'Outdoor Recreation VET', code: '11ORC1' },
  { faculty: 'Science', subject: 'Physics', code: '11PHY1' },
  { faculty: 'VisualArts', subject: 'Photography, Video & Digital Imaging', code: '11PVD1' },
  { faculty: 'Religion', subject: 'Studies of Catholic Thought', code: '11SCT1' },
  { faculty: 'TAS', subject: 'Software Engineering', code: '11SEN1' },
  { faculty: 'PDHPE', subject: 'Sport Lifestyle & Recreation', code: '11SLR1' },
  { faculty: 'Religion', subject: 'Studies of Religion 1', code: '11SOR11' },
  { faculty: 'HSIE', subject: 'Ancient History', code: '12AHI1' },
  { faculty: 'VisualArts', subject: 'Visual Arts', code: '12ART1' },
  { faculty: 'Science', subject: 'Biology', code: '12BIO1' },
  { faculty: 'HSIE', subject: 'Business Studies', code: '12BST1' },
  { faculty: 'Science', subject: 'Chemistry', code: '12CHM' },
  { faculty: 'TAS', subject: 'Construction VET', code: '12CON1' },
  { faculty: 'PeformingArts', subject: 'Drama', code: '12DRA1' },
  { faculty: 'HSIE', subject: 'Economics', code: '12ECO1' },
  { faculty: 'English', subject: 'English Extension 1', code: '12ENE11' },
  { faculty: 'English', subject: 'English Advanced', code: '12ENGA1' },
  { faculty: 'English', subject: 'English Standard', code: '12ENGS1' },
  { faculty: 'TAS', subject: 'Engineering Studies', code: '12ENS1' },
  { faculty: 'English', subject: 'English Studies', code: '12ENST1' },
  { faculty: 'PeformingArts', subject: 'Entertainment VET', code: '12ENT1' },
  { faculty: 'HSIE', subject: 'Financial Services VET', code: '12FIN1' },
  { faculty: 'LOTE', subject: 'French Continuers', code: '12FRC1' },
  { faculty: 'TAS', subject: 'Food Technology', code: '12FTE1' },
  { faculty: 'TAS', subject: 'Furniture Making Pathways VET', code: '12FUR1' },
  { faculty: 'HSIE', subject: 'Geography', code: '12GEO1' },
  { faculty: 'HSIE', subject: 'History Extension', code: '12HISE1' },
  { faculty: 'PDHPE', subject: 'Health & Movement Science', code: '12HMS1' },
  { faculty: 'TAS', subject: 'Hospitality (Kitchen Operations) VET', code: '12HOS1' },
  { faculty: 'Science', subject: 'Investigating Science', code: '12ISC1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Metal)', code: '12ITM1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Multimedia)', code: '12ITMM1' },
  { faculty: 'TAS', subject: 'Industrial Technology (Timber)', code: '12ITT1' },
  { faculty: 'HSIE', subject: 'Legal Studies', code: '12LST1' },
  { faculty: 'Maths', subject: 'Mathematics Advanced', code: '12MAD1' },
  { faculty: 'Maths', subject: 'Mathematics Extension 1', code: '12MAE11' },
  { faculty: 'Maths', subject: 'Mathematics Extension 2', code: '12MAE21' },
  { faculty: 'Maths', subject: 'Mathematics Standard 1', code: '12MAS11' },
  { faculty: 'Maths', subject: 'Mathematics Standard 2', code: '12MAS21' },
  { faculty: 'TAS', subject: 'Manufacturing & Engineering VET', code: '12MEG1' },
  { faculty: 'HSIE', subject: 'Modern History', code: '12MHI1' },
  { faculty: 'Science', subject: 'Marine Studies', code: '12MST1' },
  { faculty: 'PeformingArts', subject: 'Music 1', code: '12MUS11' },
  { faculty: 'Science', subject: 'Physics', code: '12PHY1' },
  { faculty: 'VisualArts', subject: 'Photography, Video & Digital Imaging', code: '12PVD1' },
  { faculty: 'Science', subject: 'Science Extension', code: '12SCE1' },
  { faculty: 'Religion', subject: 'Studies of Catholic Thought', code: '12SCT1' },
  { faculty: 'TAS', subject: 'Software Engineering', code: '12SEN1' },
  { faculty: 'PDHPE', subject: 'Sport Lifestyle & Recreation', code: '12SLR1' },
  { faculty: 'HSIE', subject: 'Society & Culture (SJC)', code: '12SOC1' },
  { faculty: 'Religion', subject: 'Studies of Religion 1', code: '12SOR11' },
]

// ─── Find-or-create helpers ───────────────────────────────────────────────────

async function findOrCreateSubject(facultyId, subjectName) {
  const { data: existing } = await supabase
    .from('subjects')
    .select('id')
    .eq('faculty_id', facultyId)
    .eq('name', subjectName)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('subjects')
    .insert({ faculty_id: facultyId, name: subjectName })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create subject "${subjectName}": ${error.message}`)
  return created.id
}

async function findOrCreateCourse(subjectId, yearLevel, subjectName) {
  const courseName = `Year ${yearLevel} ${subjectName}`

  const { data: existing } = await supabase
    .from('courses')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('year_level', yearLevel)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('courses')
    .insert({ subject_id: subjectId, name: courseName, year_level: yearLevel })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create course "${courseName}": ${error.message}`)
  return created.id
}

async function findOrCreateClass(courseId, code) {
  const { data: existing } = await supabase
    .from('classes')
    .select('id')
    .eq('course_id', courseId)
    .eq('code', code)
    .maybeSingle()

  if (existing) return { id: existing.id, created: false }

  const { data: created, error } = await supabase
    .from('classes')
    .insert({ course_id: courseId, code, name: code })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create class "${code}": ${error.message}`)
  return { id: created.id, created: true }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('Checkpoint — Class Hierarchy Import')
  console.log('='.repeat(60))
  console.log(`Rows to process: ${CLASS_DATA.length}`)
  console.log()

  // 1. Load all faculties
  const { data: faculties, error: facError } = await supabase
    .from('faculties')
    .select('id, name')

  if (facError) {
    console.error('ERROR: Could not load faculties:', facError.message)
    process.exit(1)
  }

  const facultyByName = Object.fromEntries(faculties.map((f) => [f.name, f.id]))
  console.log(`Faculties in DB: ${faculties.map((f) => f.name).join(', ')}`)
  console.log()

  // 2. Validate: find any faculty names that can't be resolved (after normalisation)
  const unresolvable = new Set()
  for (const row of CLASS_DATA) {
    if (row.faculty === 'NoFaculty') continue
    const canonical = normaliseFaculty(row.faculty)
    if (!facultyByName[canonical]) unresolvable.add(`${row.faculty} → "${canonical}"`)
  }
  if (unresolvable.size > 0) {
    console.error('ERROR: The following faculty names could not be matched in the database:')
    for (const f of unresolvable) console.error(`  - ${f}`)
    console.error()
    console.error('Create these faculties in Checkpoint (Admin → Settings) before running this script.')
    process.exit(1)
  }

  // 3. Process each row
  let created = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < CLASS_DATA.length; i++) {
    const row = CLASS_DATA[i]
    const prefix = `[${String(i + 1).padStart(3)}/${CLASS_DATA.length}]`

    if (row.faculty === 'NoFaculty') {
      console.log(`${prefix} SKIP  ${row.code} — NoFaculty`)
      skipped++
      continue
    }

    const facultyName = normaliseFaculty(row.faculty)
    const facultyId   = facultyByName[facultyName]
    const yearLevel   = yearFromCode(row.code)

    if (!yearLevel) {
      console.log(`${prefix} ERROR ${row.code} — could not extract year level from code`)
      errors++
      continue
    }

    try {
      const subjectId = await findOrCreateSubject(facultyId, row.subject)
      const courseId  = await findOrCreateCourse(subjectId, yearLevel, row.subject)
      const { created: wasCreated } = await findOrCreateClass(courseId, row.code)

      const status = wasCreated ? 'CREATE' : 'EXISTS'
      console.log(`${prefix} ${status} ${facultyName} → ${row.subject} → Year ${yearLevel} → ${row.code}`)

      if (wasCreated) created++
      else skipped++
    } catch (err) {
      console.error(`${prefix} ERROR  ${row.code} — ${err.message}`)
      errors++
    }
  }

  // 4. Summary
  console.log()
  console.log('='.repeat(60))
  console.log('Import complete')
  console.log('='.repeat(60))
  console.log(`  Created:  ${created}`)
  console.log(`  Already existed (skipped): ${skipped}`)
  console.log(`  Errors:   ${errors}`)
  console.log()

  if (errors > 0) {
    console.log('Some rows had errors. Fix the issues above and re-run — existing records will be skipped safely.')
    process.exit(1)
  } else {
    console.log('All classes are now in the database.')
  }
}

main()
