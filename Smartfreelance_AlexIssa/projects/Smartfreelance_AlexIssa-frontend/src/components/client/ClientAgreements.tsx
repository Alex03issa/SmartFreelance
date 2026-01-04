import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  addAgreement,
  loadAgreements,
  loadJobs,
  loadProposals,
  type Agreement,
  type Job,
  type Proposal,
} from '../../state/store'

export default function ClientAgreements(props: {
  clientWallet?: string
  onOpenAgreement?: (a: Agreement) => void
}) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [openJobId, setOpenJobId] = useState<string | null>(null)

  const jobs = useMemo(() => {
    const all = loadJobs()
    if (!props.clientWallet) return []
    return all.filter((j) => j.clientWallet === props.clientWallet)
  }, [refreshKey, props.clientWallet])

  const proposals = useMemo(() => {
    const all = loadProposals()
    if (!props.clientWallet) return []
    return all.filter((p) => p.clientWallet === props.clientWallet)
  }, [refreshKey, props.clientWallet])

  const agreements = useMemo(() => {
    const all = loadAgreements()
    if (!props.clientWallet) return []
    return all.filter((a) => a.clientWallet === props.clientWallet)
  }, [refreshKey, props.clientWallet])


  const [popup, setPopup] = useState<{ open: boolean; title?: string; message: string }>({
    open: false,
    message: '',
  })
  const closePopup = () => setPopup({ open: false, message: '' })

  const showError = (message: string, title = 'Action blocked') => {
    setPopup({ open: true, title, message })
  }

  const proposalsByJob = useMemo(() => {
    const map = new Map<string, Proposal[]>()

    for (const p of proposals) {
      if (!props.clientWallet) continue
      if (p.clientWallet !== props.clientWallet) continue

      // Block self-dealing
      if (p.freelancerWallet && p.freelancerWallet === props.clientWallet) continue

      const arr = map.get(p.jobId) ?? []
      arr.push(p)
      map.set(p.jobId, arr)
    }

    for (const [jobId, arr] of map.entries()) {
      arr.sort((a, b) => b.proposedAlgo - a.proposedAlgo)
    }
    return map
  }, [proposals, props.clientWallet])




  const existingAgreementJobIds = useMemo(() => new Set(agreements.map((a) => a.jobId)), [agreements])

  const acceptProposal = (job: Job, proposal: Proposal) => {


    const clientAddr = props.clientWallet ?? job.clientWallet

    if (clientAddr && proposal.freelancerWallet && proposal.freelancerWallet === clientAddr) {
      showError('Blocked: you cannot accept a proposal submitted from the same wallet as the client.')
      return
    }

    const agreement: Agreement = {
      id: `AGR-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      jobId: job.id,
      jobTitle: job.title,
      budgetAlgo: proposal.proposedAlgo,
      clientWallet: props.clientWallet ?? job.clientWallet,
      freelancerWallet: proposal.freelancerWallet,
      freelancerName: proposal.freelancerName,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    }

    addAgreement(agreement)
    setPopup({
      open: true,
      title: 'Agreement created',
      message: `Agreement created successfully.\nID: ${agreement.id}`,
    })

    setRefreshKey((k) => k + 1)
    // keep context: collapse the job group after accept
    setOpenJobId(null)
  }

  const short = (addr?: string) => (!addr ? 'No wallet' : `${addr.slice(0, 6)}…${addr.slice(-6)}`)

  const StatusPill = ({ status }: { status: Agreement['status'] }) => {
    const cls =
      status === 'APPROVED'
        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
        : status === 'DELIVERED'
          ? 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200'
          : status === 'FUNDED'
            ? 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200'
            : 'border-slate-400/20 bg-slate-500/10 text-slate-200'

    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
        {status}
      </span>
    )
  }

  // Separate jobs into “pending proposals” vs “already accepted”
  const jobsWithProposals = useMemo(() => {
    return jobs
      .map((j) => ({ job: j, proposals: proposalsByJob.get(j.id) ?? [] }))
      .filter((x) => x.proposals.length > 0)
  }, [jobs, proposalsByJob])

  const pendingJobs = useMemo(() => {
    return jobsWithProposals.filter((x) => !existingAgreementJobIds.has(x.job.id))
  }, [jobsWithProposals, existingAgreementJobIds])

  const acceptedJobsCount = useMemo(() => {
    return jobsWithProposals.filter((x) => existingAgreementJobIds.has(x.job.id)).length
  }, [jobsWithProposals, existingAgreementJobIds])

   return (
    <>
      <div className="relative">
        {/* local accents */}
        <div className="pointer-events-none absolute -top-10 right-0 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

        {/* Header */}
        <div className="mb-6">
          <div className="text-xl font-extrabold tracking-tight text-slate-100">Client Dashboard</div>
          <div className="mt-1 text-sm text-slate-400">
            Agreements are finalized decisions. Proposals Inbox is where you choose a freelancer.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT: Agreements */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/30 backdrop-blur p-5">
         
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">Agreements</div>
                <div className="mt-1 text-xs text-slate-400">
                  These are created agreements. Open one to continue the on-chain flow.
                </div>
              </div>
              <div className="rounded-full border border-slate-800 bg-slate-950/40 px-2.5 py-1 text-xs font-semibold text-slate-200">
                {agreements.length} total
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {agreements.map((a) => (
                <div
                  key={a.id}
                  className="group rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-700"
                >
                  <div className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />

                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-base font-extrabold text-slate-100">{a.jobTitle}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        <span className="font-mono text-slate-300">{a.id}</span> •{' '}
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-extrabold text-slate-100">{a.budgetAlgo} ALGO</div>
                      <div className="mt-1">
                        <StatusPill status={a.status} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                      <div className="text-[11px] font-semibold text-slate-400">Freelancer</div>
                      <div className="mt-1 text-sm font-semibold text-slate-100">{a.freelancerName}</div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                      <div className="text-[11px] font-semibold text-slate-400">Freelancer wallet</div>
                      <div className="mt-1 font-mono text-sm text-slate-200">{short(a.freelancerWallet)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      className="rounded-2xl border border-slate-800 bg-slate-950/30 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-950/45 hover:border-slate-700"
                      onClick={() => props.onOpenAgreement?.(a)}
                      type="button"
                    >
                      Open agreement
                    </button>
                  </div>
                </div>
              ))}

              {agreements.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 text-center">
                  <div className="text-sm font-semibold text-slate-200">No agreements yet</div>
                  <div className="mt-1 text-sm text-slate-400">Accept a proposal from the inbox to create one.</div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Proposals Inbox */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/30 backdrop-blur p-5">

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">Proposals Inbox</div>
                <div className="mt-1 text-xs text-slate-400">
                  Only jobs without an agreement show up here (so nothing is “lost”).
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-800 bg-slate-950/40 px-2.5 py-1 text-xs font-semibold text-slate-200">
                  {pendingJobs.length} pending
                </span>
                {acceptedJobsCount > 0 && (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                    {acceptedJobsCount} resolved
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {pendingJobs.map(({ job, proposals: jobProposals }) => {
                const isOpen = openJobId === job.id

                return (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/40 transition hover:border-slate-700"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenJobId((cur) => (cur === job.id ? null : job.id))}
                      className="w-full px-4 py-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-slate-100">{job.title}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {job.category} <span className="text-slate-600">•</span> {job.budgetAlgo} ALGO
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center rounded-full border border-slate-400/20 bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
                            {jobProposals.length} proposals
                          </span>
                          <div className="mt-2 text-xs text-slate-400">{isOpen ? 'Hide' : 'Review'}</div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-slate-300 line-clamp-2">{job.description}</div>
                    </button>

                    {isOpen && (
                      <>
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-600/40 to-transparent" />

                        <div className="p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-400">Proposals</div>
                            <div className="text-xs text-slate-500">Choose one to create an agreement</div>
                          </div>

                          <div className="grid gap-3">
                            {jobProposals.map((p) => (
                              <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="text-sm font-extrabold text-slate-100">{p.freelancerName}</div>
                                    <div className="mt-1 font-mono text-xs text-slate-300">{short(p.freelancerWallet)}</div>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <div className="text-sm font-extrabold text-slate-100">{p.proposedAlgo} ALGO</div>
                                    <div className="mt-1 text-xs text-slate-400">Proposed budget</div>
                                  </div>
                                </div>

                                <div className="mt-3 text-sm text-slate-300">{p.message}</div>

                                <div className="mt-4 flex justify-end">
                                  <button
                                    className="rounded-2xl border-0 bg-gradient-to-br from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 active:opacity-90"
                                    onClick={() => acceptProposal(job, p)}
                                    type="button"
                                  >
                                    Accept & Create Agreement
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {pendingJobs.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 text-center">
                  <div className="text-sm font-semibold text-slate-200">Inbox clear</div>
                  <div className="mt-1 text-sm text-slate-400">
                    No pending proposals. If proposals exist for a job with an agreement, it’s considered resolved.
                  </div>
                </div>
              )}

              {jobs.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-6 text-center">
                  <div className="text-sm font-semibold text-slate-200">No jobs posted</div>
                  <div className="mt-1 text-sm text-slate-400">Create a job first to start receiving proposals.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Popup */}
      {popup.open &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700/70 bg-slate-800/90 p-5 shadow-2xl backdrop-blur">
              <div className="text-lg font-semibold text-slate-100">{popup.title ?? 'Notice'}</div>
              <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap break-words">{popup.message}</div>
              <div className="mt-4 flex justify-end">
                <button
                  className="rounded-2xl border-0 bg-gradient-to-br from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white"
                  onClick={closePopup}
                  type="button"
                >
                  OK
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

    </>
  )
}