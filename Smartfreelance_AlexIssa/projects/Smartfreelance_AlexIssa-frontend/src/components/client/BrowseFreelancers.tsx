import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useEffect, useMemo, useState } from 'react'
import { freelancers, type Freelancer } from '../../data/freelancers'
import {
  addInvite,
  // invites helpers (make sure these are exported from ../../state/store)
  loadInvitesForClientWallet,
  loadInvitesForFreelancerWallet,
  loadJobs,
  updateInvite,
  type Invite,
  type Job,
} from '../../state/store'
import { getAlgodConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'

type InboxTab = 'RECEIVED' | 'SENT'

export default function BrowseFreelancers(props: { onInvite?: (freelancer: Freelancer) => void }) {
  const { activeAddress, transactionSigner } = useWallet()

  const [q, setQ] = useState('')
  const [maxRate, setMaxRate] = useState<number>(100)

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteTo, setInviteTo] = useState<Freelancer | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [message, setMessage] = useState<string>('')

  // Jobs (keep in sync with localStorage)
  const [jobs, setJobs] = useState<Job[]>([])
  useEffect(() => {
    setJobs(loadJobs())
  }, [inviteOpen])

  // Inbox modal state
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxTab, setInboxTab] = useState<InboxTab>('RECEIVED')
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([])
  const [sentInvites, setSentInvites] = useState<Invite[]>([])

  // Busy state (wallet signing)
  const [busy, setBusy] = useState(false)

  // Algorand client
  const algodConfig = useMemo(() => getAlgodConfigFromViteEnvironment(), [])
  const algorand = useMemo(() => AlgorandClient.fromConfig({ algodConfig }), [algodConfig])

  // Config (env)
  const platformWallet = (import.meta.env.VITE_PLATFORM_WALLET as string | undefined) ?? ''
  const inviteFeeAlgo = Number(import.meta.env.VITE_INVITE_FEE_ALGO ?? 0.1)

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    return freelancers
      .filter((f) => f.hourlyRate <= maxRate)
      .filter((f) => {
        if (!query) return true
        return (
          f.name.toLowerCase().includes(query) ||
          f.title.toLowerCase().includes(query) ||
          f.skills.some((s) => s.toLowerCase().includes(query)) ||
          f.location.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => b.rating - a.rating)
  }, [q, maxRate])

  const walletLabel = (addr: string) =>
    addr.startsWith('PASTE_') ? 'Not set' : `${addr.slice(0, 6)}…${addr.slice(-6)}`

  const requireWallet = () => {
    if (!activeAddress) throw new Error('Connect wallet first')
    if (!transactionSigner) throw new Error('Wallet signer not available. Reconnect wallet session.')
  }

  // -------------------------
  // Inbox refresh helpers
  // -------------------------
  const refreshInbox = () => {
    const wallet = activeAddress ?? undefined
    setReceivedInvites(loadInvitesForFreelancerWallet(wallet))
    setSentInvites(loadInvitesForClientWallet(wallet))

  }

  useEffect(() => {
    if (!inboxOpen) return
    refreshInbox()
  }, [inboxOpen, activeAddress])

  const openInbox = () => {
    setInboxTab('RECEIVED')
    setInboxOpen(true)
  }

  const closeInbox = () => setInboxOpen(false)

  // -------------------------
  // Invite flow
  // -------------------------
  const openInvite = (f: Freelancer) => {
    // No popups here (Home owns popups). We just guard silently.
    if (!platformWallet) return
    if (!activeAddress) return

    const latestJobs = loadJobs()
    if (!latestJobs.length) return

    setInviteTo(f)

    // Default selected job = latest job
    const latest = [...latestJobs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
    setSelectedJobId(latest?.id ?? '')
    setMessage('')
    setInviteOpen(true)
  }

  const closeInvite = () => {
    if (busy) return
    setInviteOpen(false)
    setInviteTo(null)
    setSelectedJobId('')
    setMessage('')
  }

  /**
   * IMPORTANT:
   * - Do not await anything before the wallet call (mobile WC reliability).
   */
  const sendInviteWithFee = async () => {
    requireWallet()
    if (!inviteTo) throw new Error('No freelancer selected')
    if (!platformWallet) throw new Error('Platform wallet missing (VITE_PLATFORM_WALLET)')
    if (!selectedJobId) throw new Error('Select a job for this invite')

    const job: Job | undefined = loadJobs().find((j) => j.id === selectedJobId)
    if (!job) throw new Error('Selected job not found (refresh and try again)')

    if (!inviteTo.walletAddress || inviteTo.walletAddress.startsWith('PASTE_')) {
      throw new Error('This freelancer wallet is not set (demo data). Choose another freelancer.')
    }

    setBusy(true)
    try {
      // 1) Pay platform fee (FIRST awaited call must be wallet call)
      const pay = await algorand.send.payment({
        signer: transactionSigner!,
        sender: activeAddress!,
        receiver: platformWallet,
        amount: algo(inviteFeeAlgo),
        note: `SmartFreelance INVITE_FEE job=${job.id}`,
      })

      const feeTxId =
        (pay as any).txId ??
        (pay as any).txid ??
        (pay as any).txIds?.[0] ??
        (pay as any).txids?.[0]

      if (!feeTxId) throw new Error('Payment succeeded but TxID missing from response')

      // 2) Save invite (off-chain inbox item)
      addInvite({
        id: `INV-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
        jobId: job.id,
        jobTitle: job.title,
        clientWallet: activeAddress!,
        freelancerId: inviteTo.id,
        freelancerName: inviteTo.name,
        freelancerWallet: inviteTo.walletAddress,
        message: message.trim(),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        inviteFeeAlgo,
        inviteFeeTxId: feeTxId,
        platformWallet,
      })

      // Close modal
      setInviteOpen(false)
      setInviteTo(null)
      setSelectedJobId('')
      setMessage('')

      // Let Home show the popup / toast (single source of truth)
      props.onInvite?.(inviteTo)

      // If inbox is open, refresh it so the “Sent” list updates immediately
      if (inboxOpen) refreshInbox()
    } finally {
      setBusy(false)
    }
  }

  // -------------------------
  // Inbox actions (Freelancer side)
  // -------------------------
  const acceptInvite = (inviteId: string) => {
    updateInvite(inviteId, { status: 'ACCEPTED' })
    refreshInbox()
  }

  const declineInvite = (inviteId: string) => {
    updateInvite(inviteId, { status: 'DECLINED' })
    refreshInbox()
  }

  const statusBadge = (status: Invite['status']) => {
    const base =
      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold'
    if (status === 'PENDING')
      return `${base} border-amber-400/30 bg-amber-500/10 text-amber-200`
    if (status === 'ACCEPTED')
      return `${base} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`
    return `${base} border-rose-400/30 bg-rose-500/10 text-rose-200`
  }

  return (
    <div className="relative">
      {/* subtle accent background */}
      <div className="pointer-events-none absolute -top-8 left-1/2 h-40 w-[34rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 right-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Header + Filters + Inbox */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {/* Header (optional: slightly narrower) */}
         <div className="min-w-0">
            <div className="text-xl font-extrabold tracking-tight text-slate-100">
              Browse Freelancers
            </div>
            <div className="mt-1 text-sm text-slate-300">
              Search by skills, role, or location. Invites are linked to a job and cost a small platform fee.
            </div>
          </div>

        {/* Filters row */}
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[160px_auto_auto] md:grid-cols-[240px_auto_auto]">
          {/* Search (bigger) */}
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
              placeholder="Search: React, Figma, Beirut..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Max rate + /hr OUTSIDE */}
          <div className="flex items-center gap-2">
            <div className="flex h-11 items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3">
              <div className="text-xs font-semibold text-slate-300 leading-none">Max rate</div>
              <input
                type="number"
                className={[
                  'h-8 w-24 rounded-xl border px-3 text-sm outline-none transition',
                  'bg-slate-950/40 text-slate-100',
                  'border-slate-800 focus:border-slate-600',
                ].join(' ')}
                value={maxRate}
                onChange={(e) => setMaxRate(Number(e.target.value || 0))}
              />
              <div className="text-xs text-slate-400 whitespace-nowrap">/hr</div>
            </div>

            
          </div>

          {/* Inbox: icon-only, minimal width */}
          <button
            className={[
              'h-11 w-11 flex items-center justify-center rounded-2xl',
              'border border-slate-800 bg-slate-900/60 text-slate-100',
              'hover:border-slate-700 hover:bg-slate-900/70',
            ].join(' ')}
            onClick={openInbox}
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
        {results.map((f) => (
          <div
            key={f.id}
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
                  <div className="truncate text-lg font-extrabold text-slate-100">{f.name}</div>
                  <div className="mt-1 text-sm text-slate-300">
                    {f.title} <span className="text-slate-500">•</span> {f.location}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold text-slate-100">${f.hourlyRate}/hr</div>
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-800 bg-slate-950/30 px-2 py-0.5 text-xs text-slate-300">
                    <span className="text-amber-300">★</span>
                    {f.rating.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-sm leading-relaxed text-slate-200/90">{f.bio}</div>

              <div className="mt-4 flex flex-wrap gap-2">
                {f.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-slate-800 bg-slate-950/30 px-2.5 py-1 text-xs font-semibold text-slate-200"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Wallet: <span className="font-mono text-slate-300">{walletLabel(f.walletAddress)}</span>
                </div>

                <button
                  className={[
                    'rounded-2xl px-3 py-2 text-sm font-semibold transition',
                    'bg-gradient-to-br from-cyan-500 to-indigo-500 text-white',
                    'hover:opacity-95 active:opacity-90',
                  ].join(' ')}
                  onClick={() => openInvite(f)}
                  type="button"
                >
                  Invite
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center">
          <div className="text-sm font-semibold text-slate-200">No results</div>
          <div className="mt-1 text-sm text-slate-400">
            No freelancers match your filters. Try a different keyword or increase the max rate.
          </div>
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && inviteTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-800/85 p-5 shadow-2xl backdrop-blur">
            <div className="text-lg font-semibold text-slate-100">Send Invite</div>
            <div className="mt-1 text-sm text-slate-300">
              Invite <span className="font-semibold text-slate-100">{inviteTo.name}</span> to apply to a job.
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-200">Select job</label>
                <select
                  className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 outline-none"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.budgetAlgo} ALGO)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-200">Message (optional)</label>
                <textarea
                  className="min-h-[88px] w-full rounded-2xl border border-slate-700/70 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none"
                  placeholder="Short note to the freelancer..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-slate-300">Platform fee</div>
                  <div className="font-extrabold text-slate-100">{inviteFeeAlgo} ALGO</div>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Paid on-chain to platform wallet. Invite is saved only after successful payment.
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-2xl border border-slate-700/70 bg-slate-900/30 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/40"
                onClick={closeInvite}
                disabled={busy}
                type="button"
              >
                Cancel
              </button>

              <button
                className="rounded-2xl border-0 bg-gradient-to-br from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
                onClick={() => {
                  sendInviteWithFee().catch(() => {
                    // Let Home handle global errors if you want; otherwise ignore here
                    // (You can also call a parent callback like props.onError?.(e))
                  })
                }}
                disabled={busy}
                type="button"
              >
                {busy ? 'Processing…' : 'Pay & Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox modal */}
      {inboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700/70 bg-slate-800/85 p-5 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-100">Invites Inbox</div>
                <div className="mt-1 text-sm text-slate-300">
                  View received and sent invites for your connected wallet.
                </div>
              </div>
              <button
                className="rounded-2xl border border-slate-700/70 bg-slate-900/30 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/40"
                onClick={closeInbox}
                type="button"
              >
                Close
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex gap-2">
              <button
                className={[
                  'rounded-2xl px-4 py-2 text-sm font-semibold transition',
                  inboxTab === 'RECEIVED'
                    ? 'bg-slate-950/40 text-slate-100 border border-slate-700/70'
                    : 'bg-slate-900/30 text-slate-300 border border-slate-800 hover:bg-slate-900/40',
                ].join(' ')}
                onClick={() => setInboxTab('RECEIVED')}
                type="button"
              >
                Received ({receivedInvites.length})
              </button>

              <button
                className={[
                  'rounded-2xl px-4 py-2 text-sm font-semibold transition',
                  inboxTab === 'SENT'
                    ? 'bg-slate-950/40 text-slate-100 border border-slate-700/70'
                    : 'bg-slate-900/30 text-slate-300 border border-slate-800 hover:bg-slate-900/40',
                ].join(' ')}
                onClick={() => setInboxTab('SENT')}
                type="button"
              >
                Sent ({sentInvites.length})
              </button>

              <div className="flex-1" />
              <button
                className="rounded-2xl border border-slate-700/70 bg-slate-900/30 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900/40"
                onClick={refreshInbox}
                type="button"
              >
                Refresh
              </button>
            </div>

            {/* List */}
            <div className="mt-4 space-y-3">
              {(inboxTab === 'RECEIVED' ? receivedInvites : sentInvites).map((inv) => (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-slate-700/70 bg-slate-900/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-extrabold text-slate-100">{inv.jobTitle}</div>
                        <span className={statusBadge(inv.status)}>{inv.status}</span>
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {inboxTab === 'RECEIVED' ? (
                          <>
                            From: <span className="font-mono text-slate-300">{walletLabel(inv.clientWallet)}</span>
                          </>
                        ) : (
                          <>
                            To: <span className="font-mono text-slate-300">{walletLabel(inv.freelancerWallet)}</span>
                          </>
                        )}
                        <span className="text-slate-600"> • </span>
                        {new Date(inv.createdAt).toLocaleString()}
                      </div>

                      {inv.message && (
                        <div className="mt-2 text-sm text-slate-200/90">{inv.message}</div>
                      )}

                      <div className="mt-2 text-xs text-slate-400">
                        Fee: <span className="text-slate-200">{inv.inviteFeeAlgo} ALGO</span>
                        <span className="text-slate-600"> • </span>
                        TxID: <span className="font-mono text-slate-200">{inv.inviteFeeTxId}</span>
                      </div>
                    </div>

                    {inboxTab === 'RECEIVED' && inv.status === 'PENDING' && (
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

              {(inboxTab === 'RECEIVED' ? receivedInvites : sentInvites).length === 0 && (
                <div className="rounded-2xl border border-slate-700/70 bg-slate-900/30 p-8 text-center">
                  <div className="text-sm font-semibold text-slate-200">No invites</div>
                  <div className="mt-1 text-sm text-slate-400">
                    {inboxTab === 'RECEIVED'
                      ? 'You have not received any invites yet.'
                      : 'You have not sent any invites yet.'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
