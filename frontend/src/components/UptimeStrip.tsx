interface Props {
  thresholdDays: number
  daysInactive: number
  status: string
}

/**
 * Renders a row of pips representing the heartbeat window, in the visual
 * vernacular of an uptime/status page. Each pip is one chunk of the
 * threshold period. Filled green pips = time elapsed while still active,
 * gray = time remaining before the threshold, the last pip pulses red
 * once the threshold has actually been crossed.
 */
export default function UptimeStrip({ thresholdDays, daysInactive, status }: Props) {
  const pipCount = 28
  const ratio = thresholdDays > 0 ? daysInactive / thresholdDays : 0
  const filledCount = Math.min(pipCount, Math.round(ratio * pipCount))
  const overThreshold = daysInactive >= thresholdDays

  return (
    <div>
      <div style={{ display: 'flex', gap: 3, marginBottom: '0.5rem' }}>
        {Array.from({ length: pipCount }).map((_, i) => {
          const isFilled = i < filledCount
          const isLast = i === filledCount - 1 || (overThreshold && i === pipCount - 1)
          let bg = 'var(--line)'
          if (status === 'transferred') {
            bg = i < pipCount ? 'var(--critical)' : 'var(--line)'
          } else if (status === 'flagged') {
            bg = isFilled ? 'var(--warn)' : 'var(--line)'
          } else if (isFilled) {
            bg = overThreshold ? 'var(--critical)' : 'var(--signal)'
          }
          return (
            <div
              key={i}
              className={isLast && (overThreshold || status === 'flagged') ? 'pip-live' : ''}
              style={{
                flex: 1,
                height: 18,
                borderRadius: 2,
                background: bg,
                transition: 'background 0.3s',
              }}
            />
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>
          last ping
        </span>
        <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>
          {thresholdDays}d threshold
        </span>
      </div>
    </div>
  )
}
