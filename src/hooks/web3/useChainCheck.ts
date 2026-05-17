import { useCallback, useState } from 'react'
import { useChainId, useSwitchChain } from 'wagmi'
import { CHAIN_FAUCET_CONFIG } from '@/services/faucet/faucet-client'

export interface SupportedChainInfo {
  chainId:             number
  chainName:           string
  hasFirstPartyFaucet: boolean
}

export function useChainCheck() {
  const chainId     = useChainId()
  const switchChain = useSwitchChain()
  const [switchError, setSwitchError] = useState<string | null>(null)

  // Todas las chains que tienen config (con o sin faucet propio)
  const supportedChains: SupportedChainInfo[] = Object.entries(CHAIN_FAUCET_CONFIG).map(
    ([id, cfg]) => ({
      chainId:             Number(id),
      chainName:           cfg.chainName,
      hasFirstPartyFaucet: !!cfg.apiUrl,
    }),
  )

  // Chains con faucet propio (las "preferidas")
  const firstPartyChains = supportedChains.filter((c) => c.hasFirstPartyFaucet)

  const isSupported = chainId in CHAIN_FAUCET_CONFIG

  const switchToChain = useCallback(
    async (targetChainId: number) => {
      setSwitchError(null)
      try {
        await switchChain.mutateAsync({ chainId: targetChainId })
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.includes('User rejected') || err.message.includes('user rejected')
              ? 'Rechazaste el cambio de red en tu wallet.'
              : err.message
            : 'No se pudo cambiar de red.'
        setSwitchError(msg)
        throw new Error(msg)
      }
    },
    [switchChain],
  )

  const clearSwitchError = useCallback(() => setSwitchError(null), [])

  return {
    currentChainId:  chainId,
    isSupported,
    isSwitching:     switchChain.isPending,
    switchError,
    switchToChain,
    clearSwitchError,
    supportedChains,
    firstPartyChains,
  }
}