import { useEffect, useMemo, useState } from 'react'
import {
  deleteProposal,
  loadAgreements,
  loadJobs,
  loadProposals,
  type Job,
  type Proposal,
} from '../../state/store'

export default function MyProposals(props: { freelancerWallet?: string }) {
  const [success, setSuccess] = useState<string | null>(null)
  const [allProposals, setAllProposals] = useState<Proposal[]>([])

  const jobs = useMemo(() => loadJobs(), [])

  // Load proposals once, then keep them in state so delete updates UI immediately
  useEffect(() => {
    setAllProposals(loadProposals())
  }, [])

  const proposals = useMemo(() => {
    if (!props.freelancerWallet) return allProposals
    return allProposals.filter((p) => p.freelancerWallet === props.freelancerWallet)
  }, [allProposals, props.freelancerWallet])

  const jobById = useMemo(() => new Map<string, Job>(jobs.map((j) => [j.id, j])), [jobs])

  const walletLabel = (addr?: string) => {
    if (!addr) return '—'
    if (addr.startsWith('PASTE_')) return 'Not set'
    return `${addr.slice(0, 6)}…${addr.slice(-6)}`
  }

  const cannotDeleteProposalReason = (p: Proposal): string | null => {
    // Only proposal owner should delete (if wallet is set)
    if (p.freelancerWallet && props.freelancerWallet && p.freelancerWallet !== props.freelancerWallet) {
      return 'Only the proposal owner can delete this proposal'
    }

    // Locked if agreement exists for same job + freelancer
    const hasAgreement = loadAgreements().some(
      (a) => a.jobId === p.jobId && a.freelancerWallet === p.freelancerWallet
    )
    if (hasAgreement) return 'This proposal was accepted (agreement exists)'

    return null
  }

  const onDeleteProposal = (proposalId: string) => {
    setSuccess(null)
    const res = deleteProposal(proposalId, props.freelancerWallet)

    if (!res.ok) {
      const msg =
        res.reason === 'HAS_AGREEMENT'
          ? 'Cannot delete: proposal already accepted (agreement exists).'
          : res.reason === 'NOT_OWNER'
          ? 'Cannot delete: only the proposal owner can delete it.'
          : 'Cannot delete: proposal not found.'
      setSuccess(msg)
      return
    }

    setAllProposals(res.proposals)
    setSuccess(`Proposal deleted: ${proposalId}`)
  }

  return (
    <div className="relative">
      {/* subtle accent background */}
      <div className="pointer-events-none absolute -top-8 left-1/2 h-36 w-[32rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Header */}
      <div className="min-w-0">
        <div className="text-xl font-extrabold tracking-tight text-slate-100">My Proposals</div>
        <div className="mt-1 text-sm text-slate-300">Proposals you submitted as a freelancer.</div>
      </div>

      {success && (
        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-200">
          {success}
        </div>
      )}

      {/* List */}
      <div className="mt-6 grid grid-cols-1 gap-4">
        {proposals.map((p: Proposal) => {
          const job = jobById.get(p.jobId)
          const reason = cannotDeleteProposalReason(p)
          const locked = !!reason

          return (
            <div
              key={p.id}
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
                    <div className="truncate text-lg font-extrabold text-slate-100">
                      {job?.title ?? 'Unknown Job'}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Proposal: <span className="font-mono text-slate-300">{p.id}</span>
                      <span className="text-slate-600"> • </span>
                      {new Date(p.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="shrink-0 text-right flex flex-col items-end gap-2">
                    <div className="text-sm font-extrabold text-slate-100">{p.proposedAlgo} ALGO</div>

                    <button
                      type="button"
                      disabled={locked}
                      title={reason ?? 'Delete proposal'}
                      onClick={() => !locked && onDeleteProposal(p.id)}
                      className={[
                        'rounded-2xl px-3 py-1 text-xs font-semibold border transition',
                        locked
                          ? 'cursor-not-allowed border-slate-700 bg-slate-800/40 text-slate-500'
                          : 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20',
                      ].join(' ')}
                    >
                      {locked ? 'Locked' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-sm leading-relaxed text-slate-200/90">{p.message}</div>

                <div className="mt-4 text-xs text-slate-400">
                  Wallet: <span className="font-mono text-slate-300">{walletLabel(p.freelancerWallet)}</span>
                </div>
              </div>
            </div>
          )
        })}

        {proposals.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center">
            <div className="text-sm font-semibold text-slate-200">No proposals yet</div>
            <div className="mt-1 text-sm text-slate-400">Browse jobs and apply.</div>
          </div>
        )}
      </div>
    </div>
  )
}
