import { useEffect, useState } from 'react'
import { NETWORKS, ACTIVE_NETWORK } from '@/lib/config'

interface Props {
  hash: string | null
  error: string | null
  onDismiss: () => void
}

export default function TxToast({ hash, error, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)
  const network = NETWORKS[ACTIVE_NETWORK]

  useEffect(() => {
    if (hash || error) {
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        setTimeout(onDismiss, 300)
      }, 8000)
      return () => clearTimeout(t)
    }
  }, [hash, error])

  if (!hash && !error) return null

  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 100, maxWidth: 360,
      background: 'var(--raised)', border: `1px solid ${error ? 'var(--critical)' : 'var(--signal)'}`,
      borderRadius: 6, padding: '1rem 1.25rem',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.2s, transform 0.2s', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          {error ? (
            <>
              <p className="mono" style={{ margin: 0, fontWeight: 600, color: 'var(--critical)', fontSize: '0.84rem' }}>
                transaction_failed
              </p>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.76rem', color: 'var(--dim)', wordBreak: 'break-all' }}>
                {error.slice(0, 120)}
              </p>
            </>
          ) : (
            <>
              <p className="mono" style={{ margin: 0, fontWeight: 600, color: 'var(--signal)', fontSize: '0.84rem' }}>
                transaction_sent
              </p>
              <a href={`${network.explorer}/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="mono"
                style={{ fontSize: '0.74rem', color: 'var(--bright)', textDecoration: 'none', wordBreak: 'break-all' }}>
                {hash?.slice(0, 14)}…{hash?.slice(-8)}
              </a>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.74rem', color: 'var(--dim)' }}>
                GenLayer consensus in progress.
              </p>
            </>
          )}
        </div>
        <button onClick={() => { setVisible(false); setTimeout(onDismiss, 300) }}
          style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>
          ✕
        </button>
      </div>
    </div>
  )
}
