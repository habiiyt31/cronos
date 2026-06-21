import { useWallet } from '@/hooks/useRegistry'
import { shortenAddress, NETWORKS, ACTIVE_NETWORK } from '@/lib/config'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function Navbar() {
  const { address, connecting, connect, disconnect } = useWallet()
  const router = useRouter()
  const network = NETWORKS[ACTIVE_NETWORK]

  return (
    <nav style={{
      borderBottom: '1px solid var(--line)',
      background: 'rgba(13,17,23,0.9)',
      backdropFilter: 'blur(10px)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0.6rem 1.25rem 0' }}>

        {/* Row 1: logo + network + wallet — always one line, wraps only as a last resort */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '0.75rem', flexWrap: 'wrap', minHeight: 38,
        }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--signal)' }}>
              CRONOS
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--dim)', fontWeight: 500 }}>
              REGISTRY
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="mono" style={{
              fontSize: '0.68rem', padding: '0.2rem 0.55rem', borderRadius: 4,
              background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--signal)',
            }}>
              {network.name}
            </span>

            {address ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="mono" style={{
                  fontSize: '0.78rem', color: 'var(--bright)', padding: '0.35rem 0.7rem',
                  borderRadius: 4, background: 'var(--raised)', border: '1px solid var(--line)',
                }}>
                  {shortenAddress(address)}
                </span>
                <button className="btn-outline" style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem' }} onClick={disconnect}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="btn-signal" onClick={connect} disabled={connecting} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
                {connecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: nav links — own row, horizontally scrollable if it ever overflows */}
        <div style={{
          display: 'flex', gap: '0.2rem', alignItems: 'center',
          overflowX: 'auto', padding: '0.5rem 0', marginTop: '0.1rem',
        }}>
          {[
            { href: '/', label: 'Home' },
            { href: '/register', label: 'Register' },
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/directory', label: 'Directory' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.7rem',
                borderRadius: 4,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                color: router.pathname === href ? 'var(--bright)' : 'var(--dim)',
                background: router.pathname === href ? 'var(--raised)' : 'transparent',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
