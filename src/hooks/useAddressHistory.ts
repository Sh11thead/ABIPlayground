import { useState, useEffect } from 'react'

export interface HistoryItem {
  address: string
  alias?: string
  timestamp: number
}

export function useAddressHistory(storageKey: string = 'abiPlayground_history') {
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        setHistory(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse history', e)
      }
    }
  }, [storageKey])

  const addToHistory = (address: string, alias?: string) => {
    if (!address || address.length < 40) return
    setHistory(prev => {
      // Remove existing entry for this address to avoid duplicates
      const existingItem = prev.find(item => item.address.toLowerCase() === address.toLowerCase())
      const filtered = prev.filter(item => item.address.toLowerCase() !== address.toLowerCase())
      
      // Keep existing alias if not provided
      const finalAlias = alias !== undefined ? alias : existingItem?.alias

      const newItem = { address, alias: finalAlias, timestamp: Date.now() }
      // Add to top, keep max 20 (increased from 10)
      const newHistory = [newItem, ...filtered].slice(0, 20)
      localStorage.setItem(storageKey, JSON.stringify(newHistory))
      return newHistory
    })
  }

  const updateAlias = (address: string, alias: string) => {
    setHistory(prev => {
      const newHistory = prev.map(item =>
        item.address.toLowerCase() === address.toLowerCase()
          ? { ...item, alias }
          : item
      )
      localStorage.setItem(storageKey, JSON.stringify(newHistory))
      return newHistory
    })
  }

  const removeAddress = (address: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(item => item.address.toLowerCase() !== address.toLowerCase())
      localStorage.setItem(storageKey, JSON.stringify(newHistory))
      return newHistory
    })
  }

  const importHistory = (items: HistoryItem[]) => {
    setHistory(prev => {
      const map = new Map(prev.map(i => [i.address.toLowerCase(), i]))
      items.forEach(i => {
        // Merge: imported items overwrite existing ones (e.g. update alias)
        // or add if not exists
        map.set(i.address.toLowerCase(), { ...i, timestamp: i.timestamp || Date.now() })
      })
      const newHistory = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp)
      localStorage.setItem(storageKey, JSON.stringify(newHistory))
      return newHistory
    })
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(storageKey)
  }

  return { history, addToHistory, updateAlias, removeAddress, importHistory, clearHistory }
}
