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
      const filtered = prev.filter(item => item.address.toLowerCase() !== address.toLowerCase())
      const newItem = { address, alias, timestamp: Date.now() }
      // Add to top, keep max 10
      const newHistory = [newItem, ...filtered].slice(0, 10)
      localStorage.setItem(storageKey, JSON.stringify(newHistory))
      return newHistory
    })
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(storageKey)
  }

  return { history, addToHistory, clearHistory }
}
