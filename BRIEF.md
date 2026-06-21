# Checkpoint — Project Brief
**Live Reporting Management Platform for St Edwards College**

---

## Overview

Checkpoint is a web-based workflow management tool that allows Leaders of Learning (LoLs) to build, assign, and monitor assessment reporting flows across their faculty. Teachers see only their responsibilities and deadlines and tick off tasks as they complete them. The system sends automated email reminders to staff with LoLs CC'd, creating a paper trail of notifications.

This brief contains everything needed to build Checkpoint from scratch. Read it fully before writing any code.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React (Vite) | Component-based, fast dev server |
| Styling | Tailwind CSS | Utility-first, clean output |
| Backend / DB | Supabase | Postgres, auth, real-time, row-level security |
| Auth | Supabase Magic Link | Email-based, no passwords |
| Email | Resend API | Automated reminders, LoL CC |
| Hosting | Netlify | Free tier, auto-deploy from repo |
| Scheduling | Supabase Edge Functions + pg_cron | Nightly reminder checks |

---

## Environment Variables

Create a `.env` file in the project root. The developer (user) will fill in the values from their Supabase and Resend dashboards:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@checkpoint.stedwards.nsw.edu.au
```

Note: The EMAIL_FROM address may need to change pending IT approval. It is a single config value — update it here and redeploy. No code changes required.

---

## User Roles & Hierarchy

There are four user roles in order of authority:

1. **Admin** — school-level, can create faculties, assign LoLs, manage all users
2. **LoL (Leader of Learning)** — faculty head, creates and manages flows within their faculty
3. **Assistant LoL** — supports the LoL, has visibility of all flow steps, can complete their assigned steps
4. **Course Delegate** — responsible for specific setup tasks, assigned per flow
5. **Classroom Teacher** — assigned to specific flows, sees only their tagged steps

A user may be tagged into multiple flows across multiple faculties simultaneously. Each user's dashboard shows all flows they have been tagged in, regardless of faculty.

---

## Application Views

### 1. Admin Dashboard
- Create and manage faculties
- Create user accounts and assign roles
- View school-wide progress across all faculties and flows
- Access audit logs

### 2. LoL Dashboard
- View all flows within their faculty
- Create a new flow (select template, tag staff, set anchor date)
- Monitor overall flow progress with per-stage breakdown
- Add custom steps to any flow
- Import a previous flow (carry over structure and staff, update personnel before publishing)
- Manually trigger reminder emails for any step
- View email reminder log

### 3. Teacher Dashboard (all roles below LoL)
- Personalised view showing all flows the user has been tagged in
- Sidebar lists each assessment flow with colour-coded status dot and due date
- Main area shows that flow's checklist filtered to steps assigned to their role
- Can tick off their completed steps
- Can click any step to see full detail, notes, and history

### 4. Flow Detail View (LoL view of a specific flow)
- Summary stat cards: overall progress %, completed steps, overdue steps, days to deadline
- Four stage blocks, each with a progress bar
- Each task row shows: checkbox, task description, role badge, due date, overdue warning if applicable
- Clicking a task opens a side panel with: full description, assigned staff member name, due date, LoL notes field, activity log
- Top bar shows: flow title, faculty, teacher count, flow type badge (Rubric-based / Comment-based), anchor due date, Add Custom Step button

---

## Sidebar Design

The sidebar is present for all logged-in users and contains:

**Top section — navigation:**
- Dashboard
- My team (LoL only)
- Notifications (with unread badge count)

**Middle section — Assessment flows:**
- Lists every flow the user has been tagged in
- Each item shows: colour dot (status), assessment name, task type, due date
- Colour dot meanings: green = on track, blue = in progress, amber = attention needed, red = overdue, grey = not started
- "Create new flow" button appears here for LoL users (below the flow list)

**Bottom section:**
- Settings
- Light/dark mode toggle

---

## Design System

### Theme
- Light/dark toggle, defaulting to light mode
- Clean, modern, inspired by Monday.com — bold colour-coded status indicators, card-based layouts, strong sidebar, satisfying progress indicators
- Not institutional — engaging and product-quality

### Light mode palette
- Page background: #f5f6fa
- Sidebar background: #1a1f2e
- Sidebar text: white-on-dark
- Card background: #ffffff
- Border: 1px solid #e5e7eb
- Primary accent: #4f6ef7 (blue)

### Dark mode palette
- Page background: #0f1117
- Sidebar background: #161b27
- Card background: rgba(255,255,255,0.04)
- Border: 0.5px solid rgba(255,255,255,0.08)
- Primary accent: #4f6ef7

### Role badge colours (consistent across both modes)
- LoL: purple background, purple text
- Assistant LoL: orange background, orange text
- Course Delegate: blue background, blue text
- Classroom Teacher: teal background, teal text

### Stage header colours (all four stages get distinct colours — never grey)
- Stage 1 — Task Creation & Setup: green
- Stage 2 — Platform Setup: blue
- Stage 3 — Submission & Marking: amber
- Stage 4 — Comments & Publishing: coral/pink

### Status indicators
- On track / complete: green (#22c55e)
- In progress: blue (#4f6ef7)
- Attention needed: amber (#f59e0b)
- Overdue: red (#ef4444)
- Not started: slate (#94a3b8) — used for task rows only, never for stage headers

### Typography
- Font: Inter (Google Fonts)
- Headings: 500 weight
- Body: 400 weight, 13–14px in UI components

---

## Flow Templates

When a LoL creates a new flow they select one of two base templates. The checklist items below are pre-populated automatically. LoLs can then edit, reorder, or add custom steps before publishing.

### Template A — Comment-based (Non-Rubric) — Tasks created in Compass

**Stage 1: Task Creation & NoA Setup**
| # | Checklist item | Default responsibility |
|---|---|---|
| 1 | Create the assignment (NoA) in Canvas using the correct stage template and naming conventions (all key sections completed, due date set) | Course Delegate (LoL oversight) |
| 2 | Confirm task NoA title matches the agreed naming convention (Canvas + Compass) | Course Delegate (LoL oversight) |
| 3 | Confirm Sync to SIS is enabled in Canvas | Course Delegate |
| 4 | Confirm Canvas NoA due date and Task Name has been entered and matches online Assessment Handbook | Classroom Teacher / Course Delegate (LoL oversight) |
| 5 | LoL/Assistant LoL/Delegate checks NoA for consistency, wording, structure, and outcome alignment; approve for publication | LoL / Assistant LoL / Course Delegate |

**Stage 2: Compass Setup**
| # | Checklist item | Default responsibility |
|---|---|---|
| 6 | Before the 2-week NoA window: in Compass, Pull From Canvas, set Task Visible for students and parents, and check Currently Enrolled Students (remove Life Skills students) | Course Delegate (LoL oversight) |
| 7 | Create Learning Task for task results in Compass using the 1–5 Section Assessment Task templates | LoL / Assistant LoL |
| 8 | While creating the Learning Task in Compass, set up the Reporting tab, linking the task to the relevant reporting cycle. For Semester 1 tasks, link to both Semester 1 and Semester 2 Reporting Cycles | LoL / Assistant LoL |

**Stage 3: Submission & Marking**
| # | Checklist item | Default responsibility |
|---|---|---|
| 9 | On the day of the task, record in Compass assessment task NoA if student has or has not handed in/sat assessment. Update as situation changes | Classroom Teacher |
| 10 | Set and communicate faculty marking and feedback deadline (within 3 weeks) | LoL |
| 11 | By 2-week marking deadline: ensure all results complete and entered in the Learning Task on Compass | Classroom Teacher (LoL oversight) |
| 12 | Check Compass for missing/incomplete results and follow up | LoL / Assistant LoL |

**Stage 4: Comments & Publishing**
| # | Checklist item | Default responsibility |
|---|---|---|
| 13a | Apply standardised comments for every student (including late penalties, approved misadventures, estimates etc) — do not individualise | Classroom Teacher (LoL oversight) |
| 13b | For formal examination blocks, generalised marker's feedback should be attached in the Learning Task | Course Delegate (LoL oversight) |
| 14 | Prior to 3-week deadline: check all comments are complete | LoL / Assistant LoL |
| 15 | In Compass: enable Grading Visible to students and parents (confirm Raw Mark/Grade/Comment etc. are visible) before release. If task is for Y11–12, change AT? Rank to be visible for Students and Parents | LoL |

---

### Template B — Rubric-based — Tasks created in Canvas

**Stage 1: Task Creation & Setup**
| # | Checklist item | Default responsibility |
|---|---|---|
| 1 | Create the assignment (NoA) in Canvas using the correct stage template and naming conventions (all key sections completed, due date set) | Course Delegate (LoL oversight) |
| 2 | Confirm task NoA title matches the agreed naming convention (Canvas + Compass) | Course Delegate (LoL oversight) |
| 3 | Change the Display Mark as dropdown and set it to Letter Grade and ensure the grading scheme is set to St Edwards (STED) | Course Delegate |
| 4 | Confirm Sync to SIS is enabled in Canvas | Course Delegate |
| 5 | Confirm Canvas assessment due date matches online Assessment Handbook | Classroom Teacher / Course Delegate (LoL oversight) |
| 6 | Build the rubric in Canvas (Common Grading Scale or Marks-based), ensuring skill-based descriptors and improvement cues | Course Delegate |
| 7 | LoL/Assistant LoL checks rubric for consistency, wording, structure, and outcome alignment; approve for publication | LoL / Assistant LoL |

**Stage 2: Canvas & Compass Setup**
| # | Checklist item | Default responsibility |
|---|---|---|
| 8 | Before the 2-week NoA window: in Compass, Pull From Canvas, set Task Visible for students and parents, and check Currently Enrolled Students (remove Life Skills students) | Course Delegate (LoL oversight) |
| 9 | Between syncing the NoA and publishing results, paste the contact teacher statement at the top of the NoA in Compass | Course Delegate / LoL / Assistant LoL |
| 10 | Between syncing the NoA and staff entering results, AT? % and AT? Rank (for Y11–12) components must be added into the synced Learning Task | LoL / Assistant LoL |
| 11 | While adding the components to the Learning Task, set up the Reporting tab, linking the task to the relevant reporting cycle. For Semester 1 tasks, link to both Semester 1 and Semester 2 Reporting Cycles | LoL / Assistant LoL |

**Stage 3: Submission & Marking**
| # | Checklist item | Default responsibility |
|---|---|---|
| 12 | On the day of the task, record in Compass assessment task NoA if student has or has not handed in/sat assessment. Update as situation changes | Classroom Teacher |
| 13 | Set and communicate faculty marking and rubric completion deadlines | LoL |
| 14 | Mark using the Canvas rubric (minimise free-text comments unless required) within 3 weeks | Classroom Teacher |
| 15 | Within 3 weeks: ensure all results and rubrics are complete, then Pull From Canvas again in Compass to update marks/rubrics | LoL / Assistant LoL |
| 16 | Prior to deadline: check Compass for missing/incomplete results or rubrics and follow up | LoL / Assistant LoL |

**Stage 4: Comments & Publishing**
| # | Checklist item | Default responsibility |
|---|---|---|
| 17 | In Compass: enable Grading Visible to students and parents (confirm Raw Mark/Grade/Comment etc. are visible) before release. If task is for Y11–12, change AT? Rank to be visible for Students and Parents | LoL / Delegate |

---

## Deadline Logic

The LoL sets one anchor date: the task due date. The system auto-calculates sub-deadlines for each step based on the following relative rules. The LoL can override any calculated date after the flow is created.

| Trigger phrase in step | Auto-calculated deadline |
|---|---|
| "Before the 2-week NoA window" | Anchor date minus 14 days |
| "On the day of the task" | Anchor date |
| "Within 3 weeks" / "3-week deadline" | Anchor date plus 21 days |
| "2-week marking deadline" | Anchor date plus 14 days |
| "Prior to 3-week deadline" | Anchor date plus 18 days |
| All other setup steps (Stage 1–2) | Anchor date minus 21 days (default early) |

---

## Email Reminder System

### Trigger schedule
Reminders are sent automatically via a Supabase Edge Function triggered nightly by pg_cron. For each uncompleted step, the system sends reminders at:
- 5 days before due date
- 1 day before due date
- On the due date (if still incomplete)
- 1 day after due date (overdue notice)

### Recipients
- To: the staff member assigned to the step
- CC: the LoL of that flow

### Email content
Each reminder email includes:
- Assessment flow name and faculty
- Step number and description
- Due date
- Direct link to Checkpoint (the relevant flow view)
- Footer: "This is an automated reminder from Checkpoint. Replies go to [LoL email]."

### Manual override
LoLs can manually trigger a reminder email for any step at any time from the flow detail view.

### Reminder log
A log of all sent reminders is stored in the database and visible to the LoL inside the flow detail view, showing: recipient, step, sent timestamp, trigger type (auto/manual).

### Email sending address
Configured via the EMAIL_FROM environment variable. Default: noreply@checkpoint.stedwards.nsw.edu.au. This may need to change pending IT approval — update the .env value and redeploy, no code changes needed.

---

## Import from Previous Flow

LoLs can import a previous flow when creating a new one. The import carries over:
- Flow type (rubric/comment-based)
- All steps including any custom steps added in the original
- Staff role assignments (tagged personnel)

After import, the LoL reviews and updates:
- Staff names (in case of changes)
- Anchor date (new task due date)
- Any step customisations

The imported flow is saved as a new independent flow — the original is not affected.

---

## Database Schema (Supabase / Postgres)

```sql
-- Faculties
create table faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Users (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  email text,
  role text check (role in ('admin', 'lol', 'assistant_lol', 'course_delegate', 'classroom_teacher')),
  faculty_id uuid references faculties(id),
  created_at timestamptz default now()
);

-- Assessment flows
create table flows (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  faculty_id uuid references faculties(id),
  template_type text check (template_type in ('rubric', 'comment')),
  anchor_date date not null,
  created_by uuid references profiles(id),
  status text default 'draft' check (status in ('draft', 'active', 'complete')),
  imported_from uuid references flows(id),
  created_at timestamptz default now()
);

-- Flow steps
create table flow_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid references flows(id) on delete cascade,
  stage_number int not null,
  step_number text not null,
  description text not null,
  default_role text,
  assigned_to uuid references profiles(id),
  due_date date,
  is_custom boolean default false,
  sort_order int,
  created_at timestamptz default now()
);

-- Step completions
create table step_completions (
  id uuid primary key default gen_random_uuid(),
  step_id uuid references flow_steps(id) on delete cascade,
  completed_by uuid references profiles(id),
  completed_at timestamptz default now(),
  notes text
);

-- Flow members (who is tagged into which flow)
create table flow_members (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid references flows(id) on delete cascade,
  user_id uuid references profiles(id),
  role_in_flow text,
  added_at timestamptz default now()
);

-- Email reminder log
create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  step_id uuid references flow_steps(id),
  recipient_id uuid references profiles(id),
  lol_id uuid references profiles(id),
  sent_at timestamptz default now(),
  trigger_type text check (trigger_type in ('auto', 'manual')),
  days_before int
);
```

Enable Row Level Security on all tables. Policies:
- Users can only read flows they are members of
- Users can only update step_completions for steps assigned to them
- LoLs can read and write all flows within their faculty
- Admins have full access

---

## Project File Structure

```
checkpoint/
├── BRIEF.md                  ← this file
├── .env                      ← environment variables (never commit)
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── index.html
├── public/
│   └── favicon.ico
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   ├── supabase.js       ← Supabase client
    │   └── resend.js         ← Resend email client
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useFlows.js
    │   └── useProfile.js
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.jsx
    │   │   ├── Topbar.jsx
    │   │   └── ThemeToggle.jsx
    │   ├── flows/
    │   │   ├── FlowCard.jsx
    │   │   ├── FlowDetail.jsx
    │   │   ├── StageBlock.jsx
    │   │   ├── TaskRow.jsx
    │   │   └── TaskDetailPanel.jsx
    │   ├── forms/
    │   │   ├── NewFlowForm.jsx
    │   │   ├── CustomStepForm.jsx
    │   │   └── ImportFlowForm.jsx
    │   └── ui/
    │       ├── RoleBadge.jsx
    │       ├── StatusDot.jsx
    │       ├── ProgressBar.jsx
    │       └── StatCard.jsx
    ├── pages/
    │   ├── Login.jsx
    │   ├── Dashboard.jsx
    │   ├── FlowPage.jsx
    │   └── AdminPage.jsx
    └── supabase/
        ├── schema.sql        ← full DB schema
        └── functions/
            └── send-reminders/
                └── index.ts  ← Edge Function for nightly reminders
```

---

## Build Order

Build in this sequence to avoid dependency issues:

1. Scaffold the Vite + React project and install dependencies
2. Set up Tailwind CSS
3. Connect Supabase client (lib/supabase.js) and test connection
4. Run schema.sql in Supabase SQL editor to create all tables
5. Set up Supabase auth with magic link
6. Build the Login page
7. Build the Sidebar and Topbar layout components (with theme toggle)
8. Build the Dashboard page (flow list, stat overview)
9. Build the FlowDetail page (stage blocks, task rows, progress bars)
10. Build the TaskDetailPanel (side panel on step click)
11. Build the NewFlowForm with template selection and staff tagging
12. Build deadline auto-calculation logic
13. Build the ImportFlowForm
14. Build the CustomStepForm
15. Set up Resend email integration
16. Write and deploy the send-reminders Edge Function
17. Set up pg_cron nightly trigger in Supabase
18. Build the AdminPage
19. Deploy to Netlify

---

## Key Design Decisions to Respect

- The sidebar always shows all flows the user is tagged in — this is the primary navigation
- Teachers should never see steps that are not assigned to their role in a given flow
- Stage headers always have a distinct colour — never grey or washed out
- The light/dark toggle is always visible in the sidebar footer
- Role badges are colour-coded consistently across the entire application
- Every email sent is logged in the reminder_log table
- The EMAIL_FROM address is always sourced from the environment variable, never hardcoded
- The import feature creates a new independent flow — the source flow is read-only during import

---

## Opening Prompt for VS Code Claude

When you open this project in VS Code and start a Claude session, use this as your first message:

> "Read BRIEF.md in full. We are building Checkpoint, a live reporting management platform for St Edwards College. Start with Step 1 of the Build Order: scaffold the Vite + React project, install all required dependencies including Tailwind CSS, Supabase JS client, and React Router. Then set up the folder structure as specified in the brief. Do not begin any UI work yet — just get the project scaffolded and confirm each dependency is installed correctly."

---

*Brief version 1.0 — compiled June 2026*
*Do not modify this file during the build. If requirements change, create BRIEF-UPDATES.md alongside it.*
