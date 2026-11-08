import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import App from './App'
import { wagmiConfig } from './wagmi'
import { DEMO } from './config/demo'
import './styles/global.css'

// Demo fixtures must never reach a production build.
if (import.meta.env.PROD && DEMO) {
  throw new Error('VITE_DEMO is set in a production build. Unset it and rebuild.')
}

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
