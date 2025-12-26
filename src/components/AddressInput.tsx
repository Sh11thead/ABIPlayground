import { useState, useRef, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useAddressHistory } from '../hooks/useAddressHistory'

interface AddressInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  historyKey?: string
}

export function AddressInput({ value, onChange, placeholder, historyKey }: AddressInputProps) {
  const { address: myAddress, isConnected } = useAccount()
  const { history } = useAddressHistory(historyKey)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (addr: string) => {
    onChange(addr)
    setIsOpen(false)
  }

  const currentAlias = history.find(item => item.address.toLowerCase() === value.toLowerCase())?.alias

  return (
    <div className="address-input-wrapper" ref={wrapperRef}>
      <div className="input-group">
        <input
          className="input"
          placeholder={placeholder || "0x..."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        {currentAlias && (
          <div className="input-alias-badge" title={currentAlias}>
            {currentAlias}
          </div>
        )}
        <button
          className="btn-icon"
          onClick={() => setIsOpen(!isOpen)}
          title="Select from history or wallet"
        >
          ▼
        </button>
      </div>

      {isOpen && (
        <div className="address-dropdown">
          {isConnected && myAddress && (
            <div className="dropdown-section">
              <div className="dropdown-header">My Wallet</div>
              <button
                className="dropdown-item"
                onClick={() => handleSelect(myAddress)}
              >
                <span className="addr-alias">Connected</span>
                <span className="addr-value">{myAddress}</span>
              </button>
            </div>
          )}

          {history.length > 0 && (
            <div className="dropdown-section">
              <div className="dropdown-header">History</div>
              {history.map((item, idx) => (
                <button
                  key={idx}
                  className="dropdown-item"
                  onClick={() => handleSelect(item.address)}
                >
                  <span className="addr-alias">
                    {item.alias || new Date(item.timestamp).toLocaleDateString()}
                  </span>
                  <span className="addr-value">{item.address}</span>
                </button>
              ))}
            </div>
          )}

          {!isConnected && history.length === 0 && (
            <div className="dropdown-empty">No history or wallet connected</div>
          )}
        </div>
      )}
    </div>
  )
}
