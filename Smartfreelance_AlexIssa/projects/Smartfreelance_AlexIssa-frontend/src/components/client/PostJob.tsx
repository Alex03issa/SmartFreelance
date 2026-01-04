import React, { useEffect, useState } from 'react';
import { addJob, deleteJob, loadAgreements, loadJobs, loadProposals, type Job } from '../../state/store';

export default function PostJob(props: { clientWallet?: string; onPosted?: (job: Job) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budgetAlgo, setBudgetAlgo] = useState<number>(5)
  const [category, setCategory] = useState('Design')
  const [success, setSuccess] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    const all = loadJobs()
    const mine = props.clientWallet ? all.filter((j) => j.clientWallet === props.clientWallet) : []
    setJobs(mine)
  }, [props.clientWallet])


  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess(null)

    if (!title.trim() || !description.trim()) {
      setSuccess('Please fill title and description.')
      return
    }

    if (!props.clientWallet) {
      setSuccess('Connect wallet first to post a job.')
      return
    }


    const job: Job = {
      id: `JOB-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
      title: title.trim(),
      description: description.trim(),
      budgetAlgo: Number(budgetAlgo),
      category,
      createdAt: new Date().toISOString(),
      clientWallet: props.clientWallet,
    }

    const next = addJob(job)
    setJobs(next)

    setTitle('')
    setDescription('')
    setBudgetAlgo(5)
    setCategory('Design')
    setSuccess(`Job posted: ${job.id}`)

    props.onPosted?.(job)
  }

  const deleteReasonText = (r: string) => {
    switch (r) {
      case 'HAS_PROPOSALS':
        return 'Cannot delete: a freelancer already submitted a proposal for this job.'
      case 'HAS_AGREEMENT':
        return 'Cannot delete: an agreement already exists for this job.'
      case 'NOT_OWNER':
        return 'Cannot delete: only the job owner can delete this job.'
      case 'NOT_FOUND':
        return 'Job not found (it may have already been removed).'
      default:
        return 'Cannot delete this job.'
    }
  }

  const onDeleteJob = (jobId: string) => {
    setSuccess(null)

    // store enforces:
    // - cannot delete if proposals exist
    // - cannot delete if agreement exists
    // - (optional) cannot delete if not owner
    const res = deleteJob(jobId, props.clientWallet)

    if (!res.ok) {
      setSuccess(deleteReasonText(res.reason))
      return
    }

    setJobs(res.jobs)
    setSuccess(`Job deleted: ${jobId}`)
  }

  const short = (addr?: string) => (!addr ? '—' : `${addr.slice(0, 6)}…${addr.slice(-6)}`)

  const cannotDeleteReason = (job: Job): string | null => {
    // not owner
    if (job.clientWallet && props.clientWallet && job.clientWallet !== props.clientWallet) {
      return 'Only the job owner can delete this job'
    }

    // has proposals
    const hasProposals = loadProposals().some((p) => p.jobId === job.id)
    if (hasProposals) {
      return 'This job already has proposals'
    }

    // has agreement
    const hasAgreement = loadAgreements().some((a) => a.jobId === job.id)
    if (hasAgreement) {
      return 'This job already has an agreement'
    }

    return null
  }


  return (
    <div>
      <div className="text-xl font-extrabold text-slate-100">Post a Job</div>
      <div className="text-sm text-slate-300 mt-1">Create a job post. This is stored locally for the POC.</div>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        {/* Form card */}
        <div className="rounded-3xl border border-slate-700/70 bg-slate-800/25 backdrop-blur p-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-200">Title</label>
              <input
                className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/30 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                placeholder="e.g., Logo + Brand Kit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-200">Description</label>
              <textarea
                className="min-h-[120px] w-full rounded-2xl border border-slate-700/70 bg-slate-900/30 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                placeholder="Describe the scope, deadline, requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-200">Budget (ALGO)</label>
                <input
                  type="number"
                  className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/30 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
                  value={budgetAlgo}
                  onChange={(e) => setBudgetAlgo(Number(e.target.value))}
                  min={0.1}
                  step={0.1}
                />
              </div>

             <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-200">Category</label>

              <div className="relative">
                <select
                  className="
                    w-full appearance-none
                    rounded-2xl
                    border border-slate-700/70
                    bg-slate-900/30
                    px-4 py-2 pr-10
                    text-sm text-slate-100
                    outline-none
                    focus:border-cyan-400/50
                    focus:ring-2 focus:ring-cyan-400/10
                  "
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option className="bg-slate-900 text-slate-100">Design</option>
                  <option className="bg-slate-900 text-slate-100">Frontend</option>
                  <option className="bg-slate-900 text-slate-100">Mobile</option>
                  <option className="bg-slate-900 text-slate-100">Backend</option>
                  <option className="bg-slate-900 text-slate-100">Web3</option>
                </select>

                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>



              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-200">Client Wallet</label>
                <input
                  className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/20 px-4 py-2 text-sm text-slate-300 placeholder:text-slate-500 outline-none"
                  value={props.clientWallet ?? ''}
                  disabled
                  placeholder="Connect wallet"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <button
                className="rounded-2xl border-0 bg-gradient-to-br from-cyan-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95"
                type="submit"
              >
                Post Job
              </button>

              <div className="text-xs text-slate-400">Tip: Use clear scope + deadline to get better proposals.</div>
            </div>

            {success && (
              <div className="rounded-2xl border border-slate-700/70 bg-slate-800/30 p-3 text-sm text-slate-200">
                {success}
              </div>
            )}
          </div>
        </div>

        {/* Jobs list */}
        <div className="mt-2">
          <div className="text-sm font-semibold text-slate-200">My Posted Jobs</div>

          {jobs.length === 0 ? (
            <div className="mt-2 text-sm text-slate-300">No jobs posted yet.</div>
          ) : (
            <div className="mt-3 grid gap-3">
              {jobs.map((j) => (
                <div
                  key={j.id}
                  className="rounded-3xl border border-slate-700/70 bg-slate-800/25 backdrop-blur p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-100 truncate">{j.title}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {j.category} • {new Date(j.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/20 px-3 py-1 text-sm font-extrabold text-slate-100">
                        {j.budgetAlgo} ALGO
                      </div>

                      {(() => {
                        const reason = cannotDeleteReason(j)
                        const disabled = !!reason

                        return (
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => !disabled && onDeleteJob(j.id)}
                            title={reason ?? 'Delete job'}
                            className={[
                              'rounded-2xl px-3 py-1 text-xs font-semibold border transition',
                              disabled
                                ? 'cursor-not-allowed border-slate-700 bg-slate-800/40 text-slate-500'
                                : 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20',
                            ].join(' ')}
                          >
                            {disabled ? 'Locked' : 'Delete'}
                          </button>
                        )
                      })()}

                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-200 line-clamp-2">{j.description}</div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-400">
                      Client: <span className="font-mono text-slate-300">{short(j.clientWallet)}</span>
                    </div>

                    <div className="text-xs text-slate-400 font-mono">{j.id}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
