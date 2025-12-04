import { useState } from 'react'
import { useWatchContractEvent } from 'wagmi'

interface EventLoggerProps {
  address: string
  abi: any[]
  eventFragment: any
}

export function EventLogger({ address, abi, eventFragment }: EventLoggerProps) {
  const [logs, setLogs] = useState<any[]>([])
  const [isListening, setIsListening] = useState(false)

  useWatchContractEvent({
    address: address as `0x${string}`,
    abi,
    eventName: eventFragment.name,
    onLogs(newLogs) {
      if (!isListening) return
      const formattedLogs = newLogs.map(log => ({
        ...log,
        timestamp: Date.now()
      }))
      setLogs(prev => [...formattedLogs, ...prev])
    },
    enabled: isListening && !!address
  })

  return (
    <div className="event-logger">
      <div className="logger-header">
        <div className="logger-title">
          <h3>{eventFragment.name}</h3>
          <span className="muted">Listening for events...</span>
        </div>
        <div className="logger-controls">
          <button 
            className={`btn ${isListening ? 'error' : 'primary'}`}
            onClick={() => setIsListening(!isListening)}
          >
            {isListening ? 'Stop' : 'Start'} Listening
          </button>
          <button className="btn" onClick={() => setLogs([])}>Clear</button>
        </div>
      </div>

      <div className="logs-container">
        {logs.length === 0 ? (
          <div className="empty-logs">No events received yet</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="log-item">
              <div className="log-meta">
                <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="log-block">Block: {log.blockNumber?.toString()}</span>
                <a 
                  href={`https://etherscan.io/tx/${log.transactionHash}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="log-tx"
                >
                  Tx ↗
                </a>
              </div>
              <pre className="log-args">
                {JSON.stringify(log.args, (_, v) => 
                  typeof v === 'bigint' ? v.toString() : v
                , 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
