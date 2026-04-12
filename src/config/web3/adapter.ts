import { createStorage }  from 'wagmi'
import { WagmiAdapter }   from '@reown/appkit-adapter-wagmi'

import { PROJECT_ID, WAGMI_CHAINS, ACTIVE_TRANSPORTS } from './constants'

export const wagmiAdapter = new WagmiAdapter({
  projectId:  PROJECT_ID,
  networks:   WAGMI_CHAINS,
  transports: ACTIVE_TRANSPORTS,
  storage:    createStorage({ storage: window.localStorage }),
  ssr:        false,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig