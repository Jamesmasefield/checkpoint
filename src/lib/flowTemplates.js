// Checklist templates from BRIEF.md's "Flow Templates" section, copied
// verbatim. Used by NewFlowForm to pre-populate flow_steps for whichever
// template the LoL picks.

export const FLOW_TEMPLATES = {
  comment: {
    label: 'Comment-based (Non-Rubric)',
    description: 'Tasks created in Compass',
    steps: [
      { stage_number: 1, step_number: '1', description: 'Create the assignment (NoA) in Canvas using the correct stage template and naming conventions (all key sections completed, due date set)', default_role: 'Course Delegate (LoL oversight)' },
      { stage_number: 1, step_number: '2', description: 'Confirm task NoA title matches the agreed naming convention (Canvas + Compass)', default_role: 'Course Delegate (LoL oversight)' },
      { stage_number: 1, step_number: '3', description: 'Confirm Sync to SIS is enabled in Canvas', default_role: 'Course Delegate' },
      { stage_number: 1, step_number: '4', description: 'Confirm Canvas NoA due date and Task Name has been entered and matches online Assessment Handbook', default_role: 'Classroom Teacher / Course Delegate (LoL oversight)' },
      { stage_number: 1, step_number: '5', description: 'LoL/Assistant LoL/Delegate checks NoA for consistency, wording, structure, and outcome alignment; approve for publication', default_role: 'LoL / Assistant LoL / Course Delegate' },
      { stage_number: 2, step_number: '6', description: 'Before the 2-week NoA window: in Compass, Pull From Canvas, set Task Visible for students and parents, and check Currently Enrolled Students (remove Life Skills students)', default_role: 'Course Delegate (LoL oversight)' },
      { stage_number: 2, step_number: '7', description: 'Create Learning Task for task results in Compass using the 1–5 Section Assessment Task templates', default_role: 'LoL / Assistant LoL' },
      { stage_number: 2, step_number: '8', description: 'While creating the Learning Task in Compass, set up the Reporting tab, linking the task to the relevant reporting cycle. For Semester 1 tasks, link to both Semester 1 and Semester 2 Reporting Cycles', default_role: 'LoL / Assistant LoL' },
      { stage_number: 3, step_number: '9', description: 'On the day of the task, record in Compass assessment task NoA if student has or has not handed in/sat assessment. Update as situation changes', default_role: 'Classroom Teacher' },
      { stage_number: 3, step_number: '10', description: 'Set and communicate faculty marking and feedback deadline (within 3 weeks)', default_role: 'LoL' },
      { stage_number: 3, step_number: '11', description: 'By 2-week marking deadline: ensure all results complete and entered in the Learning Task on Compass', default_role: 'Classroom Teacher (LoL oversight)' },
      { stage_number: 3, step_number: '12', description: 'Check Compass for missing/incomplete results and follow up', default_role: 'LoL / Assistant LoL' },
      { stage_number: 4, step_number: '13a', description: 'Apply standardised comments for every student (including late penalties, approved misadventures, estimates etc) — do not individualise', default_role: 'Classroom Teacher (LoL oversight)' },
      { stage_number: 4, step_number: '13b', description: "For formal examination blocks, generalised marker's feedback should be attached in the Learning Task", default_role: 'Course Delegate (LoL oversight)' },
      { stage_number: 4, step_number: '14', description: 'Prior to 3-week deadline: check all comments are complete', default_role: 'LoL / Assistant LoL' },
      { stage_number: 4, step_number: '15', description: 'In Compass: enable Grading Visible to students and parents (confirm Raw Mark/Grade/Comment etc. are visible) before release. If task is for Y11–12, change AT? Rank to be visible for Students and Parents', default_role: 'LoL' },
    ],
  },
  rubric: {
    label: 'Rubric-based',
    description: 'Tasks created in Canvas',
    steps: [
      { stage_number: 1, step_number: '1', description: 'Create the assignment (NoA) in Canvas using the correct stage template and naming conventions (all key sections completed, due date set)', default_role: 'Course Delegate (LoL oversight)' },
      { stage_number: 1, step_number: '2', description: 'Confirm task NoA title matches the agreed naming convention (Canvas + Compass)', default_role: 'Course Delegate (LoL oversight)' },
      { stage_number: 1, step_number: '3', description: 'Change the Display Mark as dropdown and set it to Letter Grade and ensure the grading scheme is set to St Edwards (STED)', default_role: 'Course Delegate' },
      { stage_number: 1, step_number: '4', description: 'Confirm Sync to SIS is enabled in Canvas', default_role: 'Course Delegate' },
      { stage_number: 1, step_number: '5', description: 'Confirm Canvas assessment due date matches online Assessment Handbook', default_role: 'Classroom Teacher / Course Delegate (LoL oversight)' },
      { stage_number: 1, step_number: '6', description: 'Build the rubric in Canvas (Common Grading Scale or Marks-based), ensuring skill-based descriptors and improvement cues', default_role: 'Course Delegate' },
      { stage_number: 1, step_number: '7', description: 'LoL/Assistant LoL checks rubric for consistency, wording, structure, and outcome alignment; approve for publication', default_role: 'LoL / Assistant LoL' },
      { stage_number: 2, step_number: '8', description: 'Before the 2-week NoA window: in Compass, Pull From Canvas, set Task Visible for students and parents, and check Currently Enrolled Students (remove Life Skills students)', default_role: 'Course Delegate (LoL oversight)' },
      { stage_number: 2, step_number: '9', description: 'Between syncing the NoA and publishing results, paste the contact teacher statement at the top of the NoA in Compass', default_role: 'Course Delegate / LoL / Assistant LoL' },
      { stage_number: 2, step_number: '10', description: 'Between syncing the NoA and staff entering results, AT? % and AT? Rank (for Y11–12) components must be added into the synced Learning Task', default_role: 'LoL / Assistant LoL' },
      { stage_number: 2, step_number: '11', description: 'While adding the components to the Learning Task, set up the Reporting tab, linking the task to the relevant reporting cycle. For Semester 1 tasks, link to both Semester 1 and Semester 2 Reporting Cycles', default_role: 'LoL / Assistant LoL' },
      { stage_number: 3, step_number: '12', description: 'On the day of the task, record in Compass assessment task NoA if student has or has not handed in/sat assessment. Update as situation changes', default_role: 'Classroom Teacher' },
      { stage_number: 3, step_number: '13', description: 'Set and communicate faculty marking and rubric completion deadlines', default_role: 'LoL' },
      { stage_number: 3, step_number: '14', description: 'Mark using the Canvas rubric (minimise free-text comments unless required) within 3 weeks', default_role: 'Classroom Teacher' },
      { stage_number: 3, step_number: '15', description: 'Within 3 weeks: ensure all results and rubrics are complete, then Pull From Canvas again in Compass to update marks/rubrics', default_role: 'LoL / Assistant LoL' },
      { stage_number: 3, step_number: '16', description: 'Prior to deadline: check Compass for missing/incomplete results or rubrics and follow up', default_role: 'LoL / Assistant LoL' },
      { stage_number: 4, step_number: '17', description: 'In Compass: enable Grading Visible to students and parents (confirm Raw Mark/Grade/Comment etc. are visible) before release. If task is for Y11–12, change AT? Rank to be visible for Students and Parents', default_role: 'LoL / Delegate' },
    ],
  },
}
