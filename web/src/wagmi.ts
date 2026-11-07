import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { elysium, elysiumTestnet, hyperEvm } from './chains'

export const wagmiConfig = createConfig({
  chains: [hyperEvm, elysium, elysiumTestnet],
  connectors: [injected()],
  transports: {
    [hyperEvm.id]: http(),
    [elysium.id]: http(),
    [elysiumTestnet.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
