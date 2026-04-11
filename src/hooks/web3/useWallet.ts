import { useAppKit }           from '@reown/appkit/react'
import { useConnection, useDisconnect } from 'wagmi'
import type { Address }        from 'viem'

export interface WalletState {
  address:      Address | undefined
  isConnected:  boolean
  chainId:      number | undefined
  openModal:    () => void
  openAccount:  () => void
  openNetworks: () => void
  disconnect:   () => void
  shortAddress: string | undefined
  connect:      () => void
}

export function useWallet(): WalletState {
  const { open }       = useAppKit()
  const {
    address,
    isConnected,
    chainId,
  } = useConnection()

  const { disconnect } = useDisconnect()

  const safeAddress = address && address.startsWith('0x') && address.length === 42
    ? (address as Address)
    : undefined

  const openModalFn = () => open()

  return {
    address:      safeAddress,
    isConnected,
    chainId,
    openModal:    openModalFn,
    openAccount:  () => open({ view: 'Account' }),
    openNetworks: () => open({ view: 'Networks' }),
    disconnect,
    shortAddress: safeAddress
      ? `${safeAddress.slice(0, 6)}...${safeAddress.slice(-4)}`
      : undefined,
    connect: openModalFn,
  }
}