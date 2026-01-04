import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { sha512_256 } from 'js-sha512'
import { useEffect, useMemo, useState } from 'react'
import { loadAgreements, saveAgreements, type Agreement, type AgreementStatus } from '../../state/store'
import { getAlgodConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'
import AgreementTimeline from './AgreementTimeline'

export default function AgreementDetails(props: {
  agreement: Agreement
  onClose: () => void
  role: 'client' | 'freelancer'
}) {
  const [agreement, setAgreement] = useState<Agreement>(props.agreement)
  const [status, setStatus] = useState<AgreementStatus>(props.agreement.status)
  const [busy, setBusy] = useState(false)
  const [popup, setPopup] = useState<{
    open: boolean
    title?: string
    message: string
  }>({
    open: false,
    message: '',
  })
  const [deliveryMetadataUrl, setDeliveryMetadataUrl] = useState(props.agreement.deliveryMetadataUrl ?? '')
  const [clientOptedIn, setClientOptedIn] = useState<boolean>(false)
  const [checkingOptIn, setCheckingOptIn] = useState(false)
  const [freelancerHasNft, setFreelancerHasNft] = useState(false)
  const holdingAssetId = (h: any) => Number(h?.['asset-id'] ?? h?.assetId ?? h?.assetID ?? 0)
  const holdingAmount = (h: any) => Number(h?.amount ?? h?.['amount'] ?? 0)
  const [deliverySent, setDeliverySent] = useState(false)

  useEffect(() => {
    const a = props.agreement
    setAgreement(a)
    setStatus(a.status)
    setDeliveryMetadataUrl(a.deliveryMetadataUrl ?? '')
    setCheckingOptIn(false)

    refreshClientOptInFor(a)
    refreshFreelancerBalanceFor(a)
  }, [props.agreement])


  const { activeAddress, transactionSigner } = useWallet()

  const algodConfig = useMemo(() => getAlgodConfigFromViteEnvironment(), [])
  const algorand = useMemo(() => AlgorandClient.fromConfig({ algodConfig }), [algodConfig])

  const explorerTx = (txId: string) => `https://lora.algokit.io/testnet/transaction/${txId}`
  const explorerAsset = (assetId: number) => `https://lora.algokit.io/testnet/asset/${assetId}`

  const persistAgreementPatch = (patch: Partial<Agreement>) => {
    const next = { ...agreement, ...patch }
    setAgreement(next)

    const all = loadAgreements()
    const updated = all.map((a) => (a.id === agreement.id ? { ...a, ...patch } : a))
    saveAgreements(updated)
  }

  const reloadAgreementFromStore = () => {
    const fresh = loadAgreements().find((a) => a.id === agreement.id)
    if (fresh) {
      setAgreement(fresh)
      setStatus(fresh.status)
      setDeliveryMetadataUrl(fresh.deliveryMetadataUrl ?? '')
    }
  }

  const updateStatus = (next: AgreementStatus) => {
    setStatus(next)
    persistAgreementPatch({ status: next })
  }

  const requireWallet = () => {
    if (!activeAddress) throw new Error('Connect wallet first')
    if (!transactionSigner) {
      throw new Error('Wallet signer not available. Reconnect Pera WalletConnect session.')
    }

    const authorized =
      (props.role === 'client' &&
        agreement.clientWallet &&
        activeAddress === agreement.clientWallet) ||
      (props.role === 'freelancer' &&
        agreement.freelancerWallet &&
        activeAddress === agreement.freelancerWallet)

    if (!authorized) {
      throw new Error('Unauthorized wallet for this agreement.')
    }
  }

  const isSelfAgreement = Boolean(
    agreement.clientWallet &&
      agreement.freelancerWallet &&
      agreement.clientWallet === agreement.freelancerWallet
  )

  const assertNotSelfAgreement = () => {
    if (isSelfAgreement) {
      throw new Error(
        'You cannot create or fund an agreement for your own job using the same wallet address.'
      )
    }
  }

  const hasOptedIn = async (address: string, assetId: number) => {
    const info = await algorand.client.algod.accountInformation(address).do()
    return (info.assets ?? []).some((h: any) => holdingAssetId(h) === assetId)
  }

  const hasAssetBalance = async (address: string, assetId: number, min: number) => {
    const info = await algorand.client.algod.accountInformation(address).do()
    const holding = (info.assets ?? []).find((h: any) => holdingAssetId(h) === assetId)
    return holdingAmount(holding) >= min
  }

  const refreshClientOptInFor = async (a: Agreement) => {
    if (checkingOptIn) return
    if (!a.clientWallet || !a.deliveryNftAssetId) return

    setCheckingOptIn(true)
    try {
      const opted = await hasOptedIn(a.clientWallet, a.deliveryNftAssetId)
      setClientOptedIn(opted)
    } catch {
      setClientOptedIn(false)
    } finally {
      setCheckingOptIn(false)
    }
  }

  const refreshFreelancerBalanceFor = async (a: Agreement) => {
    if (!a.deliveryNftAssetId || !a.freelancerWallet) return
    try {
      const ok = await hasAssetBalance(a.freelancerWallet, a.deliveryNftAssetId, 1)
      setFreelancerHasNft(ok)
    } catch {
      setFreelancerHasNft(false)
    }
}



  const waitForTx = async (txId: string) => {
    for (;;) {
      const p = await algorand.client.algod.pendingTransactionInformation(txId).do()
      const cr = Number(p?.confirmedRound ?? 0)
      if (cr > 0) return
      await new Promise((r) => setTimeout(r, 1000))
    }
  }



  const hasDeliveryAsset = Boolean(agreement.deliveryNftAssetId)
  const alreadyMinted = hasDeliveryAsset
  const canMint = props.role === 'freelancer' && status === 'FUNDED' && !alreadyMinted && !isSelfAgreement
  const canSend =
      props.role === 'freelancer' &&
      hasDeliveryAsset &&
      clientOptedIn &&
      freelancerHasNft &&
      !checkingOptIn &&
      !deliverySent &&
      !isSelfAgreement

  const canClientOptIn = props.role === 'client' && hasDeliveryAsset && !clientOptedIn && !isSelfAgreement

  useEffect(() => {
    refreshClientOptInFor(agreement)
    refreshFreelancerBalanceFor(agreement)
    refreshDeliverySentFor(agreement)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agreement.clientWallet, agreement.deliveryNftAssetId])

  useEffect(() => {
    if (props.role !== 'freelancer') return
    if (!agreement.clientWallet || !agreement.deliveryNftAssetId) return

    if (clientOptedIn) return

    const t = setInterval(() => {
      refreshClientOptInFor(agreement)
      refreshFreelancerBalanceFor(agreement)
    }, 4000)

    return () => clearInterval(t)
  }, [
    props.role,
    agreement.clientWallet,
    agreement.deliveryNftAssetId,
    clientOptedIn,
  ])


  const showError = (message: string, title = 'Action blocked') => {
    setPopup({ open: true, title, message })
  }

  const showSuccess = (message: string, title = 'Success') => {
    setPopup({ open: true, title, message })
  }

  const closePopup = () => {
    setPopup({ open: false, message: '' })
  }

  const isClient = props.role === 'client'
  const isFreelancer = props.role === 'freelancer'

  const isAuthorized =
    (isClient && activeAddress && agreement.clientWallet && activeAddress === agreement.clientWallet) ||
    (isFreelancer && activeAddress && agreement.freelancerWallet && activeAddress === agreement.freelancerWallet)


  const payAlgo = async () => {
    requireWallet()
    assertNotSelfAgreement()

    if (!agreement.freelancerWallet) throw new Error('Freelancer wallet missing')
    if (props.role !== 'client') throw new Error('Only client can fund')
    if (status !== 'DRAFT') throw new Error('Can only fund in Draft')

    setBusy(true)
    try {
      const result = await algorand.send.payment({
        signer: transactionSigner!,
        sender: activeAddress!,
        receiver: agreement.freelancerWallet,
        amount: algo(agreement.budgetAlgo),
        note: `SmartFreelance FUND ${agreement.id}`,
      })

      const txId = result.txIds[0]
      persistAgreementPatch({ fundingTxId: txId })
      updateStatus('FUNDED')
      showSuccess(`Funded successfully.\nTxID: ${txId}`)
    } finally {
      setBusy(false)
    }
  }

  const createDeliveryMetadataUrl = async () => {
    if (!agreement.clientWallet) throw new Error('Client wallet missing')
    if (!agreement.freelancerWallet) throw new Error('Freelancer wallet missing')

    const res = await fetch('/api/ipfs/delivery-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agreementId: agreement.id,
        jobTitle: agreement.jobTitle,
        clientWallet: agreement.clientWallet,
        freelancerWallet: agreement.freelancerWallet,
        freelancerName: agreement.freelancerName,
      }),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`IPFS backend error (${res.status}): ${txt || 'unknown error'}`)
    }

    const data = (await res.json()) as { metadataUrl: string }
    if (!data?.metadataUrl) throw new Error('Backend did not return metadataUrl')
    return data.metadataUrl
  }

  const mintDeliveryNft = async () => {
    if (agreement.deliveryNftAssetId) throw new Error('Delivery NFT already minted for this agreement.')

    requireWallet()
    assertNotSelfAgreement()

    if (props.role !== 'freelancer') throw new Error('Only freelancer can mint')
    if (status !== 'FUNDED') throw new Error('Mint after funded')
    if (activeAddress !== agreement.freelancerWallet) {
      throw new Error('Please connect the freelancer wallet address for this agreement to mint.')
    }

    setBusy(true)
    try {
      // 1) Get metadata URL (cached or from backend)
      let arc3Url = deliveryMetadataUrl.trim()

      if (!arc3Url) {
        arc3Url = await createDeliveryMetadataUrl()

        // Save in local state (UI)
        setDeliveryMetadataUrl(arc3Url)

        // Save inside agreement storage (recommended)
        persistAgreementPatch({ deliveryMetadataUrl: arc3Url })
      }

      // Ensure ARC3 suffix
      arc3Url = arc3Url.includes('#arc3') ? arc3Url : `${arc3Url}#arc3`

      // 2) Hash for ARC3 wallets/gallery support
      const metadataHashBytes = new Uint8Array(Buffer.from(sha512_256.digest(arc3Url)))

      // 3) Mint ASA (2 supply so freelancer keeps 1 and client receives 1)
      const result = await algorand.send.assetCreate({
        signer: transactionSigner!,
        sender: activeAddress!,
        total: 2n,
        decimals: 0,
        assetName: `SF Delivery ${agreement.id}`,
        unitName: 'SFDLV',
        url: arc3Url,
        metadataHash: metadataHashBytes,
        defaultFrozen: false,
        note: `DELIVERY_NFT ${agreement.id}`,
        manager: activeAddress!,
        reserve: activeAddress!,
      })

      const txId = result.txIds[0]
      const assetId = Number((result as any).confirmation?.assetIndex ?? (result as any).assetId ?? 0)
      if (!assetId) throw new Error('Asset ID missing from result')

      persistAgreementPatch({ deliveryNftTxId: txId, deliveryNftAssetId: assetId })
      reloadAgreementFromStore()
      await refreshClientOptInFor(agreement)
      await refreshFreelancerBalanceFor(agreement)
      showSuccess(`Delivery NFT minted. Asset ID: ${assetId}`)
    } finally {
      setBusy(false)
    }
  }

  const refreshDeliverySentFor = async (a: Agreement) => {
    if (!a.deliveryNftAssetId || !a.clientWallet) return

    try {
      const ok = await hasAssetBalance(a.clientWallet, a.deliveryNftAssetId, 1)
      setDeliverySent(ok)
    } catch {
      setDeliverySent(false)
    }
  }

  const optInToDeliveryNft = async () => {
    requireWallet()
    if (props.role !== 'client') throw new Error('Only client can opt-in')
    if (!agreement.deliveryNftAssetId) throw new Error('No delivery NFT asset id yet')
    if (activeAddress !== agreement.clientWallet) throw new Error('Connect the client wallet')

    setBusy(true)
    try {
      const assetId = agreement.deliveryNftAssetId

      const res = await algorand.send.assetTransfer({
        signer: transactionSigner!,
        sender: activeAddress!,
        receiver: activeAddress!,
        assetId: BigInt(assetId),
        amount: 0n,
        note: `OPTIN DELIVERY_NFT ${agreement.id}`,
      })

      const txId = res.txIds[0]

      // optimistic UI
      setClientOptedIn(true)

      // confirm + refresh
      await waitForTx(txId)
      await refreshClientOptInFor(agreement)

      showSuccess(`Opt-in completed.\nTxID: ${txId}`)
    } finally {
      setBusy(false)
    }
  }


  const sendDeliveryNftToClient = async () => {
    requireWallet()
    if (props.role !== 'freelancer') throw new Error('Only freelancer can send')
    if (!agreement.deliveryNftAssetId) throw new Error('No delivery NFT asset id yet')
    if (!agreement.clientWallet) throw new Error('Client wallet missing')
    if (activeAddress !== agreement.freelancerWallet) {
      throw new Error('Please connect the freelancer wallet address for this agreement to send the NFT.')
    }

    setBusy(true)
    try {
      const assetId = agreement.deliveryNftAssetId

      const ok = await hasAssetBalance(activeAddress!, assetId, 1)
      if (!ok) throw new Error('Sender wallet does not hold the NFT balance to send.')

      const res = await algorand.send.assetTransfer({
        signer: transactionSigner!,
        sender: activeAddress!,
        receiver: agreement.clientWallet,
        assetId: BigInt(assetId),
        amount: 1n, // send 1 of 2
        note: `SEND DELIVERY_NFT ${agreement.id}`,
      })

      const txId = res.txIds[0]
      await waitForTx(txId)
      setDeliverySent(true)
      await refreshClientOptInFor(agreement)
      await refreshFreelancerBalanceFor(agreement)
      

      showSuccess(`NFT sent to client. TxID: ${txId}`)
      reloadAgreementFromStore()
    } finally {
      setBusy(false)
    }
  }

  const short = (addr?: string) => (!addr ? '—' : `${addr.slice(0, 6)}…${addr.slice(-6)}`)

  return (
    <div className="rounded-3xl border border-slate-700/70 bg-slate-800/35 backdrop-blur p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-extrabold text-slate-100">Agreement {agreement.id}</div>
          <div className="text-sm text-slate-300 mt-1">{agreement.jobTitle}</div>
          <div className="mt-1 text-xs text-slate-400">
            Connected: {activeAddress ? short(activeAddress) : '—'}
          </div>
        </div>

        <button
          className="rounded-2xl border border-slate-700/70 bg-slate-800/30 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/45"
          onClick={props.onClose}
        >
          Back
        </button>
      </div>

      {activeAddress && !isAuthorized && (
        <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
          This agreement can only be managed by the {isClient ? 'client' : 'freelancer'} wallet assigned to it.
          <div className="mt-1 text-xs text-red-200/80">
            Connected: <span className="font-mono">{short(activeAddress)}</span>
          </div>
        </div>
      )}


      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/25 p-4">
          <div className="text-sm font-semibold text-slate-100">Parties</div>
          <div className="mt-2 text-sm text-slate-200">
            <div>
              <span className="font-semibold text-slate-100">Client:</span>{' '}
              {agreement.clientWallet ? short(agreement.clientWallet) : '—'}
            </div>
            <div className="mt-1">
              <span className="font-semibold text-slate-100">Freelancer:</span> {agreement.freelancerName}
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono">
              {agreement.freelancerWallet ? short(agreement.freelancerWallet) : 'No wallet'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/25 p-4">
          <div className="text-sm font-semibold text-slate-100">Budget</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-100">{agreement.budgetAlgo} ALGO</div>

          {agreement.fundingTxId && (
            <div className="mt-3 text-xs text-slate-300">
              Funding Tx:{' '}
              <span className="font-mono text-slate-200 break-all">{agreement.fundingTxId}</span>{' '}
              <button
                className="ml-2 rounded-xl border border-slate-700/70 bg-slate-800/30 px-2 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-800/45"
                onClick={() => window.open(explorerTx(agreement.fundingTxId!), '_blank')}
              >
                View
              </button>
            </div>
          )}

          {agreement.deliveryNftAssetId && (
            <div className="mt-2 text-xs text-slate-300">
              Delivery NFT Asset ID:{' '}
              <span className="font-mono text-slate-200">{agreement.deliveryNftAssetId}</span>{' '}
              <button
                className="ml-2 rounded-xl border border-slate-700/70 bg-slate-800/30 px-2 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-800/45"
                onClick={() => window.open(explorerAsset(agreement.deliveryNftAssetId!), '_blank')}
              >
                View
              </button>
            </div>
          )}
        </div>
      </div>

      {isSelfAgreement && (
        <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          You cannot create or fund an agreement for your own job using the same wallet.
          <div className="mt-1 text-amber-200/80">Use a different account to act as the freelancer.</div>
        </div>
      )}

      {alreadyMinted && props.role === 'freelancer' && (
        <div className="mt-3 text-xs text-slate-300 w-full">
          Delivery NFT already minted. Asset ID: <span className="font-mono text-slate-200">{agreement.deliveryNftAssetId}</span>
        </div>
      )}

      {props.role === 'freelancer' && (
        <div className="mt-2 text-xs text-slate-300 w-full">
          Client opt-in: {checkingOptIn ? 'Checking…' : clientOptedIn ? 'Completed' : 'Not yet'}
        </div>
      )}

      {props.role === 'freelancer' && hasDeliveryAsset && (
        <div className="mt-2 text-xs text-slate-400">
          Agreement clientWallet: <span className="font-mono">{agreement.clientWallet}</span><br/>
          Connected wallet: <span className="font-mono">{activeAddress}</span><br/>
          AssetId: <span className="font-mono">{agreement.deliveryNftAssetId ?? '—'}</span><br/>
          Network: <span className="font-mono">{algodConfig.network ?? 'unknown'}</span>
        </div>
      )}

      {props.role === 'client' && hasDeliveryAsset && (
        <div className="mt-2 text-xs text-slate-300">
          Your opt-in status: {checkingOptIn ? 'Checking…' : clientOptedIn ? 'Completed' : 'Not yet'}
        </div>
      )}

      <div className="mt-5">
        <div className="text-sm font-semibold text-slate-100">Status</div>
        <AgreementTimeline status={status} />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {props.role === 'client' && isAuthorized && (
          <div className="rounded-3xl border border-slate-700/70 bg-slate-800/25 p-4">
            <div className="font-semibold text-slate-100">Client Actions</div>
            <div className="text-sm text-slate-300 mt-1">Fund the agreement and approve delivery.</div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-2xl border-0 bg-gradient-to-br from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={busy || status !== 'DRAFT' || isSelfAgreement || !isAuthorized}
                onClick={() =>
                  payAlgo().catch((e) => {
                    console.error(e)
                    showError(e.message)
                  })
                }
              >
                {busy ? 'Processing…' : 'Pay ALGO (Fund)'}
              </button>

              <button
                className="rounded-2xl border border-slate-700/70 bg-slate-800/30 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/45 disabled:opacity-50"
                disabled={busy || status !== 'DELIVERED' || isSelfAgreement || !isAuthorized}
                onClick={() => updateStatus('APPROVED')}
                title={
                  isSelfAgreement
                    ? 'You cannot approve your own job'
                    : status !== 'DELIVERED'
                      ? 'Approve only after delivery'
                      : ''
                }
              >
                Approve Delivery
              </button>

              <button
                className="rounded-2xl border border-slate-700/70 bg-slate-800/30 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800/45 disabled:opacity-50"
                disabled={busy || checkingOptIn || !canClientOptIn || !isAuthorized}
                onClick={() =>
                  optInToDeliveryNft().catch((e) => {
                    console.error(e)
                    showError(e.message)
                  })
                }
                title={!hasDeliveryAsset ? 'Waiting for freelancer to mint the Delivery NFT' : ''}
              >
                {clientOptedIn ? 'Opted-in (Done)' : 'Opt-in to Delivery NFT'}
              </button>
            </div>
          </div>
        )}

        {props.role === 'freelancer' && isAuthorized && (
          <div className="rounded-3xl border border-slate-700/70 bg-slate-800/25 p-4">
            <div className="font-semibold text-slate-100">Freelancer Actions</div>
            <div className="text-sm text-slate-300 mt-1">Mint proof of delivery and mark work as delivered.</div>

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="text-xs text-slate-300 w-full">
                Metadata: {deliveryMetadataUrl ? 'Ready' : 'Will be generated automatically on mint'}
              </div>

              <button
                className="rounded-2xl border-0 bg-gradient-to-br from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={busy || !canMint || !isAuthorized}
                onClick={() =>
                  mintDeliveryNft().catch((e) => {
                    console.error(e)
                    showError(e.message)
                  })
                }
              >
                {alreadyMinted ? 'Minted (Done)' : busy ? 'Processing…' : 'Mint Delivery NFT'}
              </button>

              <button
                className="rounded-2xl border border-slate-700/70 bg-slate-800/30 px-4 py-2 text-sm font-semibold text-slate-100
                          hover:bg-slate-800/45 disabled:opacity-50"
                disabled={
                  busy ||
                  status !== 'FUNDED' ||
                  !deliverySent ||
                  isSelfAgreement ||
                  !isAuthorized
                }
                onClick={() => updateStatus('DELIVERED')}
                title={
                  status !== 'FUNDED'
                    ? 'Agreement must be funded first'
                    : !deliverySent
                      ? 'Send the Delivery NFT to the client first'
                      : ''
                }
              >
                Mark Delivered
              </button>


             <button
                className="rounded-2xl border border-slate-700/70 bg-slate-800/30 px-4 py-2 text-sm font-semibold text-slate-100
                          hover:bg-slate-800/45 disabled:opacity-50"
                disabled={busy || !canSend || !isAuthorized || deliverySent}
                onClick={() =>
                  sendDeliveryNftToClient().catch((e) => {
                    console.error(e)
                    showError(e?.message ?? String(e))
                  })
                }
                title={
                  deliverySent
                    ? 'NFT already sent to client'
                    : !hasDeliveryAsset
                      ? 'Mint the Delivery NFT first'
                      : checkingOptIn
                        ? 'Checking if client opted-in…'
                        : !clientOptedIn
                          ? 'Client must opt-in before you can send'
                          : ''
                }
              >
                {deliverySent ? 'NFT Sent ✓' : 'Send Client NFT Copy'}
              </button>

            </div>
            <div className="text-xs text-slate-400">
              One Delivery NFT is minted with 2 copies — one for you, one for the client.
            </div>

          </div>
        )}

        <div className="rounded-3xl border border-slate-700/70 bg-slate-800/25 p-4">
          <div className="font-semibold text-slate-100">Rules</div>
          <ul className="mt-2 text-sm text-slate-300 list-disc ml-5 space-y-1">
            <li>Client can fund only in Draft.</li>
            <li>Freelancer can mint/deliver only after Funded.</li>
            <li>Client can approve only after Delivered.</li>
          </ul>
        </div>
      </div>

      {popup.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700/70 bg-slate-800/85 p-5 shadow-2xl backdrop-blur">
            <div className="text-lg font-semibold text-slate-100">{popup.title ?? 'Notice'}</div>
            <div className="mt-2 text-sm text-slate-300 whitespace-pre-wrap break-words">
              {popup.message}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                className="rounded-2xl border-0 bg-gradient-to-br from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white"
                onClick={closePopup}
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
