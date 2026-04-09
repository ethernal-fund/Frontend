import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { useDisconnect, useConnection } from 'wagmi'
import type { Chain, Address } from 'viem'

export interface WalletState {
  address: Address | undefined
  isConnected: boolean
  chainId: number | undefined
  chain: Chain | undefined
  openModal: () => void
  openAccount: () => void
  openNetworks: () => void
  disconnect: () => void
  shortAddress: string | undefined
  connect: () => void
}

export function useWallet(): WalletState {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { chainId: rawChainId } = useAppKitNetwork()
  const { chain } = useConnection()
  const { disconnect } = useDisconnect()
  const safeAddress = address && address.startsWith('0x') && address.length === 42
    ? (address as Address)
    : undefined

  const chainId = rawChainId != null ? Number(rawChainId) : undefined
  const openModalFn = () => open()

  return {
    address: safeAddress,
    isConnected,
    chainId,
    chain,
    openModal: openModalFn,
    openAccount: () => open({ view: 'Account' }),
    openNetworks: () => open({ view: 'Networks' }),
    disconnect,
    shortAddress: safeAddress
      ? `${safeAddress.slice(0, 6)}...${safeAddress.slice(-4)}`
      : undefined,
    connect: openModalFn,
  }
}