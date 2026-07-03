/**
 * Checkpoint — Bulk Staff Import
 * --------------------------------
 * Creates auth accounts and profiles for all St Edwards staff.
 * Assigns each person to their faculty in profile_faculties.
 * Does NOT send invitation emails — run invite-staff.mjs separately when ready.
 *
 * Usage:
 *   node scripts/import-staff.mjs
 *
 * Prerequisites:
 *   VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file.
 *   The service role key is in your Supabase dashboard → Project Settings → API.
 *   Add it to .env as: SUPABASE_SERVICE_ROLE_KEY=your_key_here
 *   (It is already gitignored via .env — never commit it.)
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

// Admin client — uses service role key, bypasses RLS
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Staff Data ───────────────────────────────────────────────────────────────
// 84 staff with faculty assignments. 10 NoFaculty staff included at the bottom
// — they will be created as accounts but not assigned to any faculty.
// Two entries skipped (no email): "Study, Library" and "Josephs, St"

const STAFF = [
  // Diverse Learning (5)
  { first: 'Jye',      last: 'Bonello',         email: 'jbonello@stedwards.nsw.edu.au',    faculty: 'Diverse Learning' },
  { first: 'Kristy',   last: 'Hamill',           email: 'khamill@stedwards.nsw.edu.au',     faculty: 'Diverse Learning' },
  { first: 'Katie',    last: 'Neilly',           email: 'kneilly@stedwards.nsw.edu.au',     faculty: 'Diverse Learning' },
  { first: 'Sharon',   last: 'Blanchard',        email: 'sblanchard@stedwards.nsw.edu.au',  faculty: 'Diverse Learning' },
  { first: 'Paul',     last: 'Sullivan',         email: 'psullivan@stedwards.nsw.edu.au',   faculty: 'Diverse Learning' },

  // English (13)
  { first: 'Elena',    last: 'Atayde',           email: 'eatayde@stedwards.nsw.edu.au',     faculty: 'English' },
  { first: 'Melissa',  last: 'Carson',           email: 'mcarson@stedwards.nsw.edu.au',     faculty: 'English' },
  { first: 'Sarah Jane', last: 'Cartwright',     email: 'scartwright@stedwards.nsw.edu.au', faculty: 'English' },
  { first: 'Heidi',    last: 'Englund',          email: 'henglund@stedwards.nsw.edu.au',    faculty: 'English' },
  { first: 'Jane',     last: 'Hayden',           email: 'jhayden@stedwards.nsw.edu.au',     faculty: 'English' },
  { first: 'Daniel',   last: 'Kent',             email: 'dkent@stedwards.nsw.edu.au',       faculty: 'English' },
  { first: 'Luke',     last: 'Le Page',          email: 'llepage@stedwards.nsw.edu.au',     faculty: 'English' },
  { first: 'Katie',    last: 'Livermore',        email: 'klivermore@stedwards.nsw.edu.au',  faculty: 'English' },
  { first: 'Keith',    last: 'Mills',            email: 'kmills@stedwards.nsw.edu.au',      faculty: 'English' },
  { first: 'Katie',    last: 'Moon',             email: 'kmoon@stedwards.nsw.edu.au',       faculty: 'English' },
  { first: 'Sarah',    last: 'Moulton',          email: 'smoulton@stedwards.nsw.edu.au',    faculty: 'English' },
  { first: 'Santhe',   last: 'Titherage',        email: 'stitheradge@stedwards.nsw.edu.au', faculty: 'English' },
  { first: 'Lincoln',  last: 'Tubridy',          email: 'ltubridy@stedwards.nsw.edu.au',    faculty: 'English' },

  // HSIE (8)
  { first: 'Kylie',    last: 'Celebrin',         email: 'kcelebrin@stedwards.nsw.edu.au',   faculty: 'HSIE' },
  { first: 'John',     last: 'Griffin',          email: 'jgriffin@stedwards.nsw.edu.au',    faculty: 'HSIE' },
  { first: 'Jess',     last: 'Hillard',          email: 'jhillard@stedwards.nsw.edu.au',    faculty: 'HSIE' },
  { first: 'Casey',    last: 'Lemon',            email: 'clemon@stedwards.nsw.edu.au',      faculty: 'HSIE' },
  { first: 'Sinead',   last: 'McCauley',         email: 'smccauley@stedwards.nsw.edu.au',   faculty: 'HSIE' },
  { first: 'Mitchell', last: 'Neve',             email: 'mneve@stedwards.nsw.edu.au',       faculty: 'HSIE' },
  { first: 'Nevin',    last: 'Odden',            email: 'nodden@stedwards.nsw.edu.au',      faculty: 'HSIE' },
  { first: 'Sonya',    last: 'Robinson',         email: 'srobinson@stedwards.nsw.edu.au',   faculty: 'HSIE' },

  // LOTE (3)
  { first: 'Lisa',     last: 'Alcorn',           email: 'lalcorn@stedwards.nsw.edu.au',     faculty: 'LOTE' },
  { first: 'Sabine',   last: 'Kieken',           email: 'skieken@stedwards.nsw.edu.au',     faculty: 'LOTE' },
  { first: 'Robyn',    last: 'Muir',             email: 'rmuir@stedwards.nsw.edu.au',       faculty: 'LOTE' },

  // Maths (12)
  { first: 'Lachlan',  last: 'Butt',             email: 'lbutt@stedwards.nsw.edu.au',       faculty: 'Maths' },
  { first: 'Jackson',  last: 'English',          email: 'jenglish@stedwards.nsw.edu.au',    faculty: 'Maths' },
  { first: 'Tony',     last: 'Herringe',         email: 'therringe@stedwards.nsw.edu.au',   faculty: 'Maths' },
  { first: 'Sriraksha', last: 'Hill',            email: 'shill@stedwards.nsw.edu.au',       faculty: 'Maths' },
  { first: 'Alex',     last: 'Isbester',         email: 'aisbester@stedwards.nsw.edu.au',   faculty: 'Maths' },
  { first: 'Clare',    last: 'Jones',            email: 'cjones@stedwards.nsw.edu.au',      faculty: 'Maths' },
  { first: 'Josh',     last: 'Mantellato',       email: 'jmantellato@stedwards.nsw.edu.au', faculty: 'Maths' },
  { first: 'Nathan',   last: 'Marks',            email: 'nmarks@stedwards.nsw.edu.au',      faculty: 'Maths' },
  { first: 'Shenae',   last: 'Nolan',            email: 'snolan@stedwards.nsw.edu.au',      faculty: 'Maths' },
  { first: 'Frank',    last: 'Samyia',           email: 'fsamyia@stedwards.nsw.edu.au',     faculty: 'Maths' },
  { first: 'Rob',      last: 'Speziale',         email: 'rspeziale@stedwards.nsw.edu.au',   faculty: 'Maths' },
  { first: 'Tim',      last: 'Woodbine',         email: 'twoodbine@stedwards.nsw.edu.au',   faculty: 'Maths' },

  // PDHPE (9)
  { first: 'Mark',     last: 'Bonnici',          email: 'mbonnici@stedwards.nsw.edu.au',    faculty: 'PDHPE' },
  { first: 'Jason',    last: 'Carpenter',        email: 'jcarpenter@stedwards.nsw.edu.au',  faculty: 'PDHPE' },
  { first: 'Juliana',  last: 'Dignam',           email: 'jdignam@stedwards.nsw.edu.au',     faculty: 'PDHPE' },
  { first: 'Richard',  last: 'Ellis',            email: 'rellis@stedwards.nsw.edu.au',      faculty: 'PDHPE' },
  { first: 'Michael',  last: 'Gentle',           email: 'mgentle@stedwards.nsw.edu.au',     faculty: 'PDHPE' },
  { first: 'Vanessa',  last: 'Henderson',        email: 'vhenderson@stedwards.nsw.edu.au',  faculty: 'PDHPE' },
  { first: 'Alex',     last: 'Powell',           email: 'apowell@stedwards.nsw.edu.au',     faculty: 'PDHPE' },
  { first: 'Gerard',   last: 'Summerhayes',      email: 'gsummerhayes@stedwards.nsw.edu.au',faculty: 'PDHPE' },
  { first: 'Vic',      last: 'Worrall',          email: 'vworrall@stedwards.nsw.edu.au',    faculty: 'PDHPE' },

  // Performing Arts (4) — note: source had typo "PeformingArts", corrected here
  { first: 'Jodie',    last: 'Connor',           email: 'jconnor@stedwards.nsw.edu.au',     faculty: 'Performing Arts' },
  { first: 'Justin',   last: 'Kane',             email: 'jkane@stedwards.nsw.edu.au',       faculty: 'Performing Arts' },
  { first: 'Annette',  last: 'Rankin',           email: 'arankin@stedwards.nsw.edu.au',     faculty: 'Performing Arts' },
  { first: 'Paul',     last: 'Toole',            email: 'ptoole@stedwards.nsw.edu.au',      faculty: 'Performing Arts' },

  // Religion (6)
  { first: 'Kaitlyn',  last: 'Abbott-Atchison',  email: 'kabbott@stedwards.nsw.edu.au',     faculty: 'Religion' },
  { first: 'Tony',     last: 'Beacroft',         email: 'tbeacroft@stedwards.nsw.edu.au',   faculty: 'Religion' },
  { first: 'Pat',      last: 'Dell',             email: 'pdell@stedwards.nsw.edu.au',       faculty: 'Religion' },
  { first: 'Eamonn',   last: 'McCauley',         email: 'emccauley@stedwards.nsw.edu.au',   faculty: 'Religion' },
  { first: 'Fran',     last: 'Palmer-Brown',     email: 'fpalmerbrown@stedwards.nsw.edu.au',faculty: 'Religion' },
  { first: 'Alex',     last: 'Rozario',          email: 'arozario@stedwards.nsw.edu.au',    faculty: 'Religion' },

  // Science (10)
  { first: 'Michael',  last: 'Crawford',         email: 'mcrawford@stedwards.nsw.edu.au',   faculty: 'Science' },
  { first: 'Brett',    last: 'Giles',            email: 'bgiles@stedwards.nsw.edu.au',      faculty: 'Science' },
  { first: 'Ryan',     last: 'Herbert',          email: 'rherbert@stedwards.nsw.edu.au',    faculty: 'Science' },
  { first: 'Kyle',     last: 'James',            email: 'kjames@stedwards.nsw.edu.au',      faculty: 'Science' },
  { first: 'Michael',  last: 'Lord',             email: 'mlord@stedwards.nsw.edu.au',       faculty: 'Science' },
  { first: 'Jack',     last: 'Lynch',            email: 'jlynch@stedwards.nsw.edu.au',      faculty: 'Science' },
  { first: 'Tanya',    last: 'Olip',             email: 'tolip@stedwards.nsw.edu.au',       faculty: 'Science' },
  { first: 'Mark',     last: 'Reynolds',         email: 'mareynolds@stedwards.nsw.edu.au',  faculty: 'Science' },
  { first: 'Christen', last: 'Stewart',          email: 'cstewart@stedwards.nsw.edu.au',    faculty: 'Science' },
  { first: 'Sonia',    last: 'Welsh',            email: 'swelsh@stedwards.nsw.edu.au',      faculty: 'Science' },

  // TAS (11)
  { first: 'Mark',     last: 'Austin',           email: 'maustin@stedwards.nsw.edu.au',     faculty: 'TAS' },
  { first: 'Karl',     last: 'Beemster',         email: 'kbeemster@stedwards.nsw.edu.au',   faculty: 'TAS' },
  { first: 'Mark',     last: 'Bondfield',        email: 'mbondfield@stedwards.nsw.edu.au',  faculty: 'TAS' },
  { first: 'Jay',      last: 'Brown',            email: 'jbrown@stedwards.nsw.edu.au',      faculty: 'TAS' },
  { first: 'Paul',     last: 'Buxton',           email: 'pbuxton@stedwards.nsw.edu.au',     faculty: 'TAS' },
  { first: 'Chris',    last: 'Louie',            email: 'clouie@stedwards.nsw.edu.au',      faculty: 'TAS' },
  { first: 'Scott',    last: 'Massey',           email: 'smassey@stedwards.nsw.edu.au',     faculty: 'TAS' },
  { first: 'Anne',     last: 'McDonald',         email: 'amcdonald@stedwards.nsw.edu.au',   faculty: 'TAS' },
  { first: 'Scott',    last: 'Murray',           email: 'smurray@stedwards.nsw.edu.au',     faculty: 'TAS' },
  { first: 'Elliot',   last: 'Rozario',          email: 'erozario@stedwards.nsw.edu.au',    faculty: 'TAS' },
  { first: 'Matthew',  last: 'Young',            email: 'myoung@stedwards.nsw.edu.au',      faculty: 'TAS' },

  // Visual Arts (3)
  { first: 'Jessica',  last: 'Beagin',           email: 'jbeagin@stedwards.nsw.edu.au',     faculty: 'Visual Arts' },
  { first: 'Tina',     last: 'Dankert',          email: 'tdanckert@stedwards.nsw.edu.au',   faculty: 'Visual Arts' },
  { first: 'Lana',     last: 'Lewis',            email: 'llewis@stedwards.nsw.edu.au',      faculty: 'Visual Arts' },

  // No faculty — accounts created, no faculty assignment (10)
  { first: 'Damian',   last: 'Chase',            email: 'dchase@stedwards.nsw.edu.au',      faculty: null },
  { first: 'Oliver',   last: 'Chippendale',      email: 'ochippendale@stedwards.nsw.edu.au',faculty: null },
  { first: 'Tammy',    last: 'Corrigan',         email: 'tcorrigan@stedwards.nsw.edu.au',   faculty: null },
  { first: 'Jo',       last: 'Emmett',           email: 'jemmett@stedwards.nsw.edu.au',     faculty: null },
  { first: 'Claudia',  last: 'Fink',             email: 'cfink@stedwards.nsw.edu.au',       faculty: null },
  { first: 'Ashlee',   last: 'Gardiner',         email: 'agardiner@stedwards.nsw.edu.au',   faculty: null },
  { first: 'Michael',  last: 'Gill',             email: 'mgill@stedwards.nsw.edu.au',       faculty: null },
  { first: 'Alex',     last: 'Jamieson',         email: 'ajamieson@stedwards.nsw.edu.au',   faculty: null },
  { first: 'Abbey',    last: 'Joseski',          email: 'ajoseski@stedwards.nsw.edu.au',    faculty: null },
  { first: 'Kyle',     last: 'Robbins',          email: 'krobbins@stedwards.nsw.edu.au',    faculty: null },

  // Skipped (no email in source data):
  // "Study, Library" — no email
  // "Josephs, St"   — no email
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('Checkpoint — Bulk Staff Import')
  console.log('='.repeat(60))
  console.log(`Total staff to import: ${STAFF.length}`)
  console.log('Invitation emails: DISABLED (run invite-staff.mjs later)')
  console.log()

  // 1. Load all faculties from DB so we can look up IDs by name
  const { data: faculties, error: facError } = await supabase
    .from('faculties')
    .select('id, name')

  if (facError) {
    console.error('ERROR: Could not load faculties from database:', facError.message)
    console.error('Make sure your faculties table is populated before running this script.')
    process.exit(1)
  }

  const facultyByName = {}
  for (const f of faculties) {
    facultyByName[f.name] = f.id
  }

  console.log(`Faculties found in DB: ${faculties.map(f => f.name).join(', ')}`)
  console.log()

  // Check for any faculty names in our data that don't exist in the DB
  const missingFaculties = new Set()
  for (const s of STAFF) {
    if (s.faculty && !facultyByName[s.faculty]) {
      missingFaculties.add(s.faculty)
    }
  }
  if (missingFaculties.size > 0) {
    console.error('ERROR: The following faculties are in the staff data but not in your database:')
    for (const f of missingFaculties) {
      console.error(`  - "${f}"`)
    }
    console.error()
    console.error('Please create these faculties in Checkpoint (Admin → Settings) before running this script.')
    process.exit(1)
  }

  // 2. Process each staff member
  let created = 0
  let skipped = 0
  let errors = 0
  const noFacultyWarnings = []

  for (let i = 0; i < STAFF.length; i++) {
    const person = STAFF[i]
    const fullName = `${person.first} ${person.last}`
    process.stdout.write(`[${i + 1}/${STAFF.length}] ${fullName} <${person.email}> ... `)

    try {
      // 2a. Create auth user (no email confirmation, no invitation sent)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: person.email,
        email_confirm: true,       // mark email as confirmed so they can log in via magic link immediately
        user_metadata: {
          full_name: fullName,
          first_name: person.first,
          last_name: person.last,
        }
      })

      if (authError) {
        // If the user already exists, that's fine — skip gracefully
        if (authError.message?.includes('already been registered') ||
            authError.message?.includes('already exists') ||
            authError.code === 'email_exists') {
          process.stdout.write('SKIPPED (already exists)\n')
          skipped++
          continue
        }
        throw authError
      }

      const userId = authData.user.id

      // 2b. Upsert profile row
      // The on_auth_user_created trigger may have already created a bare profile.
      // We upsert to set the name fields correctly regardless.
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName,
          email: person.email,
          role: 'teacher',   // default — promote LoLs manually in the Admin UI
        }, { onConflict: 'id' })

      if (profileError) throw profileError

      // 2c. Assign to faculty (if they have one)
      if (person.faculty) {
        const facultyId = facultyByName[person.faculty]
        const { error: facAssignError } = await supabase
          .from('profile_faculties')
          .upsert({
            profile_id: userId,
            faculty_id: facultyId,
          }, { onConflict: 'profile_id,faculty_id' })

        if (facAssignError) throw facAssignError
        process.stdout.write(`OK (${person.faculty})\n`)
      } else {
        noFacultyWarnings.push(fullName)
        process.stdout.write('OK (no faculty assigned)\n')
      }

      created++

    } catch (err) {
      process.stdout.write(`ERROR — ${err.message}\n`)
      errors++
    }

    // Small delay to avoid hitting Supabase rate limits
    await sleep(150)
  }

  // 3. Summary
  console.log()
  console.log('='.repeat(60))
  console.log('Import complete')
  console.log('='.repeat(60))
  console.log(`  Created:  ${created}`)
  console.log(`  Skipped (already existed): ${skipped}`)
  console.log(`  Errors:   ${errors}`)
  console.log()

  if (noFacultyWarnings.length > 0) {
    console.log(`The following ${noFacultyWarnings.length} staff were imported with no faculty assignment.`)
    console.log('You can assign them manually in the Admin → Staff page:')
    for (const name of noFacultyWarnings) {
      console.log(`  - ${name}`)
    }
    console.log()
  }

  if (errors > 0) {
    console.log('Some accounts had errors. Re-run the script to retry — existing accounts will be skipped safely.')
  } else {
    console.log('Next step: when ready to onboard staff, run:')
    console.log('  node scripts/invite-staff.mjs')
    console.log('This will send magic link invitation emails to all imported staff.')
  }
}

main()
