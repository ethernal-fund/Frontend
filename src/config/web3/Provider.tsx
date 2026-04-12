import React                    from 'react'
import { WagmiProvider }        from 'wagmi'
import { QueryClientProvider }  from '@tanstack/react-query'
import { queryClient }          from '@/lib/queryClient'
import { wagmiConfig }          from './adapter'
import './modal' // side-effect: inicializa AppKit una sola vez

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}