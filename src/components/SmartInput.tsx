import { parseEther, formatEther } from 'viem'
import { AddressInput } from './AddressInput'

interface SmartInputProps {
  type: string
  name: string
  value: string
  onChange: (val: string) => void
}

export function SmartInput({ type, value, onChange }: SmartInputProps) {
  // Handle boolean
  if (type === 'bool') {
    return (
      <div className="smart-input-bool">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          />
          <span>{value === 'true' ? 'True' : 'False'}</span>
        </label>
      </div>
    )
  }

  // Handle uint (ETH converter)
  if (type.startsWith('uint') || type.startsWith('int')) {
    return (
      <div className="smart-input-group">
        <input
          className="input"
          placeholder={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="input-actions">
          <button
            className="btn-xs"
            type="button"
            title="Convert Wei to Ether"
            onClick={() => {
              try {
                const val = formatEther(BigInt(value || '0'))
                onChange(val)
              } catch (e) { }
            }}
          >
            To ETH
          </button>
          <button
            className="btn-xs"
            type="button"
            title="Convert Ether to Wei"
            onClick={() => {
              try {
                const val = parseEther(value || '0').toString()
                onChange(val)
              } catch (e) { }
            }}
          >
            To Wei
          </button>
        </div>
      </div>
    )
  }

  // Handle address
  if (type === 'address') {
    return (
      <AddressInput
        value={value}
        onChange={onChange}
        placeholder="0x..."
      />
    )
  }

  // Default
  return (
    <input
      className="input"
      placeholder={type === 'address' ? '0x...' : type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
