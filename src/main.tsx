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

const emojis = ['🌈', '🦄', '🌊', '🌋', '🌍', '🔥', '✨', '🎲', '🎯', '🎨', '🚀', '🌟', '🌀', '🗿']
function getChainIcon(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const emoji = emojis[Math.abs(hash) % emojis.length]
  return `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`
}

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
  // @ts-ignore
  iconUrl: getChainIcon('Monad'),
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
  // @ts-ignore
  iconUrl: getChainIcon('HyperEVM'),
}

const unichain: Chain = {
  id: 130,
  name: 'Unichain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://unichain-rpc.publicnode.com'] },
    public: { http: ['https://unichain-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'Uniscan', url: 'https://uniscan.xyz/' },
  },
  // @ts-ignore
  iconUrl: getChainIcon('Unichain'),
}

const plasmaWithIcon = { ...plasma, iconUrl: getChainIcon('Plasma') }

export const baseChains: [Chain, ...Chain[]] = [mainnet, sepolia, polygon, optimism, arbitrum, base, bsc, avalanche, gnosis, plasmaWithIcon, monad, hyperevm, unichain]
const baseTransports: Record<number, ReturnType<typeof http>> = {
  [mainnet.id]: http('https://eth.drpc.org'),
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
  [unichain.id]: http('https://unichain-rpc.publicnode.com'),
}

const RPC_OVERRIDES_KEY = 'abiPlayground_rpcOverrides'

function loadRpcOverrides(): Record<number, string> {
  try {
    const raw = localStorage.getItem(RPC_OVERRIDES_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { }
  return {}
}

function saveRpcOverrides(overrides: Record<number, string>) {
  localStorage.setItem(RPC_OVERRIDES_KEY, JSON.stringify(overrides))
}

function getDefaultRpcForChain(chainId: number, allChains: Chain[]): string {
  const chain = allChains.find((c) => c.id === chainId)
  return chain?.rpcUrls?.default?.http?.[0] || ''
}

interface ChainsContextType {
  addChain: (chain: Chain) => void
  chains: Chain[]
  updateRpc: (chainId: number, rpcUrl: string) => void
  removeRpcOverride: (chainId: number) => void
  rpcOverrides: Record<number, string>
  getDefaultRpc: (chainId: number) => string
}

export const ChainsContext = createContext<ChainsContextType>({
  addChain: () => { },
  chains: [],
  updateRpc: () => { },
  removeRpcOverride: () => { },
  rpcOverrides: {},
  getDefaultRpc: () => '',
})

const queryClient = new QueryClient()

function Root() {
  const [extraChains, setExtraChains] = useState<Chain[]>([])
  const [extraTransports, setExtraTransports] = useState<Record<number, ReturnType<typeof http>>>({})
  const [rpcOverrides, setRpcOverrides] = useState<Record<number, string>>(() => loadRpcOverrides())

  const chains = useMemo<[Chain, ...Chain[]]>(() => ([...baseChains, ...extraChains] as [Chain, ...Chain[]]), [extraChains])

  // Build transports: base → extra → rpc overrides
  const rpcTransports = useMemo(() => {
    const result: Record<number, ReturnType<typeof http>> = {}
    for (const [id, url] of Object.entries(rpcOverrides)) {
      result[Number(id)] = http(url)
    }
    return result
  }, [rpcOverrides])

  const transports = useMemo(() => ({ ...baseTransports, ...extraTransports, ...rpcTransports }), [extraTransports, rpcTransports])

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
    // Only set extra transport if no RPC override exists for this chain
    if (!rpcOverrides[chain.id]) {
      setExtraTransports((prev) => ({ ...prev, [chain.id]: rpcUrl ? http(rpcUrl) : http() }))
    }
  }

  const updateRpc = (chainId: number, rpcUrl: string) => {
    setRpcOverrides((prev) => {
      const next = { ...prev, [chainId]: rpcUrl }
      saveRpcOverrides(next)
      return next
    })
  }

  const removeRpcOverride = (chainId: number) => {
    setRpcOverrides((prev) => {
      const next = { ...prev }
      delete next[chainId]
      saveRpcOverrides(next)
      return next
    })
  }

  const getDefaultRpc = (chainId: number) => getDefaultRpcForChain(chainId, chains)

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
            <ChainsContext.Provider value={{ addChain, chains, updateRpc, removeRpcOverride, rpcOverrides, getDefaultRpc }}>
              <App />
            </ChainsContext.Provider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </React.StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
