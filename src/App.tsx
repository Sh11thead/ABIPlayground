import { useState, useContext } from 'react'
import './App.css'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ChainsContext } from './main'

// 预置 ERC20 ABI（常用子集）
const erc20Abi = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const

// 辅助：解析 ABI 中的 functions
function parseFunctions(abi: any[]) {
  return abi.filter((item) => item.type === 'function')
}

// 辅助：基于 function 的 inputs 生成表单字段
function FunctionParamsForm({ inputs, onSubmit }: { inputs: any[]; onSubmit: (args: any[]) => void }) {
  const [values, setValues] = useState<Record<string, string>>({})

  const handleChange = (key: string, value: string) => {
    const newValues = { ...values, [key]: value }
    setValues(newValues)

    const args = inputs.map((input, idx) => {
      const k = input.name || `arg${idx}`
      const raw = newValues[k]
      if (raw === undefined) return undefined
      try {
        if (raw.trim().startsWith('[') || raw.trim().startsWith('{')) {
          return JSON.parse(raw)
        }
      } catch (e) { }
      return raw
    })
    onSubmit(args)
  }

  return (
    <div className="form-grid">
      {inputs.map((input, idx) => (
        <div key={idx} className="form-row">
          <label className="form-label">
            {input.name || `arg${idx}`} <span className="muted">({input.type})</span>
          </label>
          <input
            className="input"
            placeholder={input.type === 'address' ? '0x...' : '参数，复杂结构请用 JSON'}
            value={values[input.name || `arg${idx}`] || ''}
            onChange={(e) => handleChange(input.name || `arg${idx}`, e.target.value)}
          />
        </div>
      ))}
    </div>
  )
}

function App() {
  const { isConnected, chainId } = useAccount()
  const { addChain } = useContext(ChainsContext)

  const [address, setAddress] = useState('')
  const [abiText, setAbiText] = useState('')
  const [useERC20, setUseERC20] = useState(true)
  const [selectedFn, setSelectedFn] = useState<any | null>(null)
  const [args, setArgs] = useState<any[]>([])
  const [valueEth, setValueEth] = useState('') // payable 支持

  // 添加自定义网络浮窗控制
  const [showAddChain, setShowAddChain] = useState(false)
  const [newChain, setNewChain] = useState({
    id: '',
    name: '',
    currencyName: '',
    currencySymbol: '',
    decimals: '18',
    rpcUrl: '',
    explorerName: '',
    explorerUrl: '',
    testnet: false,
  })

  const abi = useERC20 ? (erc20Abi as any) : (() => {
    try {
      const parsed = JSON.parse(abiText)
      if (Array.isArray(parsed)) return parsed
    } catch (e) {}
    return []
  })()

  const functions = parseFunctions(abi)
  const viewFns = functions.filter((f) => f.stateMutability === 'view' || f.stateMutability === 'pure')
  const writeFns = functions.filter((f) => f.stateMutability !== 'view' && f.stateMutability !== 'pure')

  // 读取演示：当选择的是 view/pure 时可以点击读取结果
  const readResult = useReadContract({
    abi: abi as any,
    address: address as any,
    functionName: selectedFn?.name,
    args: args as any,
    query: { enabled: !!selectedFn && (selectedFn.stateMutability === 'view' || selectedFn.stateMutability === 'pure') && !!address },
  })

  const { data: txHash, isPending, writeContract } = useWriteContract()
  const wait = useWaitForTransactionReceipt({ hash: txHash, chainId })

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">ABI Playground</h1>
        <div className="header-actions">
          <button className="btn" onClick={() => setShowAddChain(true)}>添加网络</button>
          <ConnectButton />
        </div>
      </header>

      <section className="card">
        <h3 className="section-title">合约配置</h3>
        <div className="form-row">
          <label className="form-label">合约地址</label>
          <input className="input" placeholder="0x..." value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="checkbox">
            <input type="checkbox" checked={useERC20} onChange={(e) => setUseERC20(e.target.checked)} /> 使用预置 ERC20 ABI
          </label>
        </div>
        {!useERC20 && (
          <div className="form-row">
            <label className="form-label">ABI JSON</label>
            <textarea className="textarea" placeholder="输入 ABI JSON（数组）" rows={8} value={abiText} onChange={(e) => setAbiText(e.target.value)} />
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="section-title">Functions</h3>
        <div className="grid-2">
          <div>
            <h4>Read</h4>
            <ul className="list">
              {viewFns.map((fn, idx) => (
                <li key={idx}>
                  <button className="btn ghost" onClick={() => { setSelectedFn(fn); setArgs([]) }}>{fn.name}</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Write</h4>
            <ul className="list">
              {writeFns.map((fn, idx) => (
                <li key={idx}>
                  <button className="btn ghost" onClick={() => { setSelectedFn(fn); setArgs([]) }}>{fn.name}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {selectedFn && (
        <section className="card">
          <h3 className="section-title">Selected: {selectedFn.name} <span className="muted">({selectedFn.stateMutability})</span></h3>
          <FunctionParamsForm key={selectedFn.name} inputs={selectedFn.inputs || []} onSubmit={setArgs} />

          {selectedFn.stateMutability === 'payable' && (
            <div className="form-row">
              <label className="form-label">Value (ETH)</label>
              <input className="input" placeholder="例如 0.01" value={valueEth} onChange={(e) => setValueEth(e.target.value)} />
            </div>
          )}

          {selectedFn.stateMutability === 'view' || selectedFn.stateMutability === 'pure' ? (
            <div className="actions">
              <button className="btn primary" onClick={() => readResult.refetch?.()}>读取</button>
              <div className="readout">
                {readResult.isPending && <span>读取中...</span>}
                {readResult.error && <span>错误：{(readResult.error as any).message}</span>}
                {readResult.data !== undefined && (
                  <pre className="pre">{String(readResult.data)}</pre>
                )}
              </div>
            </div>
          ) : (
            <div className="actions">
              <button
                className="btn primary"
                disabled={!isConnected || isPending}
                onClick={() => {
                  const request: any = {
                    address: address as any,
                    abi: abi as any,
                    functionName: selectedFn.name,
                    args: args as any,
                  }
                  if (selectedFn.stateMutability === 'payable' && valueEth) {
                    const [intPart, fracPart = ''] = valueEth.split('.')
                    const ethWei = BigInt(intPart || '0') * 10n ** 18n + BigInt((fracPart + '0'.repeat(18)).slice(0, 18))
                    request.value = ethWei
                  }
                  writeContract(request)
                }}
              >
                {isPending ? '发送中...' : '发送交易'}
              </button>
              {txHash && (
                <div className="txbox">
                  <div className="muted">Tx Hash:</div>
                  <div className="hash">{txHash}</div>
                  <div className="status">
                    {wait.isLoading && '等待确认...'}
                    {wait.isSuccess && '已确认！'}
                    {wait.error && `错误：${(wait.error as any).message}`}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {showAddChain && (
        <div className="modalOverlay" onClick={() => setShowAddChain(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>添加自定义网络</h3>
              <button className="btn" onClick={() => setShowAddChain(false)}>关闭</button>
            </div>
            <div className="modalBody">
              <div className="grid-2">
                <div className="form-row">
                  <label className="form-label">Chain ID</label>
                  <input className="input" placeholder="例如 97" value={newChain.id} onChange={(e) => setNewChain((s) => ({ ...s, id: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">名称</label>
                  <input className="input" value={newChain.name} onChange={(e) => setNewChain((s) => ({ ...s, name: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">原生币名称</label>
                  <input className="input" value={newChain.currencyName} onChange={(e) => setNewChain((s) => ({ ...s, currencyName: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">原生币符号</label>
                  <input className="input" value={newChain.currencySymbol} onChange={(e) => setNewChain((s) => ({ ...s, currencySymbol: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">Decimals</label>
                  <input className="input" value={newChain.decimals} onChange={(e) => setNewChain((s) => ({ ...s, decimals: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">RPC URL</label>
                  <input className="input" placeholder="https://..." value={newChain.rpcUrl} onChange={(e) => setNewChain((s) => ({ ...s, rpcUrl: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">区块浏览器名称</label>
                  <input className="input" placeholder="例如 BscScan" value={newChain.explorerName} onChange={(e) => setNewChain((s) => ({ ...s, explorerName: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="form-label">区块浏览器 URL</label>
                  <input className="input" placeholder="https://..." value={newChain.explorerUrl} onChange={(e) => setNewChain((s) => ({ ...s, explorerUrl: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="checkbox">
                    <input type="checkbox" checked={newChain.testnet} onChange={(e) => setNewChain((s) => ({ ...s, testnet: e.target.checked }))} /> 测试网
                  </label>
                </div>
              </div>
              <div className="actions">
                <button
                  className="btn primary"
                  onClick={() => {
                    const idNum = Number(newChain.id)
                    const decNum = Number(newChain.decimals || '18')
                    if (!idNum || !newChain.rpcUrl) {
                      alert('请填写有效的 Chain ID 和 RPC URL')
                      return
                    }
                    const chain: any = {
                      id: idNum,
                      name: newChain.name || `Custom Chain ${idNum}`,
                      nativeCurrency: {
                        name: newChain.currencyName || 'Native',
                        symbol: newChain.currencySymbol || 'NATIVE',
                        decimals: Number.isFinite(decNum) ? decNum : 18,
                      },
                      rpcUrls: { default: { http: [newChain.rpcUrl] } },
                      blockExplorers: {
                        default: {
                          name: newChain.explorerName || 'Explorer',
                          url: newChain.explorerUrl || 'https://',
                        },
                      },
                      testnet: newChain.testnet || undefined,
                    }
                    addChain(chain)
                    setShowAddChain(false)
                  }}
                >
                  添加网络
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
