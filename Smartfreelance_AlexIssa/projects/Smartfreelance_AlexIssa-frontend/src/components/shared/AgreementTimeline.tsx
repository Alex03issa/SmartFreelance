import type { AgreementStatus } from '../../state/store';

const steps: { id: AgreementStatus; label: string; desc: string }[] = [
  { id: 'DRAFT', label: 'Draft', desc: 'Agreement created' },
  { id: 'FUNDED', label: 'Funded', desc: 'Client paid / deposited' },
  { id: 'DELIVERED', label: 'Delivered', desc: 'Freelancer submitted work' },
  { id: 'APPROVED', label: 'Approved', desc: 'Client accepted & closed' },
]

export default function AgreementTimeline(props: { status: AgreementStatus }) {
  const idx = steps.findIndex((s) => s.id === props.status)

  return (
    <div className="mt-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4">
        {steps.map((s, i) => {
          const done = i <= idx
          const isLast = i === steps.length - 1

          return (
            <div key={s.id} className="min-w-0">
              {/* Top row: dot + label */}
              <div className="flex items-center gap-2">
                <div
                  className={[
                    'h-3 w-3 rounded-full border',
                    done
                      ? 'bg-emerald-400 border-emerald-300/40 shadow-[0_0_0_4px_rgba(52,211,153,0.10)]'
                      : 'bg-slate-700 border-slate-600/60',
                  ].join(' ')}
                />
                <div
                  className={[
                    'text-sm font-semibold truncate',
                    done ? 'text-slate-100' : 'text-slate-300',
                  ].join(' ')}
                >
                  {s.label}
                </div>
              </div>

              {/* Description */}
              <div className={['mt-1 text-xs', done ? 'text-slate-300' : 'text-slate-400/80'].join(' ')}>
                {s.desc}
              </div>

                <div
                  className={[
                    'mt-3 h-[2px] w-full rounded-full',
                    done ? 'bg-emerald-400/35' : 'bg-slate-700/70',
                  ].join(' ')}
                />
            </div>
          )
        })}
      </div>
    </div>
  )
}
