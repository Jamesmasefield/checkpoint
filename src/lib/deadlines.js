// Deadline Logic (BRIEF.md "Deadline Logic" table). Trigger phrases are
// matched as case-insensitive substrings of the step description. Longer,
// more specific phrases are checked first so e.g. "prior to 3-week
// deadline" isn't caught by the more generic "3-week deadline" rule first.
//
// The brief gives no fallback for Stage 3-4 steps that match no trigger
// phrase (only "Stage 1-2" has an explicit default of anchor-21). Stage 3-4
// non-matches are treated as final wrap-up steps and default to the same
// +21 day zone most of their matching siblings land in. See BRIEF-UPDATES.md.
//
// Known gap: Template B's step 16 ("Prior to deadline: check Compass...")
// doesn't literally contain "3-week", so it won't match the "prior to
// 3-week deadline" rule even though it's clearly the same conceptual step
// as Template A's matching one. Falls through to the Stage 3-4 default
// (+21) instead of the intended +18. The LoL can override the date
// manually after creation — see TaskDetailPanel.
const TRIGGER_RULES = [
  { phrase: 'prior to 3-week deadline', offsetDays: 18 },
  { phrase: '2-week marking deadline', offsetDays: 14 },
  { phrase: 'before the 2-week noa window', offsetDays: -14 },
  { phrase: 'on the day of the task', offsetDays: 0 },
  { phrase: 'within 3 weeks', offsetDays: 21 },
  { phrase: '3-week deadline', offsetDays: 21 },
]

function addDays(anchorDate, days) {
  const d = new Date(`${anchorDate}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function calculateDueDate(anchorDate, description, stageNumber) {
  const lower = description.toLowerCase()
  const rule = TRIGGER_RULES.find((r) => lower.includes(r.phrase))
  if (rule) return addDays(anchorDate, rule.offsetDays)
  return addDays(anchorDate, stageNumber <= 2 ? -21 : 21)
}
