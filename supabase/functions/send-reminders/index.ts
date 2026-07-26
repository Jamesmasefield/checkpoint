// Supabase Edge Function: reminder emails (V2).
//
// Two modes, both via POST:
//   - { flow_milestone_id: "..." }  -> manual trigger (LoL "Send reminder now")
//                                       sends immediately regardless of due date or prior sends.
//   - {} / no body                  -> automatic nightly sweep (pg_cron fires at 19:00 UTC):
//                                       for every incomplete milestone with a due_date, sends
//                                       at 5/1/0/-1 days relative to due_date if not already sent.
//
// Recipients are resolved from assignee_mode on the milestone, not a direct assigned_to FK:
//   - 'organiser'      -> flow.created_by (the organising teacher)
//   - 'class_teachers' -> all teachers in classes linked to the flow via flow_classes
//   - 'lol'            -> flow.lol_id (the LoL picked at flow creation); falls back to
//                          every LoL of the flow's faculty for flows created before lol_id existed
//
// Email subject and body come from flow_milestones.email_subject / email_body (set on flow
// creation from the template defaults, editable per-milestone by LoLs). Both fields support
// {{variable}} interpolation before sending. Falls back to a generic template if not set.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by the Edge Functions runtime.
// RESEND_API_KEY, EMAIL_FROM, and APP_URL must be set as custom secrets.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY     = Deno.env.get('RESEND_API_KEY')!
const EMAIL_FROM         = Deno.env.get('EMAIL_FROM') ?? 'onboarding@resend.dev'
const APP_URL            = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const THRESHOLDS = [5, 1, 0, -1]

function formatDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Replace {{variable}} placeholders in a template string.
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

// Convert a plain-text email body (with \n line breaks) to HTML paragraphs.
function bodyToHtml(text: string): string {
  return text
    .trim()
    .split('\n\n')
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

// Fallback HTML when no email_body template is set on the milestone.
function buildFallbackHtml({ flow, milestone, recipientName, lolEmail }: any) {
  const link = `${APP_URL}/flows/${flow.id}`
  return `
    <p>Hi ${recipientName},</p>
    <p>This is a reminder for a milestone in <strong>${flow.title}</strong>.</p>
    <p><strong>${milestone.title}</strong></p>
    ${milestone.description ? `<p>${milestone.description}</p>` : ''}
    <p>Due: <strong>${formatDate(milestone.due_date)}</strong></p>
    <p><a href="${link}">Open flow in Checkpoint</a></p>
    <hr />
    <p style="color:#888;font-size:12px;">Automated reminder from Checkpoint. Replies go to ${lolEmail ?? 'your LoL'}.</p>
  `
}

async function sendEmail({ to, cc, subject, html }: { to: string; cc?: string[]; subject: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to, cc, subject, html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
  return res.json()
}

// Resolve the list of { id, email, full_name } recipients from assignee_mode + flow context.
async function resolveRecipients(milestone: any, flow: any): Promise<{ id: string; email: string; full_name: string | null }[]> {
  const mode = milestone.assignee_mode

  if (mode === 'organiser') {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', flow.created_by)
      .maybeSingle()
    return data ? [data] : []
  }

  if (mode === 'class_teachers') {
    const { data } = await supabase
      .from('class_teachers')
      .select('profiles ( id, email, full_name )')
      .in('class_id',
        (await supabase.from('flow_classes').select('class_id').eq('flow_id', flow.id))
          .data?.map((fc: any) => fc.class_id) ?? []
      )
    return (data ?? []).map((ct: any) => ct.profiles).filter(Boolean)
  }

  if (mode === 'lol') {
    // Prefer the LoL explicitly picked for this flow. Falls back to every LoL
    // of the flow's faculty for flows created before lol_id existed.
    if (flow.lol_id) {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', flow.lol_id)
        .maybeSingle()
      return data ? [data] : []
    }

    const { data } = await supabase
      .from('profile_faculties')
      .select('profiles ( id, email, full_name )')
      .eq('faculty_id', flow.faculty_id)
      .eq('profiles.role', 'lol')
    return (data ?? []).map((pf: any) => pf.profiles).filter(Boolean)
  }

  return []
}

// Resolve the flow's LoL for the {{lol_name}} signature and reminder_log.lol_id.
// Prefers the explicitly picked flow.lol_id; falls back to an arbitrary
// faculty LoL for flows created before that column existed.
async function findFlowLol(flow: any): Promise<{ id: string; email: string; full_name: string | null } | null> {
  if (flow.lol_id) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', flow.lol_id)
      .maybeSingle()
    if (data) return data
  }

  const { data } = await supabase
    .from('profile_faculties')
    .select('profiles!inner ( id, email, full_name )')
    .eq('faculty_id', flow.faculty_id)
    .eq('profiles.role', 'lol')
    .limit(1)
    .maybeSingle()
  return (data as any)?.profiles ?? null
}

async function sendReminderForMilestone(
  milestone: any,
  flow: any,
  triggerType: 'auto' | 'manual',
  daysBefore: number | null
): Promise<{ sent: number; skipped: string[] }> {
  console.log(`[send] milestone=${milestone.id} mode=${milestone.assignee_mode} trigger=${triggerType} reminders_enabled=${milestone.reminders_enabled}`)
  if (milestone.reminders_enabled === false) return { sent: 0, skipped: ['reminders disabled for this milestone'] }
  if (triggerType === 'auto' && !milestone.due_date && !milestone.reminder_date) return { sent: 0, skipped: ['no due_date or reminder_date'] }

  const recipients = await resolveRecipients(milestone, flow)
  console.log(`[send] resolved ${recipients.length} recipient(s):`, recipients.map(r => r.email))
  if (recipients.length === 0) return { sent: 0, skipped: ['no recipients resolved'] }

  const lol = await findFlowLol(flow)
  const link = `${APP_URL}/flows/${flow.id}`

  let sent = 0
  const skipped: string[] = []

  for (const recipient of recipients) {
    if (!recipient.email) { skipped.push(`no email for ${recipient.id}`); continue }

    const firstName = recipient.full_name?.split(' ')[0] ?? recipient.email.split('@')[0]

    const vars: Record<string, string> = {
      first_name:       firstName,
      lol_name:         lol?.full_name ?? '',
      assessment_title: flow.title,
      course_name:      flow.courses?.name ?? '',
      step_due_date:    milestone.due_date ? formatDate(milestone.due_date) : '',
      checkpoint_link:  link,
    }

    const subject = milestone.email_subject
      ? interpolate(milestone.email_subject, vars)
      : `Reminder: ${flow.title} — ${milestone.title}`

    const html = milestone.email_body
      ? bodyToHtml(interpolate(milestone.email_body, vars))
      : buildFallbackHtml({ flow, milestone, recipientName: firstName, lolEmail: lol?.email })

    try {
      await sendEmail({
        to: recipient.email,
        subject,
        html,
      })

      await supabase.from('reminder_log').insert({
        flow_milestone_id: milestone.id,
        recipient_id:      recipient.id,
        lol_id:            lol?.id ?? null,
        trigger_type:      triggerType,
        days_before:       daysBefore,
        email_subject:     subject,
        body_preview:      milestone.email_body
          ? interpolate(milestone.email_body, vars).slice(0, 120)
          : (milestone.description?.slice(0, 120) ?? milestone.title),
      })
      sent++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`send failed for ${recipient.email}:`, msg)
      skipped.push(`${recipient.email}: ${msg}`)
    }
  }

  return { sent, skipped }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    // Manual trigger: send reminder for a specific milestone now.
    if (body.flow_milestone_id) {
      const { data: milestone, error: msErr } = await supabase
        .from('flow_milestones')
        .select('*, flows!inner ( id, title, faculty_id, created_by, lol_id, courses ( name ) )')
        .eq('id', body.flow_milestone_id)
        .single()

      if (msErr || !milestone) {
        return new Response(JSON.stringify({ error: 'Milestone not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const result = await sendReminderForMilestone(milestone, milestone.flows, 'manual', null)
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Nightly sweep: process all incomplete milestones due within thresholds.
    const today = new Date().toISOString().slice(0, 10)

    const { data: milestones, error: msErr } = await supabase
      .from('flow_milestones')
      .select('*, flows!inner ( id, title, faculty_id, created_by, lol_id, courses ( name ) )')
      .is('completed_at', null)
      .or('due_date.not.is.null,reminder_date.not.is.null')
      .eq('reminders_enabled', true)

    if (msErr) throw msErr

    const results = []

    for (const milestone of milestones ?? []) {
      const anchorDate = milestone.reminder_date ?? milestone.due_date
      const daysUntilDue = Math.round(
        (new Date(`${anchorDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000
      )
      if (!THRESHOLDS.includes(daysUntilDue)) continue

      const { data: existing } = await supabase
        .from('reminder_log')
        .select('id')
        .eq('flow_milestone_id', milestone.id)
        .eq('trigger_type', 'auto')
        .eq('days_before', daysUntilDue)
        .maybeSingle()

      if (existing) continue

      try {
        const result = await sendReminderForMilestone(milestone, milestone.flows, 'auto', daysUntilDue)
        results.push({ milestone_id: milestone.id, ...result })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`sweep failed for milestone ${milestone.id}:`, msg)
        results.push({ milestone_id: milestone.id, failed: msg })
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
