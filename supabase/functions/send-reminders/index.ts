// Supabase Edge Function: reminder emails (Build Order step 16).
//
// Two modes, both via POST:
//   - { step_id: "..." }   -> manual trigger (LoL "send reminder now"):
//                              sends immediately, ignores the due-date
//                              threshold and the already-sent check.
//   - {} / no body          -> automatic nightly sweep (Build Order step 17
//                              wires up pg_cron to call this): for every
//                              incomplete step with a due_date, sends a
//                              reminder if today matches 5/1/0/-1 days from
//                              due date and one hasn't already been sent
//                              for that exact threshold.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by the Edge
// Functions runtime. RESEND_API_KEY, EMAIL_FROM, and APP_URL are custom
// secrets that must be set separately (see supabase/functions/README.md).
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'onboarding@resend.dev'
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Edge Functions don't add CORS headers automatically. Calling this from
// the browser via supabase.functions.invoke() triggers a preflight OPTIONS
// request first — without these headers the browser blocks the response
// before the function's own logic even runs, surfacing as a generic
// "Failed to send a request to the Edge Function" on the client.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Days relative to due_date: 5/1 before, 0 = due date itself, -1 = 1 day
// overdue. Stored as-is in reminder_log.days_before (plain int column, no
// sign convention specified in BRIEF.md — negative means "after due date").
const THRESHOLDS = [5, 1, 0, -1]

function formatDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

async function sendEmail({ to, cc, subject, html }: { to: string; cc?: string[]; subject: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, cc, subject, html }),
  })
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

// Email content per BRIEF.md's "Email content" spec: flow name + faculty,
// step number + description, due date, link back to Checkpoint, footer.
function buildEmailHtml({ flow, step, recipientName, lolEmail }: any) {
  const link = `${APP_URL}/flows/${flow.id}`
  return `
    <p>Hi ${recipientName},</p>
    ${step.reminder_email_body ? `<p>${step.reminder_email_body}</p>` : ''}
    <p><strong>${flow.title}</strong> (${flow.faculties?.name ?? 'Unknown faculty'})</p>
    <p>Step ${step.step_number}: ${step.description}</p>
    <p>Due: ${formatDate(step.due_date)}</p>
    <p><a href="${link}">Open in Checkpoint</a></p>
    <hr />
    <p style="color:#888;font-size:12px;">
      This is an automated reminder from Checkpoint. Replies go to ${lolEmail ?? 'your LoL'}.
    </p>
  `
}

async function findLol(facultyId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('faculty_id', facultyId)
    .eq('role', 'lol')
    .limit(1)
    .maybeSingle()
  return data
}

async function sendReminderForStep(step: any, flow: any, triggerType: 'auto' | 'manual', daysBefore: number | null) {
  if (!step.assigned_to) return { skipped: 'unassigned' }

  const { data: recipient } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', step.assigned_to)
    .single()

  if (!recipient?.email) return { skipped: 'no recipient email' }

  const lol = await findLol(flow.faculty_id)

  const html = buildEmailHtml({
    flow,
    step,
    recipientName: recipient.full_name ?? recipient.email,
    lolEmail: lol?.email,
  })

  await sendEmail({
    to: recipient.email,
    cc: lol?.email ? [lol.email] : undefined,
    subject: `Reminder: ${flow.title} — Step ${step.step_number}`,
    html,
  })

  await supabase.from('reminder_log').insert({
    step_id: step.id,
    recipient_id: recipient.id,
    lol_id: lol?.id ?? null,
    trigger_type: triggerType,
    days_before: daysBefore,
  })

  return { sent: true, recipient: recipient.email }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    if (body.step_id) {
      const { data: step, error: stepError } = await supabase
        .from('flow_steps')
        .select('*, flows!inner ( id, title, faculty_id, faculties ( name ) )')
        .eq('id', body.step_id)
        .single()

      if (stepError || !step) {
        return new Response(JSON.stringify({ error: 'Step not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const result = await sendReminderForStep(step, step.flows, 'manual', null)
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const today = new Date().toISOString().slice(0, 10)

    const { data: steps, error: stepsError } = await supabase
      .from('flow_steps')
      .select('*, flows!inner ( id, title, faculty_id, faculties ( name ) ), step_completions ( id )')
      .not('due_date', 'is', null)

    if (stepsError) throw stepsError

    const results = []

    for (const step of steps ?? []) {
      if ((step.step_completions?.length ?? 0) > 0) continue

      const daysUntilDue = Math.round((new Date(`${step.due_date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)
      if (!THRESHOLDS.includes(daysUntilDue)) continue

      const { data: existing } = await supabase
        .from('reminder_log')
        .select('id')
        .eq('step_id', step.id)
        .eq('trigger_type', 'auto')
        .eq('days_before', daysUntilDue)
        .maybeSingle()

      if (existing) continue

      // Isolate each step's send — one bad recipient (e.g. a typo'd email,
      // or a Resend rejection) must not abort reminders for every other
      // step in the nightly batch.
      try {
        const result = await sendReminderForStep(step, step.flows, 'auto', daysUntilDue)
        results.push({ step_id: step.id, ...result })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`Failed to send reminder for step ${step.id}:`, message)
        results.push({ step_id: step.id, failed: message })
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
