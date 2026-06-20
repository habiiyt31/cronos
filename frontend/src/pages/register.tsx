import { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Navbar from '@/components/Navbar'
import RegisterForm from '@/components/RegisterForm'
import TxToast from '@/components/TxToast'
import { useWallet, useRegistry } from '@/hooks/useRegistry'

export default function RegisterPage() {
  const router = useRouter()
  const { address, connect, connecting } = useWallet()
  const { txLoading, error, txHash, register } = useRegistry()
  const [toastHash, setToastHash] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => { if (txHash) setToastHash(txHash) }, [txHash])
  useEffect(() => { if (error) setToastError(error) }, [error])

  async function handleSubmit(params: Parameters<typeof register>[0]) {
    try {
      await register(params)
      setDone(params.githubUser)
    } catch {}
  }

  if (!address) {
    return (
      <>
        <Head><title>Register — CRONOS</title></Head>
        <Navbar />
        <div style={{ maxWidth: 460, margin: '6rem auto', padding: '0 1.25rem', textAlign: 'center' }}>
          <div className="panel">
            <p className="mono" style={{ fontSize: '0.78rem', color: 'var(--signal)', marginBottom: '0.75rem' }}>wallet_required</p>
            <h2 style={{ fontSize: '1.05rem', color: 'var(--bright)', marginBottom: '0.75rem' }}>Connect your wallet</h2>
            <p style={{ color: 'var(--dim)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.65 }}>
              Connect to register a package. Your wallet becomes the maintainer of record.
            </p>
            <button className="btn-signal" onClick={connect} disabled={connecting} style={{ width: '100%' }}>
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </>
    )
  }

  if (done) {
    return (
      <>
        <Head><title>Registered — CRONOS</title></Head>
        <Navbar />
        <div style={{ maxWidth: 460, margin: '6rem auto', padding: '0 1.25rem', textAlign: 'center' }}>
          <div className="panel">
            <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--signal)' }}>registration_complete</span>
            <h2 style={{ fontSize: '1.1rem', color: 'var(--bright)', margin: '0.75rem 0' }}>
              @{done} is now protected
            </h2>
            <p style={{ color: 'var(--dim)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.65 }}>
              Remember to ping the registry before your threshold runs out. Set a calendar reminder —
              CRONOS won&apos;t remind you, that part is still on you.
            </p>
            <button className="btn-signal" onClick={() => router.push('/dashboard')} style={{ width: '100%' }}>
              Go to dashboard
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head><title>Register — CRONOS</title></Head>
      <Navbar />
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>
        <h1 style={{ fontSize: '1.2rem', color: 'var(--bright)', marginBottom: '0.4rem' }}>Register a Package</h1>
        <p style={{ color: 'var(--dim)', fontSize: '0.85rem', marginBottom: '2rem' }}>
          One active registration per GitHub username.
        </p>
        <div className="panel">
          <RegisterForm onSubmit={handleSubmit} loading={txLoading} />
        </div>
      </div>
      <TxToast hash={toastHash} error={toastError} onDismiss={() => { setToastHash(null); setToastError(null) }} />
    </>
  )
}
