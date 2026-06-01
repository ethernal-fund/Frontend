import { createAppKit }                     from '@reown/appkit/react'
import { watchConnection, getWalletClient } from '@wagmi/core'
import env                                  from '@/lib/env'

import { wagmiAdapter, wagmiConfig }                        from './adapter'
import { PROJECT_ID, APP_URL, WAGMI_CHAINS, DEFAULT_CHAIN } from './constants'
import { useAuthStore }                                     from '@/stores/authStore'
import { SiweService }                                      from '@/services/siweService'

export const modal = createAppKit({
  adapters:       [wagmiAdapter],
  projectId:      PROJECT_ID,
  networks:       WAGMI_CHAINS,
  defaultNetwork: DEFAULT_CHAIN,
  enableWalletConnect: true,
  enableInjected:      false,
  enableEIP6963:       true,
  metadata: {
    name:        'Ethernal Foundation',
    description: 'Personal retirement fund management protocol',
    url:         APP_URL,
    icons:       [`${APP_URL}/icon-512.png`],
  },
  features: {
    analytics:        env.features?.analytics ?? false,
    email:            false,
    socials:          [],
    emailShowWallets: true,
    allWallets:       true,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent':               '#1B5E20',
    '--w3m-border-radius-master': '8px',
    '--w3m-font-family':          'Inter, system-ui, -apple-system, sans-serif',
  },
})

let inFlight    = false
let lastAddress: string | null = null

const USER_REJECTED_CODES = new Set([4001, 4100])

async function autoLogin(address: string): Promise<void> {
  const { isAuthenticated, walletAddress, setTokens, setAuthenticating } =
    useAuthStore.getState()

  // Already authenticated with this exact address — nothing to do
  if (isAuthenticated && walletAddress?.toLowerCase() === address.toLowerCase()) return

  // Guard: one execution at a time
  if (inFlight) return

  // Guard: don't re-trigger for an address we already attempted this session
  if (lastAddress?.toLowerCase() === address.toLowerCase()) return

  inFlight    = true
  lastAddress = address
  setAuthenticating(true)

  try {
    const walletClient = await getWalletClient(wagmiConfig)
    if (!walletClient) return
    const { nonce, message } = await SiweService.getNonce(address)
    const signature = await walletClient.signMessage({ message })
    const token = await SiweService.verify(address, message, signature, nonce)

    setTokens(token, address)

  } catch (err: unknown) {
    const code = (err as { code?: number })?.code

    // User intentionally rejected the signature prompt — silent, expected UX
    if (code !== undefined && USER_REJECTED_CODES.has(code)) return

    console.warn('[web3] SIWE auto-login failed:', err)

    // Reset so the user can retry manually (useSiweAuth / useSiweSession)
    lastAddress = null

  } finally {
    inFlight = false
    useAuthStore.getState().setAuthenticating(false)
  }
}

watchConnection(wagmiConfig, {
  onChange(connection, prev) {
    if (connection.status === 'connected') {
      const address         = connection.addresses[0]
      const prevAddress     = prev.status === 'connected' ? prev.addresses[0] : undefined
      const isNewConnection = prev.status !== 'connected'
      const isAccountSwitch = prevAddress?.toLowerCase() !== address.toLowerCase()

      if (isNewConnection || isAccountSwitch) {
        void autoLogin(address)
      }
    }

    if (connection.status === 'disconnected' && prev.status === 'connected') {
      lastAddress = null
      useAuthStore.getState().logout()
    }
  },
})

const IGNORED_MODAL_CODES = new Set([4001, 4100, 4902])

modal.subscribeEvents(({ data }) => {
  switch (data.event) {
    case 'CONNECT_ERROR': {
      const code: number | undefined = (data as any).properties?.cause?.code
      if (code !== undefined && IGNORED_MODAL_CODES.has(code)) break
      console.error('[web3] CONNECT_ERROR', (data as any).properties)
      break
    }
    case 'DISCONNECT_ERROR':
      console.warn('[web3] DISCONNECT_ERROR', (data as any).properties)
      break
  }
})

if (import.meta.env.DEV) {
  console.group('[web3] Config')
  console.log('Chains  :', WAGMI_CHAINS.map(c => c.name).join(', '))
  console.log('Default :', DEFAULT_CHAIN.name)
  console.log('Alchemy :', env.alchemyApiKey ? '✅ set' : '⚠️  not set (public RPCs)')
  console.log('Infura  :', env.infuraApiKey  ? '✅ set' : '⚠️  not set')
  console.log('App URL :', APP_URL)
  console.groupEnd()
}