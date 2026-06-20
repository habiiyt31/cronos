import { useEffect, useState } from 'react'
import Head from 'next/head'
import Navbar from '@/components/Navbar'
import PackageCard from '@/components/PackageCard'
import TxToast from '@/components/TxToast'
import { useWallet, useRegistry } from '@/hooks/useRegistry'
import { getClient, CONTRACT_ADDRESS, ACTIVE_NETWORK, STATUS_META } from '@/lib/config'

export default function DirectoryPage() {
  const { address } = useWallet()
  const {
    pkg, allPackages, loading, txLoading, error, txHash,
    fetchAllPackages, fetchPackage, checkActivity,
  } = useRegistry()

  const [selected, setSelected] = useState<string | null>(null)
  const [daysInactive, setDaysInactive] = useState(0)
  const [filter, setFilter] = useState<'all' | 'active' | 'flagged' | 'transferred'>('all')
  const [toastHash, setToastHash] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)

  useEffect(() => { fetchAllPackages() }, [fetchAllPackages])
  useEffect(() => { if (txHash) setToastHash(txHash) }, [txHash])
  useEffect(() => { if (error) setToastError(error) }, [error])

  async function openPackage(githubUser: string) {
    setSelected(githubUser)
    const result = await fetchPackage(githubUser)
    if (result?.found) {
      const client = getClient(ACTIVE_NETWORK)
      try {
        const days = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_days_inactive',
          args: [githubUser],
        })
        setDaysInactive(Number(days))
      } catch {
        setDaysInactive(0)
      }
    }
  }

  async function handleCheck() {
    if (!pkg) return
    if (!confirm("Flagging requires 0.05 GEN. You'll get 0.03 GEN back if the flag is confirmed correct. Continue?")) return
    try {
      await checkActivity(pkg.github_user)
      await openPackage(pkg.github_user)
      await fetchAllPackages()
    } catch {}
  }

  const filtered = allPackages.filter(p => filter === 'all' || p.status === filter)
  const isOwner = pkg?.owner_wallet.toLowerCase() === address?.toLowerCase()

  return (
    <>
      <Head><title>Directory — CRONOS</title></Head>
      <Navbar />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>

        <h1 style={{ fontSize: '1.2rem', color: 'var(--bright)', marginBottom: '0.4rem' }}>Package Directory</h1>
        <p style={{ color: 'var(--dim)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
          Every package registered under dead-man&apos;s-switch protection. Anyone can flag a stale one for a check.
        </p>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['all', 'active', 'flagged', 'transferred'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="mono"
              style={{
                fontSize: '0.74rem', padding: '0.35rem 0.75rem', borderRadius: 4,
                border: `1px solid ${filter === f ? 'var(--signal)' : 'var(--line)'}`,
                background: filter === f ? 'var(--signal-dim)' : 'transparent',
                color: filter === f ? 'var(--signal)' : 'var(--dim)',
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Selected package detail */}
        {selected && pkg?.found && (
          <div style={{ marginBottom: '2rem' }}>
            <PackageCard
              pkg={pkg}
              daysInactive={daysInactive}
              isOwner={isOwner}
              txLoading={txLoading}
              onCheck={handleCheck}
            />
          </div>
        )}

        {/* List */}
        {loading && allPackages.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <p style={{ color: 'var(--dim)', fontSize: '0.85rem' }}>Loading directory…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <p style={{ color: 'var(--dim)', fontSize: '0.85rem' }}>No packages match this filter.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filtered.map(p => {
              const meta = STATUS_META[p.status] || STATUS_META.withdrawn
              return (
                <button
                  key={p.index}
                  onClick={() => openPackage(p.github_user)}
                  className="panel-raised"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
                    background: selected === p.github_user ? 'var(--line)' : 'var(--raised)',
                  }}
                >
                  <div>
                    <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--bright)', fontWeight: 600 }}>
                      {p.repo_owner}/{p.repo_name}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--dim)', marginLeft: '0.6rem' }}>
                      @{p.github_user}
                    </span>
                  </div>
                  <span className={`mono ${meta.badgeClass}`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem', borderRadius: 4, fontWeight: 600 }}>
                    {meta.label.toUpperCase()}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      <TxToast hash={toastHash} error={toastError} onDismiss={() => { setToastHash(null); setToastError(null) }} />
    </>
  )
}
