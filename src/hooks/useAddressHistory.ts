import { useState, useEffect } from 'react'

export interface HistoryItem {
  address: string
  alias?: string
  timestamp: number
}

export function useAddressHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('abiPlayground_history')
    if (stored) {
      try {
        setHistory(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse history', e)
      }
    }
  }, [])

  const addToHistory = (address: string, alias?: string) => {
    if (!address || address.length < 40) return
    setHistory(prev => {
      // Remove existing entry for this address to avoid duplicates
      const filtered = prev.filter(item => item.address.toLowerCase() !== address.toLowerCase())
      const newItem = { address, alias, timestamp: Date.now() }
      // Add to top, keep max 10
      const newHistory = [newItem, ...filtered].slice(0, 10)
      localStorage.setItem('abiPlayground_history', JSON.stringify(newHistory))
      return newHistory
    })
  }

  return { history, addToHistory }
}
