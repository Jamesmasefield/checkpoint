// Shared classNames for form inputs/selects across NewFlowForm and
// ImportFlowForm. Native <select> elements don't reliably honour
// Tailwind's bg-transparent across browsers — without appearance-none +
// an explicit solid background, the popup can render with the OS's own
// background while inheriting our text color, making it unreadable until
// hover/focus changes the contrast.
export const SELECT_CLASS =
  'mt-1 w-full appearance-none rounded-md border border-[#e5e7eb] bg-white p-2 text-sm text-slate-900 outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-[#161b27] dark:text-slate-200'

export const INPUT_CLASS =
  'mt-1 w-full rounded-md border border-[#e5e7eb] p-2 text-sm outline-none focus:border-[#4f6ef7] dark:border-white/[0.08] dark:bg-transparent dark:text-slate-200'
