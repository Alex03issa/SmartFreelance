import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import Home from './Home'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [{ id: WalletId.DEFLY }, { id: WalletId.PERA }, { id: WalletId.EXODUS }]
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-800 via-slate-800 to-slate-700 text-slate-100">
      {/* Subtle background decoration */}
      <div className="pointer-events-none fixed inset-0 opacity-40">
       <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-400/14 blur-3xl" />
        <div className="absolute bottom-[-7rem] right-[-7rem] h-96 w-96 rounded-full bg-sky-400/12 blur-3xl" />
      </div>

      {/* Content container */}
      <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </div>

      {/* Optional footer space (keeps layout balanced on short pages) */}
      <div className="h-10" />
    </div>
  )
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider
      maxSnack={3}
      autoHideDuration={3500}
      preventDuplicate
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <WalletProvider manager={walletManager}>
        <AppShell>
          <Home />
        </AppShell>
      </WalletProvider>
    </SnackbarProvider>
  )
}
