import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.argv[2]

if (!serviceRoleKey) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY before running this script.')
  process.exit(1)
}
if (!email) {
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/delete-test-user.mjs <email>')
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

const { data: profile, error: lookupError } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()

if (lookupError) {
  console.error('Lookup failed:', lookupError.message)
  process.exit(1)
}
if (!profile) {
  console.error(`No profile found for ${email}`)
  process.exit(1)
}

// Delete the profile first — it has no ON DELETE CASCADE from auth.users,
// and these test accounts aren't expected to have other dependent rows
// (flow_members, step_completions, etc). If a test account gets tagged
// into a real flow before deletion, clean that up first.
await supabase.from('profiles').delete().eq('id', profile.id)

const { error: deleteError } = await supabase.auth.admin.deleteUser(profile.id)

if (deleteError) {
  console.error('Failed to delete auth user:', deleteError.message)
  process.exit(1)
}

console.log(`Deleted ${email}`)
