import { create }           from 'zustand'
import { devtools }         from 'zustand/middleware'
import { watchAccount }     from '@wagmi/core'
import type { GetAccountReturnType } from '@wagmi/core'
import { wagmiConfig }      from '@/lib/wagmi'
import type { Address }     from 'viem'

interface WalletState {
  address:        Address | undefined
  chainId:        number | undefined
  isConnected:    boolean
  isReconnecting: boolean
}

export const useWalletStore = create<WalletState>()(
  devtools(
    () => ({
      address:        undefined,
      chainId:        undefined,
      isConnected:    false,
      isReconnecting: false,
    }),
    {
      name:    'WalletStore',
      enabled: import.meta.env.DEV,
    },
  ),
)

watchAccount(wagmiConfig, {
  onChange(account: GetAccountReturnType) {
    useWalletStore.setState(
      {
        address:        account.address,
        chainId:        account.chainId,
        isConnected:    account.status === 'connected',
        isReconnecting: account.status === 'reconnecting',
      },
      false,
      'wallet/sync',
    )
  },
})