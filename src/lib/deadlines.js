// Deadline calculation for V2 milestone system.
//
// Milestone due dates are computed from a numeric offset_days stored on each
// template milestone: negative = before assessment_date, positive = after.
//
// Blackout days are excluded from the countdown: addWorkingDays counts
// non-blackout calendar days from the anchor. A blackout week that falls
// inside the countdown window shifts the deadline by the full blackout
// duration, not just by the days the raw date overlaps.

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function isInAnyBlackout(dateStr, sorted) {
  return sorted.some((bw) => dateStr >= bw.start_date && dateStr <= bw.end_date)
}

// Computes a raw due date from an anchor date and an offset in days.
// No blackout checking — use addWorkingDays for blackout-aware scheduling.
export function computeDueDate(anchorDate, offsetDays) {
  return addDays(anchorDate, offsetDays)
}

// Adds n non-blackout days from startDate, skipping over blackout periods.
// Negative n counts backwards. Exported so the edit form can use it too.
export function addWorkingDays(startDate, n, blackoutWeeks) {
  if (!n || n === 0) return startDate
  if (!blackoutWeeks || blackoutWeeks.length === 0) return addDays(startDate, n)

  const sorted = [...blackoutWeeks].sort((a, b) =>
    a.start_date.localeCompare(b.start_date)
  )
  const direction = n > 0 ? 1 : -1
  const steps = Math.abs(n)
  let current = startDate
  let count = 0

  while (count < steps) {
    current = addDays(current, direction)
    if (!isInAnyBlackout(current, sorted)) count++
  }
  return current
}

// Pushes a date past any blackout weeks it falls within.
// Use this for custom (explicit) dates, not for offset-based scheduling.
export function resolveBlackout(dateStr, blackoutWeeks) {
  if (!blackoutWeeks || blackoutWeeks.length === 0) return dateStr

  const sorted = [...blackoutWeeks].sort((a, b) =>
    a.start_date.localeCompare(b.start_date)
  )

  let resolved = dateStr
  let changed = true
  while (changed) {
    changed = false
    for (const bw of sorted) {
      if (resolved >= bw.start_date && resolved <= bw.end_date) {
        resolved = addDays(bw.end_date, 1)
        changed = true
        break
      }
    }
  }
  return resolved
}

// Applies the blackout resolver to each milestone independently.
// Used for custom-date milestones; template milestones use buildMilestoneDates.
export function applyBlackoutsToMilestones(milestones, blackoutWeeks) {
  if (!blackoutWeeks || blackoutWeeks.length === 0) return milestones
  return milestones.map((m) => {
    if (!m.due_date) return { ...m }
    const resolved = resolveBlackout(m.due_date, blackoutWeeks)
    if (resolved === m.due_date) return { ...m }
    return { ...m, due_date: resolved, blackout_original_date: m.due_date }
  })
}

// Computes due dates for template milestones, counting offset_days as
// non-blackout working days so blackout periods don't shrink the window.
// Sets blackout_original_date when the date shifts due to blackouts.
export function buildMilestoneDates(templateMilestones, anchorDate, blackoutWeeks) {
  const sorted = [...templateMilestones].sort((a, b) => a.sort_order - b.sort_order)
  const hasBlackouts = blackoutWeeks && blackoutWeeks.length > 0

  return sorted.map((m) => {
    const rawDate = computeDueDate(anchorDate, m.offset_days ?? 0)
    const resolvedDate = hasBlackouts
      ? addWorkingDays(anchorDate, m.offset_days ?? 0, blackoutWeeks)
      : rawDate
    const result = { ...m, due_date: resolvedDate }
    if (hasBlackouts && resolvedDate !== rawDate) {
      result.blackout_original_date = rawDate
    }
    return result
  })
}
