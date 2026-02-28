import { useContext, useState, useEffect } from 'react'
import { ChainsContext } from '../main'

export function RpcManagerModal({ onClose }: { onClose: () => void }) {
  const { chains, rpcOverrides, updateRpc, removeRpcOverride, getDefaultRpc } = useContext(ChainsContext)

  // Local draft state: chainId -> edited rpc url
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  // Track which rows were just saved for visual feedback
  const [saved, setSaved] = useState<Record<number, boolean>>({})

  // Initialize drafts from current overrides + defaults
  useEffect(() => {
    const init: Record<number, string> = {}
    chains.forEach((c) => {
      init[c.id] = rpcOverrides[c.id] || getDefaultRpc(c.id)
    })
    setDrafts(init)
  }, [chains, rpcOverrides, getDefaultRpc])

  const handleSave = (chainId: number) => {
    const url = drafts[chainId]?.trim()
    if (!url) return
    const defaultUrl = getDefaultRpc(chainId)
    if (url === defaultUrl) {
      // If user typed back the default, just remove override
      removeRpcOverride(chainId)
    } else {
      updateRpc(chainId, url)
    }
    setSaved((prev) => ({ ...prev, [chainId]: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [chainId]: false })), 1500)
  }

  const handleReset = (chainId: number) => {
    removeRpcOverride(chainId)
    setDrafts((prev) => ({ ...prev, [chainId]: getDefaultRpc(chainId) }))
    setSaved((prev) => ({ ...prev, [chainId]: true }))
    setTimeout(() => setSaved((prev) => ({ ...prev, [chainId]: false })), 1500)
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal rpc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3>🔗 RPC 管理</h3>
          <button className="btn" onClick={onClose}>关闭</button>
        </div>
        <div className="modalBody">
          <p className="muted" style={{ marginBottom: 12 }}>修改任意网络的 RPC 地址，保存后自动持久化到本地。</p>
          <div className="rpc-list">
            {chains.map((chain) => {
              const isOverridden = !!rpcOverrides[chain.id]
              const justSaved = saved[chain.id]
              return (
                <div key={chain.id} className={`rpc-row ${isOverridden ? 'rpc-overridden' : ''}`}>
                  <div className="rpc-chain-info">
                    <span className="rpc-chain-name">{chain.name}</span>
                    <span className="muted rpc-chain-id">ID: {chain.id}</span>
                    {isOverridden && <span className="rpc-badge">已自定义</span>}
                  </div>
                  <div className="rpc-input-row">
                    <input
                      className="input rpc-input"
                      value={drafts[chain.id] || ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [chain.id]: e.target.value }))}
                      placeholder="https://..."
                    />
                    <button
                      className={`btn ${justSaved ? 'success' : 'primary'}`}
                      onClick={() => handleSave(chain.id)}
                      disabled={justSaved}
                    >
                      {justSaved ? '✓' : '保存'}
                    </button>
                    {isOverridden && (
                      <button className="btn" onClick={() => handleReset(chain.id)} title="还原为默认 RPC">
                        还原
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
