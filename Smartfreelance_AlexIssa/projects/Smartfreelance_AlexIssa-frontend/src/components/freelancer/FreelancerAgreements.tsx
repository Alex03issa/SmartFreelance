import { useMemo } from 'react'
import { loadAgreements, type Agreement } from '../../state/store'

export default function FreelancerAgreements(props: {
  freelancerWallet?: string
  onOpenAgreement?: (a: Agreement) => void
}) {
  const agreements = useMemo(() => {
    const all = loadAgreements()
    if (!props.freelancerWallet) return [] 
    return all.filter((a) => a.freelancerWallet === props.freelancerWallet)
  }, [props.freelancerWallet])

  const walletLabel = (addr?: string) => {
    if (!addr) return '—'
    if (addr.startsWith('PASTE_')) return 'Not set'
    return `${addr.slice(0, 6)}…${addr.slice(-6)}`
  }

  const statusBadge = (status: Agreement['status']) => {
    const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold'
    if (status === 'DRAFT') return `${base} border-slate-600/50 bg-slate-500/10 text-slate-200`
    if (status === 'FUNDED') return `${base} border-cyan-400/30 bg-cyan-500/10 text-cyan-200`
    if (status === 'DELIVERED') return `${base} border-amber-400/30 bg-amber-500/10 text-amber-200`
    if (status === 'APPROVED') return `${base} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`
    return `${base} border-rose-400/30 bg-rose-500/10 text-rose-200`
  }

  return (
    <div className="relative">
      {/* subtle accent background (same vibe as BrowseFreelancers) */}
      <div className="pointer-events-none absolute -top-8 left-1/2 h-36 w-[32rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="text-xl font-extrabold tracking-tight text-slate-100">Agreements</div>
        <div className="text-sm text-slate-300">Agreements assigned to you as a freelancer.</div>
      </div>

      {/* List */}
      <div className="mt-6 grid grid-cols-1 gap-4">
        {agreements.map((a) => (
          <div
            key={a.id}
            className={[
              'group relative overflow-hidden rounded-3xl border',
              'border-slate-800 bg-slate-900/50',
              'shadow-sm transition hover:border-slate-700 hover:bg-slate-900/60',
            ].join(' ')}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-lg font-extrabold text-slate-100">{a.jobTitle}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    <span className="font-mono text-slate-300">{a.id}</span>
                    <span className="text-slate-600"> • </span>
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-extrabold text-slate-100">{a.budgetAlgo} ALGO</div>
                  <div className="mt-1">
                    <span className={statusBadge(a.status)}>Status: {a.status}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-400">
                  Client: <span className="font-mono text-slate-300">{walletLabel(a.clientWallet)}</span>
                </div>

                <button
                  className={[
                    'rounded-2xl px-3 py-2 text-sm font-semibold transition',
                    'bg-slate-900/40 text-slate-100 border border-slate-800',
                    'hover:border-slate-700 hover:bg-slate-900/60',
                  ].join(' ')}
                  onClick={() => props.onOpenAgreement?.(a)}
                  type="button"
                >
                  Open
                </button>
              </div>
            </div>
          </div>
        ))}

        {agreements.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center">
            <div className="text-sm font-semibold text-slate-200">No agreements yet</div>
            <div className="mt-1 text-sm text-slate-400">
              Apply to a job and have the client accept your proposal.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
