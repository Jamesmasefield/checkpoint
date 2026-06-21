import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY before running this script (Supabase dashboard -> Settings -> API -> service_role).')
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf-8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
    }),
)

const supabase = createClient(env.VITE_SUPABASE_URL, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const MATHEMATICS_FACULTY_ID = '11111111-1111-1111-1111-111111111111'

const TEST_USERS = [
  { email: 'test.lol@checkpoint.test', full_name: 'Test LoL', role: 'lol', faculty_id: MATHEMATICS_FACULTY_ID },
  { email: 'test.teacher@checkpoint.test', full_name: 'Test Teacher', role: 'classroom_teacher', faculty_id: MATHEMATICS_FACULTY_ID },
]

async function findExistingUserId(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return null
  return data.users.find((u) => u.email === email)?.id ?? null
}

for (const u of TEST_USERS) {
  let userId

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: u.email,
    email_confirm: true,
  })

  if (createError) {
    // Re-running after the auth user was already created on a prior pass
    // (e.g. the profile insert failed due to a missing grant) — reuse it.
    userId = await findExistingUserId(u.email)
    if (!userId) {
      console.error(`Failed to create ${u.email}:`, createError.message)
      continue
    }
  } else {
    userId = created.user.id
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    faculty_id: u.faculty_id,
  })

  if (profileError) {
    console.error(`Failed to create profile for ${u.email}:`, profileError.message)
    continue
  }

  console.log(`Created ${u.role}: ${u.email} (${userId})`)
}
