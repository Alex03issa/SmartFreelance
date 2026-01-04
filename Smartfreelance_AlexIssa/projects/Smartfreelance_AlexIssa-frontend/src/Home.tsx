import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useMemo, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import BrowseFreelancers from './components/client/BrowseFreelancers'
import ClientAgreements from './components/client/ClientAgreements'
import PostJob from './components/client/PostJob'
import BrowseJobs from './components/freelancer/BrowseJobs'
import FreelancerAgreements from './components/freelancer/FreelancerAgreements'
import MyProposals from './components/freelancer/MyProposals'
import AgreementDetails from './components/shared/AgreementDetails'
import type { Freelancer } from './data/freelancers'
import type { Agreement } from './state/store'

type Role = 'client' | 'freelancer'
type View =
  | 'client_browse_freelancers'
  | 'client_post_job'
  | 'client_agreements'
  | 'freelancer_browse_jobs'
  | 'freelancer_proposals'
  | 'freelancer_agreements'

const Home: React.FC = () => {
  const { activeAddress, activeWallet } = useWallet()

  // UI state only (not auth)
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [role, setRole] = useState<Role>('client')
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null)


  const AUTO_ENTER_KEY = 'sf_auto_enter_dashboard_v1'

  // default ON
  const [autoEnterDashboard, setAutoEnterDashboard] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const v = window.localStorage.getItem(AUTO_ENTER_KEY)
    return v === null ? true : v === '1'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(AUTO_ENTER_KEY, autoEnterDashboard ? '1' : '0')
  }, [autoEnterDashboard])


  // Popup (single source of truth)
  const [popup, setPopup] = useState<{ open: boolean; title?: string; message: string }>({
    open: false,
    message: '',
  })
  const closePopup = () => setPopup({ open: false, message: '' })

  const defaultView = useMemo<View>(() => {
    return role === 'client' ? 'client_browse_freelancers' : 'freelancer_browse_jobs'
  }, [role])

  const [view, setView] = useState<View>(defaultView)

  // when role changes, switch view immediately (and close agreement details)
  useEffect(() => {
    setSelectedAgreement(null)
    setView(defaultView)
  }, [defaultView])

  const toggleWalletModal = () => setOpenWalletModal((v) => !v)

  const shortAddr = (addr?: string) => {
    if (!addr) return 'Not connected'
    return `${addr.slice(0, 6)}…${addr.slice(-6)}`
  }

  // Logout in Web3 = disconnect wallet
  const onLogout = async () => {
    try {
      await activeWallet?.disconnect()
      // optional: close any popup when disconnecting
      setPopup({ open: false, message: '' })
      setSelectedAgreement(null)
    } catch {
      // ignore; UI will update when wallet state changes
    }
  }

  const navButtons =
    role === 'client'
      ? [
          { id: 'client_browse_freelancers', label: 'Browse Freelancers' },
          { id: 'client_post_job', label: 'Post Job' },
          { id: 'client_agreements', label: 'Agreements' },
        ]
      : [
          { id: 'freelancer_browse_jobs', label: 'Browse Jobs' },
          { id: 'freelancer_proposals', label: 'My Proposals' },
          { id: 'freelancer_agreements', label: 'Agreements' },
        ]

  const pageTitle =
    role === 'client'
      ? view === 'client_browse_freelancers'
        ? 'Browse Freelancers'
        : view === 'client_post_job'
          ? 'Post a Job'
          : 'Agreements'
      : view === 'freelancer_browse_jobs'
        ? 'Browse Jobs'
        : view === 'freelancer_proposals'
          ? 'My Proposals'
          : 'Agreements'

  const pageSubtitle = selectedAgreement
    ? 'Review escrow actions, mint delivery NFT, and finalize payment.'
    : 'Use the navigation to move through the workflow.'


  const [holdOnboarding, setHoldOnboarding] = useState(false)

  useEffect(() => {
    // If wallet becomes connected:
    if (activeAddress) {
      // If auto-enter is enabled -> do NOT hold onboarding
      if (autoEnterDashboard) {
        setHoldOnboarding(false)
      } else {
        // If auto-enter is disabled -> keep onboarding until user clicks Enter
        setHoldOnboarding(true)
      }
    } else {
      // Wallet disconnected -> always show onboarding
      setHoldOnboarding(false)
    }
  }, [activeAddress, autoEnterDashboard])


  // -----------------------------
  // Wallet-gated onboarding screen
  // -----------------------------
  if (!activeAddress || holdOnboarding) {
    return (
      <div className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-700" />
        <div className="pointer-events-none absolute inset-0 opacity-45">
          <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-400/18 blur-3xl" />
          <div className="absolute -bottom-28 -right-24 h-96 w-96 rounded-full bg-cyan-400/14 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            {/* Left */}
            <div className="text-slate-100">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs sm:text-sm">
                <span className="font-semibold">TestNet Demo</span>
                <span className="text-white/70">Pera Wallet • NFT • Token</span>
              </div>

              <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">SmartFreelance</h1>

              <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
                A Web3-enabled freelance workflow with wallet identity, escrow-style payment, NFT delivery proof,
                and token rewards.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <div className="text-sm font-semibold">Client workflow</div>
                  <div className="mt-1 text-sm text-white/75">
                    Browse freelancers, post jobs, fund agreements, approve deliveries.
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                  <div className="text-sm font-semibold">Freelancer workflow</div>
                  <div className="mt-1 text-sm text-white/75">
                    Apply, deliver work, mint proof NFT, receive token rewards.
                  </div>
                </div>
              </div>

              <div className="mt-8 hidden lg:block">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white/75">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Tip: Connect a TestNet wallet to unlock the dashboard.
                </div>
              </div>
            </div>

            {/* Right card */}
            <div className="rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">Enter Dashboard</div>
                  <div className="mt-1 text-sm text-slate-600">Choose a role and connect your wallet.</div>
                </div>
                <div className="hidden sm:block h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600" />
              </div>

              <div className="mt-6">
                <div className="mb-4">
                  <div className="text-base font-semibold text-slate-900">Role</div>
                  <div className="mt-1 text-sm text-slate-600">You can switch roles later.</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('client')}
                    className={[
                      'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition border',
                      role === 'client'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    Client
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('freelancer')}
                    className={[
                      'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition border',
                      role === 'freelancer'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    Freelancer
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-500">Wallet</div>
                    <div className="mt-1 font-mono text-sm text-slate-900">{shortAddr(activeAddress ?? undefined)}</div>
                  </div>
                  <div
                    className={[
                      'rounded-full px-2 py-1 text-xs font-semibold',
                      activeAddress ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
                    ].join(' ')}
                  >
                    {activeAddress ? 'Connected' : 'Disconnected'}
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={toggleWalletModal}
                    className={
                      activeAddress
                        ? `
                          w-full
                          rounded-2xl
                          border border-slate-300
                          bg-white
                          px-4 py-2.5
                          text-sm font-semibold text-slate-800
                          transition
                          hover:bg-slate-50
                          hover:border-slate-400
                          focus:outline-none
                          focus:ring-2
                          focus:ring-slate-300/40
                        `
                        : `
                          w-full
                          rounded-2xl
                          bg-gradient-to-br from-cyan-500 to-indigo-600
                          px-4 py-2.5
                          text-sm font-semibold text-white
                          shadow-md
                          transition
                          hover:opacity-95
                          focus:outline-none
                          focus:ring-2
                          focus:ring-cyan-400/30
                        `
                    }
                  >
                    {activeAddress ? 'Wallet Settings' : 'Connect Wallet'}
                  </button>

                    {activeAddress && holdOnboarding && (
                      <button
                        type="button"
                        onClick={() => setHoldOnboarding(false)}
                        className="
                          mt-3 w-full
                          rounded-2xl
                          bg-slate-900
                          px-4 py-2.5
                          text-sm font-semibold text-white
                          transition
                          hover:bg-slate-800
                          focus:outline-none
                          focus:ring-2
                          focus:ring-slate-400/30
                        "
                      >
                        Enter Dashboard
                      </button>
                    )}


                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Auto-enter dashboard</div>
                    <div className="text-xs text-slate-500">After connecting wallet, go directly to dashboard.</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAutoEnterDashboard((v) => !v)}
                    className={[
                      'relative h-6 w-11 rounded-full transition border',
                      autoEnterDashboard ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-300',
                    ].join(' ')}
                    aria-pressed={autoEnterDashboard}
                  >
                    <span
                      className={[
                        'absolute top-0.5 h-5 w-5 rounded-full transition bg-white shadow',
                        autoEnterDashboard ? 'left-5' : 'left-0.5',
                      ].join(' ')}
                    />
                  </button>
                </div>


                {!activeAddress ? (
                  <div className="mt-3 text-xs text-slate-500">Connect a TestNet wallet to proceed.</div>
                ) : null}
              </div>

              <div className="mt-5 text-xs text-slate-500">
                Marketplace data is mocked for the POC. Blockchain actions happen inside the Agreement page.
              </div>
            </div>
          </div>
        </div>

        <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      </div>
    )
  }

  // -----------------------------
  // Dashboard (wallet-connected)
  // -----------------------------
  return (
    <div className="min-h-screen text-slate-100">
      {/* subtle dashboard accents */}
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute bottom-[-7rem] right-[-7rem] h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/40 backdrop-blur">
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-600 shadow-sm" />
            <div>
              <div className="text-base font-extrabold leading-tight text-slate-100">Algo - SmartFreelance</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                <span>Dashboard</span>
                <span className="h-1 w-1 rounded-full bg-slate-700" />
                <span className="rounded-full border border-slate-800 bg-slate-900/40 px-2 py-0.5 font-semibold text-slate-200">
                  {role === 'client' ? 'Client' : 'Freelancer'}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <div className="text-[11px] font-medium text-slate-400">Wallet</div>
              <div className="font-mono text-sm text-slate-100">{shortAddr(activeAddress ?? undefined)}</div>
            </div>

            <button className="btn btn-outline" onClick={toggleWalletModal} type="button">
              Wallet
            </button>

            <button className="btn btn-ghost" onClick={onLogout} type="button">
              Disconnect
            </button>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-2 sm:hidden">
            <button className="btn btn-outline btn-sm" onClick={toggleWalletModal} type="button">
              Wallet
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onLogout} type="button">
              Disconnect
            </button>
          </div>
        </div>

        {/* Mobile nav tabs */}
        <div className="relative mx-auto max-w-6xl px-4 pb-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {navButtons.map((b) => {
              const active = view === (b.id as View)
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setView(b.id as View)}
                  className={[
                    'whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition border',
                    active
                      ? 'bg-slate-100 text-slate-900 border-slate-100'
                      : 'bg-slate-900/40 text-slate-200 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40',
                  ].join(' ')}
                >
                  {b.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-100">Navigation</div>
                <div className="rounded-full border border-slate-800 bg-slate-900/40 px-2 py-1 text-[11px] font-semibold text-slate-200">
                  {role.toUpperCase()}
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {navButtons.map((b) => {
                  const active = view === (b.id as View)
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={[
                        'w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition border',
                        active
                          ? 'bg-slate-100 text-slate-900 border-slate-100'
                          : 'bg-slate-900/40 text-slate-200 border-slate-800 hover:bg-slate-900/40 hover:border-slate-700',
                      ].join(' ')}
                      onClick={() => setView(b.id as View)}
                    >
                      {b.label}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-[11px] font-semibold text-slate-400">Connected wallet</div>
                <div className="mt-1 font-mono text-xs text-slate-200">{shortAddr(activeAddress ?? undefined)}</div>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xl font-extrabold text-slate-100">{pageTitle}</div>
                  <div className="mt-1 text-sm text-slate-400">{pageSubtitle}</div>
                </div>

                {/* Role switch */}
                <div className="flex items-center">
                  <div className="inline-flex rounded-2xl border border-slate-800 bg-slate-900/40 p-1">
                    <button
                      type="button"
                      onClick={() => setRole('client')}
                      className={[
                        'rounded-xl px-3 py-2 text-sm font-semibold transition',
                        role === 'client' ? 'bg-slate-100 text-slate-900' : 'text-slate-200 hover:text-white',
                      ].join(' ')}
                    >
                      Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('freelancer')}
                      className={[
                        'rounded-xl px-3 py-2 text-sm font-semibold transition',
                        role === 'freelancer'
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-200 hover:text-white',
                      ].join(' ')}
                    >
                      Freelancer
                    </button>
                  </div>
                </div>
              </div>

              {selectedAgreement ? (
                <AgreementDetails agreement={selectedAgreement} role={role} onClose={() => setSelectedAgreement(null)} />
              ) : (
                <>
                  {view === 'client_browse_freelancers' && (
                    <BrowseFreelancers
                      onInvite={(f: Freelancer) => {
                        setPopup({
                          open: true,
                          title: 'Invitation sent',
                          message: `Invite sent to ${f.name}. They will see it in their Inbox (POC).`,
                        })
                      }}
                    />
                  )}

                  {view === 'client_post_job' && <PostJob clientWallet={activeAddress ?? undefined} />}

                  {view === 'client_agreements' && (
                    <ClientAgreements
                      clientWallet={activeAddress ?? undefined}
                      onOpenAgreement={(a) => setSelectedAgreement(a)}
                    />
                  )}

                  {view === 'freelancer_browse_jobs' && <BrowseJobs freelancerWallet={activeAddress ?? undefined} />}

                  {view === 'freelancer_proposals' && <MyProposals freelancerWallet={activeAddress ?? undefined} />}

                  {view === 'freelancer_agreements' && (
                    <FreelancerAgreements
                      freelancerWallet={activeAddress ?? undefined}
                      onOpenAgreement={(a) => setSelectedAgreement(a)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global popup */}
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

      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
    </div>
  )
}

export default Home
