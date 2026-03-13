import { useContext, useEffect, useMemo, useState } from 'react'
import { formatUnits, isAddress, parseUnits } from 'viem'
import { useAccount, useReadContract, useSwitchChain, useWriteContract, usePublicClient } from 'wagmi'
import { ChainsContext } from '../main'
import { AddressInput } from './AddressInput'
import { erc20Abi, erc4626Abi } from '../abis'

interface ERC4626PlaygroundProps {
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

const vaultAssetAbiVariants = [
  { type: 'function', name: 'asset', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'underlying', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'token', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'want', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const

const erc20SymbolAbi = [
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const

function shortAddress(addr?: string) {
  if (!addr) return '-'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function ERC4626Playground({ addToast }: ERC4626PlaygroundProps) {
  const { chains } = useContext(ChainsContext)
  const { address: userAddress, chainId: walletChainId, isConnected } = useAccount()
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const [selectedChainId, setSelectedChainId] = useState<number>(() => {
    const stored = localStorage.getItem('erc4626_selectedChainId')
    return stored ? Number(stored) : chains[0]?.id || 1
  })
  const [vaultAddress, setVaultAddress] = useState(() => localStorage.getItem('erc4626_vaultAddress') || '')
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [txStage, setTxStage] = useState<'approve' | 'deposit' | 'withdraw' | null>(null)
  const [fallbackAssetAddress, setFallbackAssetAddress] = useState<`0x${string}` | undefined>(undefined)
  const [assetResolveError, setAssetResolveError] = useState<string>('')

  useEffect(() => {
    if (!selectedChainId && chains[0]) setSelectedChainId(chains[0].id)
  }, [chains, selectedChainId])

  useEffect(() => {
    localStorage.setItem('erc4626_selectedChainId', String(selectedChainId))
  }, [selectedChainId])

  useEffect(() => {
    localStorage.setItem('erc4626_vaultAddress', vaultAddress)
  }, [vaultAddress])

  useEffect(() => {
    if (walletChainId && !localStorage.getItem('erc4626_selectedChainId')) {
      setSelectedChainId(walletChainId)
    }
  }, [walletChainId])

  const validVaultAddress = useMemo(
    () => (isAddress(vaultAddress) ? (vaultAddress as `0x${string}`) : undefined),
    [vaultAddress],
  )

  const publicClient = usePublicClient({ chainId: selectedChainId })

  const vaultName = useReadContract({
    chainId: selectedChainId,
    abi: erc4626Abi,
    address: validVaultAddress,
    functionName: 'name',
    query: { enabled: !!validVaultAddress },
  })

  const vaultDecimals = useReadContract({
    chainId: selectedChainId,
    abi: erc4626Abi,
    address: validVaultAddress,
    functionName: 'decimals',
    query: { enabled: !!validVaultAddress },
  })

  const assetAddressResult = useReadContract({
    chainId: selectedChainId,
    abi: erc4626Abi,
    address: validVaultAddress,
    functionName: 'asset',
    query: { enabled: !!validVaultAddress },
  })

  useEffect(() => {
    setFallbackAssetAddress(undefined)
    setAssetResolveError('')
  }, [selectedChainId, validVaultAddress])

  useEffect(() => {
    let cancelled = false

    const resolveFallbackAsset = async () => {
      if (!validVaultAddress || !publicClient) return
      if (assetAddressResult.data && isAddress(assetAddressResult.data as string)) return

      for (const fn of vaultAssetAbiVariants) {
        try {
          const result = await publicClient.readContract({
            address: validVaultAddress,
            abi: [fn],
            functionName: fn.name,
          })

          if (!cancelled && typeof result === 'string' && isAddress(result)) {
            setFallbackAssetAddress(result as `0x${string}`)
            setAssetResolveError('')
            return
          }
        } catch {
          // Try next selector.
        }
      }

      if (!cancelled) {
        setAssetResolveError('无法解析底层资产地址，可能不是标准 ERC4626 vault。')
      }
    }

    resolveFallbackAsset()
    return () => {
      cancelled = true
    }
  }, [assetAddressResult.data, validVaultAddress, publicClient])

  const assetAddress = (assetAddressResult.data && isAddress(assetAddressResult.data as string)
    ? (assetAddressResult.data as `0x${string}`)
    : fallbackAssetAddress)

  const assetName = useReadContract({
    chainId: selectedChainId,
    abi: erc20Abi,
    address: assetAddress,
    functionName: 'name',
    query: { enabled: !!assetAddress },
  })

  const assetSymbol = useReadContract({
    chainId: selectedChainId,
    abi: erc20SymbolAbi,
    address: assetAddress,
    functionName: 'symbol',
    query: { enabled: !!assetAddress },
  })

  const assetDecimals = useReadContract({
    chainId: selectedChainId,
    abi: erc20Abi,
    address: assetAddress,
    functionName: 'decimals',
    query: { enabled: !!assetAddress },
  })

  const userAssetBalance = useReadContract({
    chainId: selectedChainId,
    abi: erc20Abi,
    address: assetAddress,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!assetAddress && !!userAddress },
  })

  const userVaultBalance = useReadContract({
    chainId: selectedChainId,
    abi: erc4626Abi,
    address: validVaultAddress,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!validVaultAddress && !!userAddress },
  })

  const userVaultAssetBalance = useReadContract({
    chainId: selectedChainId,
    abi: erc4626Abi,
    address: validVaultAddress,
    functionName: 'convertToAssets',
    args: userVaultBalance.data !== undefined ? [userVaultBalance.data] : undefined,
    query: { enabled: !!validVaultAddress && userVaultBalance.data !== undefined },
  })

  const allowance = useReadContract({
    chainId: selectedChainId,
    abi: erc20Abi,
    address: assetAddress,
    functionName: 'allowance',
    args: userAddress && validVaultAddress ? [userAddress, validVaultAddress] : undefined,
    query: { enabled: !!assetAddress && !!userAddress && !!validVaultAddress },
  })

  const refreshAll = () => {
    vaultName.refetch()
    vaultDecimals.refetch()
    assetAddressResult.refetch()
    assetName.refetch()
    assetSymbol.refetch()
    assetDecimals.refetch()
    userAssetBalance.refetch()
    userVaultBalance.refetch()
    userVaultAssetBalance.refetch()
    allowance.refetch()
  }

  const parseAssetAmount = (rawAmount: string) => {
    const decimals = Number(assetDecimals.data ?? 18)
    try {
      return parseUnits(rawAmount || '0', decimals)
    } catch {
      return null
    }
  }

  const formatAmount = (value: unknown, decimalsValue: number, fallback = '-') => {
    if (value === undefined || value === null) return fallback
    try {
      return formatUnits(BigInt(value as bigint), decimalsValue)
    } catch {
      return fallback
    }
  }

  const ensureWalletChain = async () => {
    if (!isConnected) {
      addToast('请先连接钱包', 'error')
      return false
    }
    if (walletChainId === selectedChainId) return true
    try {
      await switchChainAsync({ chainId: selectedChainId })
      return true
    } catch (err: any) {
      addToast(`切换网络失败: ${err?.shortMessage || err?.message || '未知错误'}`, 'error')
      return false
    }
  }

  const handleDeposit = async () => {
    if (!validVaultAddress || !assetAddress || !userAddress) {
      addToast('请先选择网络并输入有效 vault 地址', 'error')
      return
    }
    const amountWei = parseAssetAmount(depositAmount)
    if (!amountWei || amountWei <= 0n) {
      addToast('请输入有效的存入数量', 'error')
      return
    }
    if (!(await ensureWalletChain())) return

    const currentAllowance = BigInt((allowance.data as bigint | undefined) ?? 0n)

    try {
      if (currentAllowance < amountWei) {
        setTxStage('approve')
        const approveHash = await writeContractAsync({
          chainId: selectedChainId,
          address: assetAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [validVaultAddress, amountWei],
        })

        await publicClient?.waitForTransactionReceipt({ hash: approveHash })
        addToast('Approve 已确认，请再次点击存入执行 deposit', 'success')
        allowance.refetch()
        return
      }

      setTxStage('deposit')
      const depositHash = await writeContractAsync({
        chainId: selectedChainId,
        address: validVaultAddress,
        abi: erc4626Abi,
        functionName: 'deposit',
        args: [amountWei, userAddress],
      })
      await publicClient?.waitForTransactionReceipt({ hash: depositHash })
      addToast('存入成功', 'success')
      setDepositAmount('')
      refreshAll()
    } catch (err: any) {
      addToast(`存入失败: ${err?.shortMessage || err?.message || '未知错误'}`, 'error')
    } finally {
      setTxStage(null)
    }
  }

  const handleWithdraw = async () => {
    if (!validVaultAddress || !userAddress) {
      addToast('请先选择网络并输入有效 vault 地址', 'error')
      return
    }
    const amountWei = parseAssetAmount(withdrawAmount)
    if (!amountWei || amountWei <= 0n) {
      addToast('请输入有效的取出数量', 'error')
      return
    }
    if (!(await ensureWalletChain())) return

    try {
      setTxStage('withdraw')
      const hash = await writeContractAsync({
        chainId: selectedChainId,
        address: validVaultAddress,
        abi: erc4626Abi,
        functionName: 'withdraw',
        args: [amountWei, userAddress, userAddress],
      })
      await publicClient?.waitForTransactionReceipt({ hash })
      addToast('取出成功', 'success')
      setWithdrawAmount('')
      refreshAll()
    } catch (err: any) {
      addToast(`取出失败: ${err?.shortMessage || err?.message || '未知错误'}`, 'error')
    } finally {
      setTxStage(null)
    }
  }

  const assetDecimalsValue = Number(assetDecimals.data ?? 18)
  const vaultDecimalsValue = Number(vaultDecimals.data ?? 18)
  const displayAssetName = String(assetName.data ?? assetSymbol.data ?? '-')

  return (
    <>
      <section className="card">
        <h3 className="section-title">ERC4626 配置</h3>
        <div className="grid-2">
          <div className="form-row">
            <label className="form-label">网络</label>
            <div className="network-row">
              <select
                className="input"
                value={selectedChainId}
                onChange={(e) => setSelectedChainId(Number(e.target.value))}
              >
                {chains.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name} ({chain.id})
                  </option>
                ))}
              </select>
              {walletChainId !== selectedChainId && (
                <button className="btn" onClick={() => ensureWalletChain()} disabled={isSwitching}>
                  {isSwitching ? '切换中...' : '切换钱包网络'}
                </button>
              )}
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Vault 地址</label>
            <AddressInput
              value={vaultAddress}
              onChange={setVaultAddress}
              historyKey="erc4626_vault_history"
              placeholder="0x..."
            />
          </div>
        </div>
      </section>

      <section className="card">
        <h3 className="section-title">Vault 信息</h3>
        <div className="info-grid">
          <div className="info-item">
            <div className="muted">Vault 名称</div>
            <div>{String(vaultName.data ?? '-')}</div>
          </div>
          <div className="info-item">
            <div className="muted">Vault Asset 名称</div>
            <div>{displayAssetName}</div>
          </div>
          <div className="info-item">
            <div className="muted">Asset 合约地址</div>
            <div>{shortAddress(assetAddress)}</div>
          </div>
          <div className="info-item">
            <div className="muted">你的 Asset Balance</div>
            <div>{formatAmount(userAssetBalance.data, assetDecimalsValue)}</div>
          </div>
          <div className="info-item">
            <div className="muted">你的 Vault Share Balance</div>
            <div>{formatAmount(userVaultBalance.data, vaultDecimalsValue)}</div>
          </div>
          <div className="info-item">
            <div className="muted">你的 Vault Asset Balance</div>
            <div>{formatAmount(userVaultAssetBalance.data, assetDecimalsValue)}</div>
          </div>
          <div className="info-item">
            <div className="muted">当前 Allowance (Asset -&gt; Vault)</div>
            <div>{formatAmount(allowance.data, assetDecimalsValue)}</div>
          </div>
        </div>
        {!!assetResolveError && <p className="muted" style={{ marginTop: 10 }}>{assetResolveError}</p>}
      </section>

      <section className="card">
        <h3 className="section-title">交互操作</h3>
        <div className="grid-2">
          <div className="form-row">
            <label className="form-label">存入 Asset 数量</label>
            <input
              className="input"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="例如 1.25"
            />
            <button
              className="btn primary"
              onClick={handleDeposit}
              disabled={txStage === 'approve' || txStage === 'deposit' || txStage === 'withdraw'}
            >
              {txStage === 'approve' ? 'Approve 中...' : txStage === 'deposit' ? '存入中...' : '存入 Asset'}
            </button>
          </div>

          <div className="form-row">
            <label className="form-label">取出 Asset 数量</label>
            <input
              className="input"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="例如 0.5"
            />
            <button
              className="btn"
              onClick={handleWithdraw}
              disabled={txStage === 'approve' || txStage === 'deposit' || txStage === 'withdraw'}
            >
              {txStage === 'withdraw' ? '取出中...' : '取出 Asset'}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
