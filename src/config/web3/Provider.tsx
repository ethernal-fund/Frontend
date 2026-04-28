import React         from 'react'
import { WagmiProvider } from 'wagmi'
import { wagmiConfig }   from './adapter'
import './modal' 

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      {children}
    </WagmiProvider>
  )
}