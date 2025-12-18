import React, { createContext, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import '@rainbow-me/rainbowkit/styles.css'
import { WagmiProvider } from 'wagmi'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mainnet, sepolia, polygon, optimism, arbitrum, base, bsc, avalanche, gnosis, plasma } from 'wagmi/chains'
import { http } from 'wagmi'
import type { Chain } from 'viem/chains'

// Custom Monad chain (not yet included in wagmi/chains)
const monad: Chain = {
  id: 143,
  name: 'Monad',
  // minimal Chain fields compatible with viem/wagmi
  nativeCurrency: { name: 'Monad', symbol: 'MONAD', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc3.monad.xyz'] },
    public: { http: ['https://rpc3.monad.xyz'] },
  },
  blockExplorers: {
    // replace with the official explorer URL if different
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz' },
  },
}

const hyperevm: Chain = {
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    public: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'HyperLiquid Explorer', url: 'https://hyperevmscan.io/' },
  },
}

const baseChains: [Chain, ...Chain[]] = [mainnet, sepolia, polygon, optimism, arbitrum, base, bsc, avalanche, gnosis, plasma, monad, hyperevm]
const baseTransports: Record<number, ReturnType<typeof http>> = {
  [mainnet.id]: http(),
  [sepolia.id]: http(),
  [polygon.id]: http(),
  [optimism.id]: http(),
  [arbitrum.id]: http(),
  [base.id]: http(),
  [bsc.id]: http(),
  [avalanche.id]: http(),
  [gnosis.id]: http(),
  [plasma.id]: http(),
  [monad.id]: http('https://rpc3.monad.xyz'),
  [hyperevm.id]: http('https://rpc.hyperliquid.xyz/evm'),
}

export const ChainsContext = createContext<{ addChain: (chain: Chain) => void; chains: Chain[] }>({ addChain: () => {}, chains: [] })

const queryClient = new QueryClient()

function Root() {
  const [extraChains, setExtraChains] = useState<Chain[]>([])
  const [extraTransports, setExtraTransports] = useState<Record<number, ReturnType<typeof http>>>({})

  const chains = useMemo<[Chain, ...Chain[]]>(() => ([...baseChains, ...extraChains] as [Chain, ...Chain[]]), [extraChains])
  const transports = useMemo(() => ({ ...baseTransports, ...extraTransports }), [extraTransports])

  const addChain = (chain: Chain) => {
    if (!chain?.id) return
    setExtraChains((prev) => {
      const existsIdx = prev.findIndex((c) => c.id === chain.id)
      if (existsIdx >= 0) {
        const next = [...prev]
        next[existsIdx] = chain
        return next
      }
      // 如果在 base 中已存在相同 id，则不重复加入 extraChains，只更新 transports
      if (baseChains.some((c) => c.id === chain.id)) {
        return prev
      }
      return [...prev, chain]
    })

    const rpcUrl = chain?.rpcUrls?.default?.http?.[0]
    setExtraTransports((prev) => ({ ...prev, [chain.id]: rpcUrl ? http(rpcUrl) : http() }))
  }

  const config = useMemo(
    () =>
      getDefaultConfig({
        appName: 'ABI Playground',
        projectId: 'demo',
        chains,
        transports,
      }),
    [chains, transports]
  )

  return (
    <React.StrictMode>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <ChainsContext.Provider value={{ addChain, chains }}>
              <App />
            </ChainsContext.Provider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
