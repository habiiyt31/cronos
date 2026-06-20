import { PackageData } from '@/hooks/useRegistry'
import { STATUS_META, shortenAddress, daysAgoLabel } from '@/lib/config'
import UptimeStrip from './UptimeStrip'

interface Props {
  pkg: PackageData
  daysInactive: number
  isOwner?: boolean
  isEmergencyContact?: boolean
  txLoading?: boolean
  onPing?: () => void
  onCheck?: () => void
  onWithdraw?: () => void
}

export default function PackageCard({
  pkg, daysInactive, isOwner, isEmergencyContact,
  txLoading, onPing, onCheck, onWithdraw,
}: Props) {
  const meta = STATUS_META[pkg.status] || STATUS_META.withdrawn
  const canCheck = pkg.status === 'active' && daysInactive >= pkg.threshold_days

  return (
    <div className="panel fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span className="mono" style={{ fontSize: '1.05rem', color: 'var(--bright)', fontWeight: 600 }}>
              {pkg.repo_owner}/{pkg.repo_name}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--dim)', marginTop: '0.25rem' }}>
            maintained by <span className="mono">@{pkg.github_user}</span>
            {isOwner && <span style={{ marginLeft: '0.5rem', color: 'var(--signal)' }}>· you</span>}
          </p>
        </div>
        <span className={`mono ${meta.badgeClass}`} style={{ fontSize: '0.72rem', padding: '0.25rem 0.7rem', borderRadius: 4, fontWeight: 600, letterSpacing: '0.03em' }}>
          {meta.label.toUpperCase()}
        </span>
      </div>

      <UptimeStrip thresholdDays={pkg.threshold_days} daysInactive={daysInactive} status={pkg.status} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.875rem' }}>
        <Stat label="Last Ping" value={daysAgoLabel(daysInactive)} />
        <Stat label="Threshold" value={`${pkg.threshold_days}d`} />
        <Stat label="Grace Period" value={`${pkg.grace_period_days}d`} />
        <Stat label="Emergency Contact" value={`@${pkg.emergency_github}`} mono />
      </div>

      {pkg.verdict_reason && (
        <div className="panel-raised">
          <span className="field-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Last AI Verdict</span>
          <p style={{ fontSize: '0.825rem', color: 'var(--body)', lineHeight: 1.6, margin: 0 }}>
            {pkg.verdict_reason}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.25rem', borderTop: '1px solid var(--line)' }}>
        {isOwner && (pkg.status === 'active' || pkg.status === 'flagged') && (
          <button className="btn-signal" onClick={onPing} disabled={txLoading}>
            {txLoading ? 'Sending…' : 'Ping — I\'m still maintaining this'}
          </button>
        )}
        {isOwner && pkg.status === 'active' && (
          <button className="btn-danger" onClick={onWithdraw} disabled={txLoading}>
            Withdraw protection
          </button>
        )}
        {!isOwner && canCheck && (
          <button className="btn-outline" onClick={onCheck} disabled={txLoading} style={{ borderColor: 'var(--warn)', color: 'var(--warn)' }}>
            {txLoading ? 'Checking…' : 'Flag for inactivity check (0.05 GEN)'}
          </button>
        )}
        {pkg.status === 'transferred' && (
          <p style={{ fontSize: '0.825rem', color: 'var(--critical)', margin: 0 }}>
            Inactivity confirmed. Emergency maintainer {shortenAddress(pkg.emergency_wallet)} is authorized to take over.
          </p>
        )}
        {pkg.status === 'withdrawn' && (
          <p style={{ fontSize: '0.825rem', color: 'var(--dim)', margin: 0 }}>
            This package is no longer under dead-man's-switch protection.
          </p>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="field-label" style={{ display: 'block', marginBottom: '0.25rem' }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ fontSize: '0.875rem', color: 'var(--bright)' }}>{value}</span>
    </div>
  )
}
