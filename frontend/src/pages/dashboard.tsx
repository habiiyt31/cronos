import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import PackageCard from '@/components/PackageCard'
import TxToast from '@/components/TxToast'
import { useWallet, useRegistry } from '@/hooks/useRegistry'
import { getReadClient, CONTRACT_ADDRESS, ACTIVE_NETWORK } from '@/lib/config'

export default function DashboardPage() {
  const { address, connect, connecting } = useWallet()
  const {
    pkg, allPackages, loading, txLoading, error, txHash,
    fetchAllPackages, fetchPackage, ping, withdraw,
  } = useRegistry(address)

  const [githubUser, setGithubUser] = useState('')
  const [searched, setSearched] = useState(false)
  const [daysInactive, setDaysInactive] = useState(0)
  const [toastHash, setToastHash] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)

  useEffect(() => { if (txHash) setToastHash(txHash) }, [txHash])
  useEffect(() => { if (error) setToastError(error) }, [error])
  useEffect(() => { fetchAllPackages() }, [fetchAllPackages])

  // When wallet connects, find their owned package automatically
  useEffect(() => {
    if (address && allPackages.length > 0) {
      const mine = allPackages.find(p => p.owner_wallet.toLowerCase() === address.toLowerCase())
      if (mine) {
        setGithubUser(mine.github_user)
        handleLookup(mine.github_user)
      }
    }
  }, [address, allPackages])

  async function handleLookup(user: string) {
    if (!user.trim()) return
    setSearched(true)
    const result = await fetchPackage(user.trim().toLowerCase())
    if (result?.found) {
      const client = getReadClient(ACTIVE_NETWORK)
      try {
        const days = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: 'get_days_inactive',
          args: [user.trim().toLowerCase()],
        })
        setDaysInactive(Number(days))
      } catch {
        setDaysInactive(0)
      }
    }
  }

  async function handlePing() {
    if (!pkg) return
    try {
      await ping(pkg.github_user)
      await handleLookup(pkg.github_user)
    } catch {}
  }

  async function handleWithdraw() {
    if (!pkg) return
    if (!confirm('This permanently removes dead-man\'s-switch protection. Continue?')) return
    try {
      await withdraw(pkg.github_user)
      await handleLookup(pkg.github_user)
    } catch {}
  }

  const isOwner = pkg?.owner_wallet.toLowerCase() === address?.toLowerCase()

  if (!address) {
    return (
      <>
        <Head><title>CRONOS · Dashboard</title></Head>
        <Navbar />
        <div style={{ maxWidth: 460, margin: '6rem auto', padding: '0 1.25rem', textAlign: 'center' }}>
          <div className="panel">
            <p className="mono" style={{ fontSize: '0.78rem', color: 'var(--signal)', marginBottom: '0.75rem' }}>wallet_required</p>
            <h2 style={{ fontSize: '1.05rem', color: 'var(--bright)', marginBottom: '0.75rem' }}>Connect your wallet</h2>
            <p style={{ color: 'var(--dim)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Connect to manage your registered packages.
            </p>
            <button className="btn-signal" onClick={connect} disabled={connecting} style={{ width: '100%' }}>
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head><title>CRONOS · Dashboard</title></Head>
      <Navbar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>

        <h1 style={{ fontSize: '1.2rem', color: 'var(--bright)', marginBottom: '0.4rem' }}>Maintainer Dashboard</h1>
        <p style={{ color: 'var(--dim)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          Look up a registration by GitHub username, or it loads automatically if your wallet owns one.
        </p>

        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '2rem' }}>
          <input
            className="field-input"
            placeholder="GitHub username"
            value={githubUser}
            onChange={e => setGithubUser(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup(githubUser)}
          />
          <button className="btn-signal" onClick={() => handleLookup(githubUser)} disabled={loading || !githubUser.trim()}>
            {loading ? '…' : 'Look up'}
          </button>
        </div>

        {loading && (
          <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <p style={{ color: 'var(--dim)', fontSize: '0.85rem' }}>Loading…</p>
          </div>
        )}

        {!loading && searched && !pkg?.found && (
          <div className="panel" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <p style={{ color: 'var(--bright)', fontWeight: 600, marginBottom: '0.5rem' }}>No registration found</p>
            <p style={{ color: 'var(--dim)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              This GitHub username has no active package registration.
            </p>
            <Link href="/register" className="btn-signal">Register a package</Link>
          </div>
        )}

        {!loading && pkg?.found && (
          <PackageCard
            pkg={pkg}
            daysInactive={daysInactive}
            isOwner={isOwner}
            txLoading={txLoading}
            onPing={handlePing}
            onWithdraw={handleWithdraw}
          />
        )}
      </div>
      <TxToast hash={toastHash} error={toastError} onDismiss={() => { setToastHash(null); setToastError(null) }} />
    </>
  )
}
