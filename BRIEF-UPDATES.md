# Checkpoint — Brief Updates

Deviations/additions found necessary during the build, logged here per BRIEF.md's instruction not to modify the original file.

---

## 2026-06-21 — `profiles.faculty_id` replaced with `profile_faculties` (many-to-many)

**Found during:** Build Order step 18 (AdminPage), user feedback ("I am in both HSIE and English").

**Gap:** The given schema models a person's faculty as a single `profiles.faculty_id` column. The brief's own role description implies multi-faculty tagging is expected for *flows* ("A user may be tagged into multiple flows across multiple faculties simultaneously"), but a person's base faculty affiliation was still capped at one — which doesn't reflect reality for a LoL or teacher covering two faculties.

**Change:** Added a `profile_faculties` junction table (`profile_id`, `faculty_id`). Migrated existing single-faculty data into it, then dropped `profiles.faculty_id`. Rewrote the `is_lol_of_faculty()` RLS helper to check the junction table — every policy that calls it (flows, flow_steps, step_completions, flow_members, reminder_log, step_notes) picked up the fix automatically with no other policy changes needed. Also removed `my_faculty_id()`, which was dead code (defined, never called by any policy).

**Frontend impact:** `useProfile` now returns `profile.faculties` (array of `{id, name}`) instead of a single `faculty_id`. `useFlows`, `NewFlowForm`, `ImportFlowForm`, `Topbar`'s view-as picker, and `AdminPage`'s user table were all updated to handle multiple faculties per person.

**Where:** `supabase/schema.sql`, `supabase/add_multi_faculty.sql`.

---

## 2026-06-21 — `on_auth_user_created` trigger added

**Found during:** Build Order step 18 (AdminPage), while scoping "assign roles to signed-up users."

**Gap:** Nothing created a `profiles` row when someone signed up. A new person logging in via magic link got an `auth.users` row but no profile — invisible to any admin UI, stuck forever with "no profile found."

**Change:** Added a `SECURITY DEFINER` trigger function (`handle_new_user`) firing `after insert on auth.users` that creates a bare `profiles` row (`id`, `email` only — `role`/`faculty_id` left null for the admin to assign). Decided against also letting admins pre-provision accounts (would need a new server-side Edge Function with the service role key) — sign-in-first, then assign role, is simpler and sufficient.

**Where:** `supabase/schema.sql`, `supabase/add_profile_autocreate_trigger.sql`.

---

## 2026-06-21 — `flows.year_level` column added

**Found during:** Build Order step 11 (NewFlowForm), user feedback after first pass.

**Gap:** The given schema has no year-level concept on `flows` at all — only `faculty_id`. The user wants flows categorized by year (7-12) in addition to faculty, both when creating a flow and for grouping the sidebar (faculty → year → flows).

**Change:** Added `year_level text not null check (year_level in ('7','8','9','10','11','12'))` to `flows`. Existing seeded test flow backfilled as Year 10 (matches its title) before the NOT NULL constraint was applied. No RLS changes needed — same row, same policies.

**Where:** `supabase/schema.sql`, `supabase/add_year_level.sql`.

---

## 2026-06-21 — `step_notes` table added (supersedes `flow_steps.lol_notes`)

**Found during:** Build Order step 10 (TaskDetailPanel), after user feedback on the first pass.

**Gap:** A single `lol_notes` text column (added earlier the same session) only holds one note. The actual requirement: multiple timestamped, attributable notes per step, each individually deletable, plus a "delete all" action.

**Change:** Dropped `flow_steps.lol_notes`. Added a `step_notes` table (`id`, `step_id`, `author_id`, `body`, `created_at`). RLS mirrors `flow_steps`: any flow member can read, only LoL/Assistant LoL of that faculty or admin can write/delete.

**Where:** `supabase/schema.sql`, `supabase/step10_followups.sql`.

---

## 2026-06-21 — `flow_steps.reminder_email_body` column added

**Found during:** Build Order step 10, user feedback.

**Gap:** The reminder email system itself isn't built until Build Order step 15-17 (Resend + Edge Function + pg_cron), but the user wants to start drafting the per-step email message now from the TaskDetailPanel, ahead of that.

**Change:** Added `reminder_email_body text` (nullable) to `flow_steps` — holds a LoL-authored draft of the message body. Not yet consumed by anything (no sending logic exists yet); will be wired into the Edge Function when step 15-17 is built. Governed by the existing `flow_steps_lol_write` RLS policy.

**Where:** `supabase/schema.sql`, `supabase/step10_followups.sql`.

---

## 2026-06-21 — `reminder_log.step_id` foreign key changed to `ON DELETE SET NULL`

**Found during:** Build Order step 10, while adding a "Remove step" button to the TaskDetailPanel.

**Gap:** The original schema left `reminder_log.step_id`'s delete behavior as the Postgres default (`NO ACTION`). Once the reminder system exists, deleting a step that already had a reminder logged against it would fail with a foreign key violation.

**Change:** Recreated the constraint with `on delete set null` — deleting a step preserves the reminder_log row (audit trail / paper trail of notifications, per the brief's stated goal) rather than blocking the delete or silently destroying the log.

**Where:** `supabase/schema.sql`, `supabase/step10_followups.sql`.

---

## 2026-06-21 — Build Order steps 11 and 12 merged; Stage 3-4 deadline fallback + Template B wording gap

**Found during:** Build Order step 11 (NewFlowForm).

**Why merged:** Step 11 (create a flow from a template) cannot produce usable `flow_steps` without due dates — leaving them null would break the stat cards and overdue logic immediately. So `src/lib/deadlines.js` (the step 12 deadline auto-calculation logic) was built as part of step 11 rather than after it.

**Gap 1 — Stage 3-4 fallback:** BRIEF.md's Deadline Logic table only gives a fallback for non-matching "Stage 1-2" steps (anchor-21). Non-matching Stage 3-4 steps default to anchor+21 (the same zone most of their matching siblings land in) — not specified in the brief, a judgment call.

**Gap 2 — Template B step 16 wording:** Template B's step 16 reads "Prior to deadline: check Compass..." but the trigger phrase in the Deadline Logic table is "Prior to 3-week deadline" (which Template A's equivalent step matches exactly). Literal substring matching means Template B's step 16 falls through to the Stage 3-4 fallback (+21) instead of the apparently-intended +18. Not patched with a one-off special case — the LoL can override the calculated date manually (a capability the brief explicitly calls for), which is the intended escape hatch for exactly this kind of mismatch.

**Where:** `src/lib/deadlines.js`.

---

## 2026-06-21 — `flow_steps.lol_notes` column added *(superseded, see above)*

**Found during:** Build Order step 10 (TaskDetailPanel).

**Gap:** BRIEF.md's Flow Detail View spec requires an "LoL notes field" in the task side panel. The given schema's only `notes` column lives on `step_completions`, which only exists once a step has been completed — a LoL needs to be able to leave a note on a task before it's done too.

**Change:** Added `lol_notes text` (nullable) to `flow_steps`. Replaced the same day by the `step_notes` table above once it became clear notes needed to be a list, not a single field.

**Where:** `supabase/add_lol_notes.sql` (superseded, kept for history only — do not run after `step10_followups.sql`).
