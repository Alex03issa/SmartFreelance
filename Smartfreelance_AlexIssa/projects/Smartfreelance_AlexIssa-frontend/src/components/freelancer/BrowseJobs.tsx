import { useEffect, useMemo, useState } from 'react'
import {
  addAgreement,
  addProposal,
  loadAgreements,
  loadInvitesForFreelancerWallet,
  loadJobs,
  updateInvite,
  type Agreement,
  type Invite,
  type Job,
  type Proposal,
} from '../../state/store'

type InboxTab = 'INVITES'

export default function BrowseJobs(props: {
  freelancerWallet?: string
  onAgreementCreated?: (a: Agreement) => void
}) {
  const [q, setQ] = useState('')
  const [maxBudget, setMaxBudget] = useState<number>(100)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const [freelancerName, setFreelancerName] = useState('Alex Freelancer')
  const [message, setMessage] = useState('Hello! I can deliver this within 2 days. I have relevant experience.')
  const [proposedAlgo, setProposedAlgo] = useState<number>(5)
  const agreements = useMemo(() => loadAgreements(), [])
  const resolvedJobIds = useMemo(() => new Set(agreements.map((a) => a.jobId)), [agreements])

  // ===============================
  // Popup state (styled to match)
  // ===============================
  const [popup, setPopup] = useState<{ open: boolean; title?: string; message: string }>({
    open: false,
    message: '',
  })
  const showError = (msg: string, title = 'Action blocked') => setPopup({ open: true, title, message: msg })
  const showSuccess = (msg: string, title = 'Success') => setPopup({ open: true, title, message: msg })
  const closePopup = () => setPopup({ open: false, message: '' })

  // ===============================
  // Jobs + filter
  // ===============================
  const jobs = useMemo(() => loadJobs(), [])
  const jobById = useMemo(() => new Map<string, Job>(jobs.map((j) => [j.id, j])), [jobs])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return jobs
      .filter((j) => !resolvedJobIds.has(j.id))
      .filter((j) => j.budgetAlgo <= maxBudget)
      .filter((j) => {
        if (!query) return true
        return (
          j.title.toLowerCase().includes(query) ||
          j.description.toLowerCase().includes(query) ||
          j.category.toLowerCase().includes(query)
        )
      })
  }, [jobs, q, maxBudget])

  // ===============================
  // Inbox (Invites received)
  // ===============================
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxTab, setInboxTab] = useState<InboxTab>('INVITES')
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([])

  const refreshInbox = () => {
    const wallet = props.freelancerWallet ?? undefined
    setReceivedInvites(loadInvitesForFreelancerWallet(wallet))
  }

  useEffect(() => {
    if (!inboxOpen) return
    refreshInbox()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxOpen, props.freelancerWallet])

  const openInbox = () => {
    setInboxTab('INVITES')
    setInboxOpen(true)
  }
  const closeInbox = () => setInboxOpen(false)

  const walletLabel = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-6)}`

  const statusBadge = (status: Invite['status']) => {
    const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold'
    if (status === 'PENDING') return `${base} border-amber-400/30 bg-amber-500/10 text-amber-200`
    if (status === 'ACCEPTED') return `${base} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`
    return `${base} border-rose-400/30 bg-rose-500/10 text-rose-200`
  }

  // ===============================
  // Invite actions -> CREATE AGREEMENT
  // ===============================
  const acceptInvite = (inviteId: string) => {
    if (!props.freelancerWallet) {
      showError('Connect your wallet to accept invites.')
      return
    }

    const inv = receivedInvites.find((x) => x.id === inviteId)
    if (!inv) {
      showError('Invite not found. Click Refresh and try again.')
      return
    }

    if (inv.status !== 'PENDING') {
      showError('This invite is no longer pending.')
      return
    }

    const job = jobById.get(inv.jobId)
    if (!job) {
      showError('Job not found for this invite. Ask the client to re-post the job.')
      return
    }

    // 1) Mark invite accepted
    updateInvite(inviteId, { status: 'ACCEPTED' })

    // 2) Create agreement (POC)
    const agreement: Agreement = {
      id: `AG-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      jobId: job.id,
      jobTitle: job.title,
      budgetAlgo: job.budgetAlgo,

      clientWallet: inv.clientWallet,
      freelancerWallet: props.freelancerWallet,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    } as Agreement

    addAgreement(agreement)

    refreshInbox()
    showSuccess(`Agreement created for "${job.title}".`, 'Invite accepted')

    // Optional: let Home open it immediately
    props.onAgreementCreated?.(agreement)
  }

  const declineInvite = (inviteId: string) => {
    updateInvite(inviteId, { status: 'DECLINED' })
    refreshInbox()
  }

  // ===============================
  // Apply flow (proposal)
  // ===============================
  const apply = () => {
    if (!selectedJob) return

    if (!props.freelancerWallet) {
      showError('Connect your wallet before submitting a proposal.')
      return
    }

    if (!freelancerName.trim() || !message.trim()) {
      showError('Please provide your name and a proposal message.')
      return
    }

    if (selectedJob.clientWallet === props.freelancerWallet) {
      showError('You cannot submit a proposal for your own job.')
      return
    }

    const proposal: Proposal = {
      id: `PR-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      jobId: selectedJob.id,
      clientWallet: selectedJob.clientWallet,
      freelancerName: freelancerName.trim(),
      freelancerWallet: props.freelancerWallet,
      message: message.trim(),
      proposedAlgo: Number(proposedAlgo),
      createdAt: new Date().toISOString(),
    }

    addProposal(proposal)
    showSuccess(`Proposal submitted for ${selectedJob.title}`)
    setSelectedJob(null)
  }

  return (
    <div className="relative">
      {/* subtle accent background (match BrowseFreelancers) */}
      <div className="pointer-events-none absolute -top-8 left-1/2 h-40 w-[34rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 right-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Header + Filters + Inbox */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="text-xl font-extrabold tracking-tight text-slate-100">Browse Jobs</div>
          <div className="mt-1 text-sm text-slate-300">
            These jobs are created by clients (stored locally for the POC). Apply to create a proposal, or accept
            invites to create agreements.
          </div>
        </div>

        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(240px,1fr)_auto_auto]">
          {/* Search */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-500" />
            </div>
            <input
              className={[
                'h-11 w-full rounded-2xl border px-10 text-sm outline-none transition',
                'bg-slate-900/60 text-slate-100 placeholder:text-slate-400',
                'border-slate-800 focus:border-slate-600',
              ].join(' ')}
              placeholder="Search: Design, React, mobile..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault()
              }}
            />
          </div>

          {/* Max budget */}
          <div className="flex items-center gap-2">
            <div className="flex h-11 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3">
              <div className="text-xs font-semibold text-slate-300 leading-none">Max budget</div>
              <input
                type="number"
                className={[
                  'h-8 w-24 rounded-xl border px-3 text-sm outline-none transition',
                  'bg-slate-950/40 text-slate-100',
                  'border-slate-800 focus:border-slate-600',
                ].join(' ')}
                value={maxBudget}
                onChange={(e) => setMaxBudget(Number(e.target.value || 0))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.preventDefault()
                }}
              />
              <div className="text-xs text-slate-400 whitespace-nowrap">ALGO</div>
            </div>
          </div>

          {/* Inbox icon-only */}
          <button
            className={[
              'h-11 w-11 flex items-center justify-center rounded-2xl',
              'border border-slate-800 bg-slate-900/60 text-slate-100',
              'hover:border-slate-700 hover:bg-slate-900/70',
            ].join(' ')}
            onClick={() => {
              if (!props.freelancerWallet) {
                showError('Connect your wallet to view your invites inbox.')
                return
              }
              openInbox()
            }}
            type="button"
            aria-label="Inbox"
            title="Inbox"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-2 3h-8l-2-3H2" />
              <path d="M5 7l2-3h10l2 3v13H5V7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((j) => (
          <div
            key={j.id}
            className={[
              'group relative overflow-hidden rounded-3xl border',
              'border-slate-800 bg-slate-900/50',
              'shadow-sm transition hover:border-slate-700 hover:bg-slate-900/60',
            ].join(' ')}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-lg font-extrabold text-slate-100">{j.title}</div>
                  <div className="mt-1 text-sm text-slate-300">
                    {j.category} <span className="text-slate-500">•</span> {new Date(j.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-slate-100">{j.budgetAlgo} ALGO</div>
                </div>
              </div>

              <div className="mt-3 text-sm leading-relaxed text-slate-200/90">{j.description}</div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Client:{' '}
                  <span className="font-mono text-slate-300">
                    {j.clientWallet ? walletLabel(j.clientWallet) : '—'}
                  </span>
                </div>

                <button
                  className={[
                    'rounded-2xl px-3 py-2 text-sm font-semibold transition',
                    'bg-gradient-to-br from-cyan-500 to-indigo-500 text-white',
                    'hover:opacity-95 active:opacity-90',
                  ].join(' ')}
                  onClick={() => {
                    setSelectedJob(j)
                    setProposedAlgo(j.budgetAlgo)
                  }}
                  type="button"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <div className="text-sm font-semibold text-slate-200">No jobs</div>
          <div className="mt-1 text-sm text-slate-400">No jobs match your filters. Try a different keyword.</div>
        </div>
      )}

      {/* Apply modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700/70 bg-slate-800/85 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-100">Apply to: {selectedJob.title}</div>
                <div className="mt-1 text-xs text-slate-400">Job ID: {selectedJob.id}</div>
              </div>
              <button
                className="rounded-2xl border border-slate-700/70 bg-slate-900/30 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/40"
                onClick={() => setSelectedJob(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-200">Your name</label>
                <input
                  className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none"
                  value={freelancerName}
                  onChange={(e) => setFreelancerName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-200">Proposal message</label>
                <textarea
                  className="min-h-[110px] w-full rounded-2xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-200">Proposed budget (ALGO)</label>
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none"
                    value={proposedAlgo}
                    onChange={(e) => setProposedAlgo(Number(e.target.value))}
                    min={0.1}
                    step={0.1}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-200">Your wallet</label>
                  <input
                    className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/20 px-3 py-2 text-sm text-slate-300 outline-none"
                    value={props.freelancerWallet ?? ''}
                    disabled
                    placeholder="Connect wallet"
                  />
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  className="rounded-2xl border border-slate-700/70 bg-slate-900/30 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/40"
                  onClick={() => setSelectedJob(null)}
                  type="button"
                >
                  Cancel
                </button>

                <button
                  className="rounded-2xl border-0 bg-gradient-to-br from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                  onClick={apply}
                  type="button"
                >
                  Submit Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invites Inbox modal */}
      {inboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700/70 bg-slate-800/85 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-100">Invites Inbox</div>
                <div className="mt-1 text-sm text-slate-300">Invites sent to your wallet by clients.</div>
              </div>
              <button
                className="rounded-2xl border border-slate-700/70 bg-slate-900/30 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/40"
                onClick={closeInbox}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                className={[
                  'rounded-2xl px-4 py-2 text-sm font-semibold transition border',
                  inboxTab === 'INVITES'
                    ? 'bg-slate-950/40 text-slate-100 border border-slate-700/70'
                    : 'bg-slate-900/30 text-slate-300 border border-slate-800 hover:bg-slate-900/40',
                ].join(' ')}
                onClick={() => setInboxTab('INVITES')}
                type="button"
              >
                Received ({receivedInvites.length})
              </button>

              <div className="flex-1" />

              <button
                className="rounded-2xl border border-slate-700/70 bg-slate-900/30 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/40"
                onClick={(e) => {
                  e.preventDefault()
                  refreshInbox()
                }}
                type="button"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {receivedInvites.map((inv) => (
                <div key={inv.id} className="rounded-2xl border border-slate-700/70 bg-slate-900/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-extrabold text-slate-100">{inv.jobTitle}</div>
                        <span className={statusBadge(inv.status)}>{inv.status}</span>
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        From: <span className="font-mono text-slate-300">{walletLabel(inv.clientWallet)}</span>
                        <span className="text-slate-600"> • </span>
                        {new Date(inv.createdAt).toLocaleString()}
                      </div>

                      {inv.message && <div className="mt-2 text-sm text-slate-200/90">{inv.message}</div>}

                      <div className="mt-2 text-xs text-slate-400">
                        Fee: <span className="text-slate-200">{inv.inviteFeeAlgo} ALGO</span>
                        <span className="text-slate-600"> • </span>
                        TxID: <span className="font-mono text-slate-200">{inv.inviteFeeTxId}</span>
                      </div>
                    </div>

                    {inv.status === 'PENDING' && (
                      <div className="flex shrink-0 flex-col gap-2">
                        <button
                          className="rounded-2xl bg-emerald-600/90 px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
                          onClick={() => acceptInvite(inv.id)}
                          type="button"
                        >
                          Accept
                        </button>
                        <button
                          className="rounded-2xl bg-rose-600/90 px-3 py-2 text-sm font-semibold text-white hover:opacity-95"
                          onClick={() => declineInvite(inv.id)}
                          type="button"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {receivedInvites.length === 0 && (
                <div className="rounded-2xl border border-slate-700/70 bg-slate-900/30 p-8 text-center">
                  <div className="text-sm font-semibold text-slate-200">No invites</div>
                  <div className="mt-1 text-sm text-slate-400">You have not received any invites yet.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Styled popup */}
      {popup.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700/70 bg-slate-800/85 p-5 shadow-2xl backdrop-blur">
            <div className="text-lg font-semibold text-slate-100">{popup.title ?? 'Notice'}</div>
            <div className="mt-2 text-sm text-slate-300">{popup.message}</div>
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
        </div>
      )}
    </div>
  )
}
