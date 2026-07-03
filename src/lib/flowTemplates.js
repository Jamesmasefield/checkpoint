// V2: templates and their milestones are stored in the `templates` and
// `template_milestones` database tables (seeded in seed_v2_templates.sql).
// This file no longer contains hardcoded step arrays — use the
// `useTemplates` hook to fetch templates from Supabase.
//
// The buildMilestoneDates utility (from deadlines.js) is the single place
// that converts template milestones + an anchor date + blackout weeks into
// the concrete due-date list that gets written to flow_milestones on flow
// creation. Re-exported here for convenience so form code has one import.

export { buildMilestoneDates } from './deadlines.js'
