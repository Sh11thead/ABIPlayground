import { useState, useRef } from 'react'
import type { HistoryItem } from '../hooks/useAddressHistory'

interface AddressBookModalProps {
  onClose: () => void
  contractHistory: HistoryItem[]
  paramHistory: HistoryItem[]
  onUpdateContractAlias: (address: string, alias: string) => void
  onUpdateParamAlias: (address: string, alias: string) => void
  onRemoveContract: (address: string) => void
  onRemoveParam: (address: string) => void
  onImportContract: (items: HistoryItem[]) => void
  onImportParam: (items: HistoryItem[]) => void
}

export function AddressBookModal({
  onClose,
  contractHistory,
  paramHistory,
  onUpdateContractAlias,
  onUpdateParamAlias,
  onRemoveContract,
  onRemoveParam,
  onImportContract,
  onImportParam
}: AddressBookModalProps) {
  const [activeTab, setActiveTab] = useState<'contract' | 'param'>('contract')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentHistory = activeTab === 'contract' ? contractHistory : paramHistory
  const onUpdateAlias = activeTab === 'contract' ? onUpdateContractAlias : onUpdateParamAlias
  const onRemove = activeTab === 'contract' ? onRemoveContract : onRemoveParam
  const onImport = activeTab === 'contract' ? onImportContract : onImportParam

  const handleExport = () => {
    const dataStr = JSON.stringify(currentHistory, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `abiplayground_${activeTab}_history.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string)
        if (Array.isArray(json)) {
          onImport(json)
          alert('导入成功')
        } else {
          alert('文件格式错误：必须是 JSON 数组')
        }
      } catch (err) {
        alert('解析 JSON 失败')
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modalHeader">
          <h3>地址簿</h3>
          <button className="btn" onClick={onClose}>关闭</button>
        </div>
        <div className="modalBody">
          <div className="sidebar-tabs" style={{ marginBottom: '1rem' }}>
            <button
              className={`tab-btn ${activeTab === 'contract' ? 'active' : ''}`}
              onClick={() => setActiveTab('contract')}
            >
              合约地址
            </button>
            <button
              className={`tab-btn ${activeTab === 'param' ? 'active' : ''}`}
              onClick={() => setActiveTab('param')}
            >
              常用地址
            </button>
          </div>

          <div className="address-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {currentHistory.length === 0 ? (
              <div className="empty-state">暂无记录</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px' }}>地址</th>
                    <th style={{ padding: '8px' }}>名称 (Alias)</th>
                    <th style={{ padding: '8px', width: '50px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {currentHistory.map((item) => (
                    <tr key={item.address} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '0.9em' }}>
                        {item.address}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          className="input"
                          style={{ padding: '4px 8px', fontSize: '0.9em' }}
                          value={item.alias || ''}
                          placeholder="设置名称..."
                          onChange={(e) => onUpdateAlias(item.address, e.target.value)}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => {
                            if (confirm('确定删除吗？')) onRemove(item.address)
                          }}
                          title="删除"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="actions" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleFileChange}
            />
            <button className="btn" onClick={handleImportClick}>导入</button>
            <button className="btn" onClick={handleExport}>导出</button>
          </div>
        </div>
      </div>
    </div>
  )
}
