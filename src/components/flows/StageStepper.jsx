// Step number badge background tints — light variants of s1–s4
const STEP_NUM_BG = ['#c4b5fd', '#93c5fd', '#fcd34d', '#5eead4']

export default function StageStepper({ stages }) {
  return (
    <div className="mt-[22px] grid grid-cols-4 gap-2.5">
      {stages.map((stage, i) => {
        const pct = stage.total > 0 ? Math.round((stage.done / stage.total) * 100) : 0
        return (
          <button
            key={stage.number}
            type="button"
            onClick={() => document.getElementById(`stage-${stage.number}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="rounded-xl p-[11px_13px] backdrop-blur-sm transition-all duration-150 hover:-translate-y-0.5 cursor-pointer text-left w-full"
            style={{
              background: 'var(--hero-glass)',
              border: '1px solid var(--hero-glass-border)',
            }}
          >
            <div className="mb-[7px] flex items-center gap-2">
              <span
                className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[7px] font-display text-[12px] font-bold text-[#1a1d2e]"
                style={{ background: STEP_NUM_BG[i] }}
              >
                {stage.number}
              </span>
              <span className="flex-1 text-[12px] font-semibold leading-tight" style={{ color: 'var(--hero-ink)' }}>
                {stage.title}
              </span>
              <span className="ml-auto font-display text-[11px] font-semibold" style={{ color: 'var(--hero-ink-dim)' }}>
                {stage.done}/{stage.total}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
            </div>
          </button>
        )
      })}
    </div>
  )
}
