export type Job = {
  id: string
  title: string
  description: string
  budgetAlgo: number
  category: string
  createdAt: string
  clientWallet: string
}

export type Proposal = {
  id: string
  jobId: string
  clientWallet: string
  freelancerName: string
  freelancerWallet?: string
  message: string
  proposedAlgo: number
  createdAt: string
}
export type AgreementStatus = 'DRAFT' | 'FUNDED' | 'DELIVERED' | 'APPROVED'

export type Agreement = {
  id: string
  jobId: string
  jobTitle: string
  budgetAlgo: number
  clientWallet?: string
  freelancerWallet?: string
  freelancerName: string
  status: AgreementStatus
  createdAt: string
  fundingTxId?: string
  deliveryNftAssetId?: number
  deliveryNftTxId?: string
  deliveryMetadataUrl?: string
}

const AGREEMENTS_KEY = 'sf_agreements_v1'
const PROPOSALS_KEY = 'sf_proposals_v1'
const JOBS_KEY = 'sf_jobs_v1'

function safeParseJobs(raw: string | null): Job[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Job[]
  } catch {
    return []
  }
}

export function loadJobs(): Job[] {
  // Make sure this only runs in the browser
  if (typeof window === 'undefined') return []
  return safeParseJobs(window.localStorage.getItem(JOBS_KEY))
}

export function saveJobs(jobs: Job[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(JOBS_KEY, JSON.stringify(jobs))
}

export function addJob(job: Job): Job[] {
  const current = loadJobs()
  const next = [job, ...current]
  saveJobs(next)
  return next
}

export function clearJobs() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(JOBS_KEY)
}

// =========================
// Jobs - delete with guards
// =========================

export type DeleteJobResult =
  | { ok: true; jobs: Job[] }
  | { ok: false; reason: 'NOT_FOUND' | 'NOT_OWNER' | 'HAS_PROPOSALS' | 'HAS_AGREEMENT' }

export function canDeleteJob(jobId: string, requesterWallet?: string): DeleteJobResult {
  const jobs = loadJobs()
  const job = jobs.find((j) => j.id === jobId)
  if (!job) return { ok: false, reason: 'NOT_FOUND' }

  // Optional: enforce only owner can delete
  if (job.clientWallet && requesterWallet && job.clientWallet !== requesterWallet) {
    return { ok: false, reason: 'NOT_OWNER' }
  }

  // Block if any proposals exist for this job
  const hasProposals = loadProposals().some((p) => p.jobId === jobId)
  if (hasProposals) return { ok: false, reason: 'HAS_PROPOSALS' }

  // Block if any agreement exists for this job
  const hasAgreement = loadAgreements().some((a) => a.jobId === jobId)
  if (hasAgreement) return { ok: false, reason: 'HAS_AGREEMENT' }

  // OK
  return { ok: true, jobs }
}

export function deleteJob(jobId: string, requesterWallet?: string): DeleteJobResult {
  const guard = canDeleteJob(jobId, requesterWallet)
  if (!guard.ok) return guard

  const next = guard.jobs.filter((j) => j.id !== jobId)
  saveJobs(next)
  return { ok: true, jobs: next }
}


function safeParseProposals(raw: string | null): Proposal[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Proposal[]
  } catch {
    return []
  }
}

export function loadProposals(): Proposal[] {
  if (typeof window === 'undefined') return []
  return safeParseProposals(window.localStorage.getItem(PROPOSALS_KEY))
}

export function saveProposals(proposals: Proposal[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals))
}

export function addProposal(proposal: Proposal): Proposal[] {
  const current = loadProposals()
  const next = [proposal, ...current]
  saveProposals(next)
  return next
}

export function loadProposalsForJob(jobId: string): Proposal[] {
  return loadProposals().filter((p) => p.jobId === jobId)
}

export type DeleteProposalResult =
  | { ok: true; proposals: Proposal[] }
  | { ok: false; reason: 'NOT_FOUND' | 'NOT_OWNER' | 'HAS_AGREEMENT' }

export function deleteProposal(proposalId: string, requesterWallet?: string): DeleteProposalResult {
  const all = loadProposals()
  const proposal = all.find((p) => p.id === proposalId)
  if (!proposal) return { ok: false, reason: 'NOT_FOUND' }

  // Only the freelancer who submitted it can delete it
  if (proposal.freelancerWallet && requesterWallet && proposal.freelancerWallet !== requesterWallet) {
    return { ok: false, reason: 'NOT_OWNER' }
  }

  // If an agreement exists for the same job + freelancerWallet, proposal is locked
  const hasAgreement = loadAgreements().some(
    (a) => a.jobId === proposal.jobId && a.freelancerWallet === proposal.freelancerWallet
  )
  if (hasAgreement) return { ok: false, reason: 'HAS_AGREEMENT' }

  const next = all.filter((p) => p.id !== proposalId)
  saveProposals(next)
  return { ok: true, proposals: next }
}



function safeParseAgreements(raw: string | null): Agreement[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Agreement[]
  } catch {
    return []
  }
}

export function loadAgreements(): Agreement[] {
  if (typeof window === 'undefined') return []
  return safeParseAgreements(window.localStorage.getItem(AGREEMENTS_KEY))
}

export function saveAgreements(agreements: Agreement[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AGREEMENTS_KEY, JSON.stringify(agreements))
}

export function addAgreement(agreement: Agreement): Agreement[] {
  const current = loadAgreements()
  const next = [agreement, ...current]
  saveAgreements(next)
  return next
}


// =========================
// Invites (Client -> Freelancer)
// =========================

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export type Invite = {
  id: string
  jobId: string
  jobTitle: string

  clientWallet: string
  freelancerId: string
  freelancerName: string
  freelancerWallet: string

  message?: string
  status: InviteStatus
  createdAt: string

  // Option 1 monetization metadata
  inviteFeeAlgo: number
  inviteFeeTxId: string
  platformWallet: string
}

const INVITES_KEY = 'sf_invites_v1'

export function loadInvites(): Invite[] {
  try {
    const raw = localStorage.getItem(INVITES_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data as Invite[]
  } catch {
    return []
  }
}

export function saveInvites(invites: Invite[]) {
  localStorage.setItem(INVITES_KEY, JSON.stringify(invites))
}

export function addInvite(invite: Invite): Invite[] {
  const all = loadInvites()

  // basic de-dupe: prevent multiple PENDING invites to same freelancer for same job
  const exists = all.some(
    (i) =>
      i.jobId === invite.jobId &&
      i.freelancerWallet === invite.freelancerWallet &&
      i.status === 'PENDING'
  )

  if (exists) return all

  const next = [invite, ...all]
  saveInvites(next)
  return next
}

export function updateInvite(inviteId: string, patch: Partial<Invite>): Invite[] {
  const all = loadInvites()
  const next = all.map((i) => (i.id === inviteId ? { ...i, ...patch } : i))
  saveInvites(next)
  return next
}

export function deleteInvite(inviteId: string): Invite[] {
  const all = loadInvites()
  const next = all.filter((i) => i.id !== inviteId)
  saveInvites(next)
  return next
}

// Helpers (optional but useful)
export function loadInvitesForFreelancerWallet(freelancerWallet?: string): Invite[] {
  if (!freelancerWallet) return []
  return loadInvites().filter((i) => i.freelancerWallet === freelancerWallet)
}

export function loadInvitesForClientWallet(clientWallet?: string): Invite[] {
  if (!clientWallet) return []
  return loadInvites().filter((i) => i.clientWallet === clientWallet)
}
