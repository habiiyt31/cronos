import Head from 'next/head'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import UptimeStrip from '@/components/UptimeStrip'
import { useRegistryStats } from '@/hooks/useRegistry'

export default function Home() {
  const { count } = useRegistryStats()

  return (
    <>
      <Head><title>CRONOS</title></Head>
      <Navbar />

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '0 1.25rem' }}>

        {/* Hero */}
        <section style={{ paddingTop: '4.5rem', paddingBottom: '3rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
            <div>
              <span className="mono" style={{
                fontSize: '0.74rem', color: 'var(--signal)', letterSpacing: '0.08em',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.25rem',
              }}>
                <span className="pip-live" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--signal)', display: 'inline-block' }} />
                MONITORING OPEN SOURCE MAINTAINERS
              </span>

              <h1 className="mono" style={{
                fontSize: 'clamp(1.9rem, 4.5vw, 2.9rem)', fontWeight: 600, color: 'var(--bright)',
                lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '1.25rem',
              }}>
                Every critical package
                <br />needs a successor.
              </h1>

              <p style={{ fontSize: '1rem', color: 'var(--body)', maxWidth: 460, lineHeight: 1.75, marginBottom: '2rem' }}>
                Register a heartbeat for your repo. If you go silent past your threshold,
                GenLayer checks your GitHub activity and authorizes a pre-designated
                successor — onchain, verifiable, no single point of failure.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/register" className="btn-signal" style={{ fontSize: '0.9rem', padding: '0.7rem 1.5rem' }}>
                  Register your package
                </Link>
                <Link href="/directory" className="btn-outline" style={{ fontSize: '0.9rem', padding: '0.7rem 1.5rem' }}>
                  View directory
                </Link>
              </div>

              {count > 0 && (
                <p className="mono" style={{ marginTop: '1.75rem', fontSize: '0.78rem', color: 'var(--dim)' }}>
                  {count} package{count !== 1 ? 's' : ''} under protection
                </p>
              )}
            </div>

            {/* Hero panel: live status mock */}
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--bright)', fontWeight: 600 }}>
                  left-pad/core
                </span>
                <span className="mono badge-active" style={{ fontSize: '0.68rem', padding: '0.2rem 0.55rem', borderRadius: 4 }}>
                  ACTIVE
                </span>
              </div>
              <UptimeStrip thresholdDays={90} daysInactive={34} status="active" />
              <p style={{ fontSize: '0.78rem', color: 'var(--dim)', marginTop: '1rem', lineHeight: 1.6 }}>
                34 days since last ping · 56 days until threshold
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ paddingBottom: '4rem' }}>
          <p className="field-label" style={{ textAlign: 'center', marginBottom: '2rem' }}>How it works</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {STEPS.map((s, i) => (
              <div key={i} className="panel">
                <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--signal)' }}>{s.tag}</span>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--bright)', margin: '0.6rem 0 0.5rem' }}>{s.title}</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--dim)', lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* State machine */}
        <section style={{ paddingBottom: '4rem' }}>
          <p className="field-label" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>Registry state machine</p>
          <div className="panel" style={{ overflowX: 'auto' }}>
            <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', fontSize: '0.8rem' }}>
              <StateNode label="ACTIVE" color="var(--signal)" />
              <Arrow />
              <StateNode label="FLAGGED" color="var(--warn)" />
              <Arrow />
              <StateNode label="TRANSFERRED" color="var(--critical)" />
              <div style={{ width: '100%', textAlign: 'center', marginTop: '0.875rem', fontSize: '0.74rem', color: 'var(--dim)' }}>
                ↑ maintainer pings within grace period → back to ACTIVE
              </div>
            </div>
          </div>
        </section>

        {/* What it doesn't do */}
        <section style={{ paddingBottom: '5rem' }}>
          <p className="field-label" style={{ textAlign: 'center', marginBottom: '1.75rem' }}>Scope, honestly stated</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div className="panel">
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--signal)', marginBottom: '0.5rem' }}>What CRONOS does</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--dim)', lineHeight: 1.65, margin: 0 }}>
                Tracks a maintainer&apos;s heartbeat, fetches GitHub activity directly inside
                the contract, reaches AI consensus on inactivity, and emits a verifiable
                <span className="mono"> is_transfer_authorized </span> signal.
              </p>
            </div>
            <div className="panel">
              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--critical)', marginBottom: '0.5rem' }}>What it doesn&apos;t</h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--dim)', lineHeight: 1.65, margin: 0 }}>
                It never touches the npm or PyPI registry directly. Actual ownership
                transfer needs authenticated write credentials that should stay off-chain —
                CRONOS is the source of truth a separately-secured agent acts on.
              </p>
            </div>
          </div>
        </section>

      </main>

      <footer style={{ borderTop: '1px solid var(--line)', padding: '1.5rem 1.25rem', textAlign: 'center' }}>
        <p className="mono" style={{ fontSize: '0.72rem', color: 'var(--dim)', margin: 0 }}>
          CRONOS REGISTRY — Built on{' '}
          <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--signal)', textDecoration: 'none' }}>
            GenLayer
          </a>
          {' '}· Not audited · Use at your own risk
        </p>
      </footer>
    </>
  )
}

function StateNode({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ padding: '0.3rem 0.7rem', borderRadius: 4, background: `color-mix(in srgb, ${color} 14%, transparent)`, color, fontWeight: 600, fontSize: '0.76rem' }}>
      {label}
    </span>
  )
}

function Arrow() {
  return <span style={{ color: 'var(--line)' }}>→</span>
}

const STEPS = [
  { tag: '01', title: 'Register', desc: 'Set your GitHub username, repo, inactivity threshold (60 days minimum), and a designated emergency maintainer.' },
  { tag: '02', title: 'Ping', desc: 'Call ping() from your wallet at any interval shorter than your threshold. Resets the clock. Takes one transaction.' },
  { tag: '03', title: 'Flag', desc: 'If you go silent, anyone can flag your package for a check by paying a small anti-spam fee.' },
  { tag: '04', title: 'Verify', desc: 'GenLayer validators independently fetch your GitHub profile and repo commits, then reach AI consensus on a verdict.' },
]
