import { useState } from 'react'

interface Props {
  onSubmit: (params: {
    githubUser: string
    repoOwner: string
    repoName: string
    packageUrl: string
    emergencyWallet: string
    emergencyGithub: string
    thresholdDays: number
    gracePeriodDays: number
  }) => Promise<void>
  loading: boolean
}

export default function RegisterForm({ onSubmit, loading }: Props) {
  const [githubUser, setGithubUser] = useState('')
  const [repoOwner, setRepoOwner] = useState('')
  const [repoName, setRepoName] = useState('')
  const [packageUrl, setPackageUrl] = useState('')
  const [emergencyWallet, setEmergencyWallet] = useState('')
  const [emergencyGithub, setEmergencyGithub] = useState('')
  const [thresholdDays, setThresholdDays] = useState(90)
  const [gracePeriodDays, setGracePeriodDays] = useState(14)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!githubUser.trim()) e.githubUser = 'Required'
    if (!repoOwner.trim()) e.repoOwner = 'Required'
    if (!repoName.trim()) e.repoName = 'Required'
    if (!emergencyWallet.startsWith('0x') || emergencyWallet.length !== 42) {
      e.emergencyWallet = 'Enter a valid 0x address'
    }
    if (!emergencyGithub.trim()) e.emergencyGithub = 'Required'
    if (thresholdDays < 60) e.thresholdDays = 'Minimum 60 days'
    if (gracePeriodDays < 1) e.gracePeriodDays = 'Minimum 1 day'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    await onSubmit({
      githubUser: githubUser.replace('@', '').trim(),
      repoOwner: repoOwner.trim(),
      repoName: repoName.trim(),
      packageUrl: packageUrl.trim(),
      emergencyWallet: emergencyWallet.trim(),
      emergencyGithub: emergencyGithub.replace('@', '').trim(),
      thresholdDays,
      gracePeriodDays,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      <Field label="Your GitHub Username" error={errors.githubUser}>
        <input className="field-input" placeholder="torvalds" value={githubUser} onChange={e => setGithubUser(e.target.value)} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        <Field label="Repo Owner / Org" error={errors.repoOwner}>
          <input className="field-input" placeholder="torvalds" value={repoOwner} onChange={e => setRepoOwner(e.target.value)} />
        </Field>
        <Field label="Repo Name" error={errors.repoName}>
          <input className="field-input" placeholder="linux" value={repoName} onChange={e => setRepoName(e.target.value)} />
        </Field>
      </div>

      <Field label="Package URL (optional)" hint="npm, PyPI, crates.io, or any registry listing.">
        <input className="field-input" placeholder="https://npmjs.com/package/..." value={packageUrl} onChange={e => setPackageUrl(e.target.value)} />
      </Field>

      <div className="panel-raised">
        <p className="field-label" style={{ marginBottom: '0.875rem' }}>Emergency Maintainer</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <Field label="Wallet Address" error={errors.emergencyWallet} hint="Authorized to take over if you go inactive.">
            <input className="field-input" placeholder="0x..." value={emergencyWallet} onChange={e => setEmergencyWallet(e.target.value)} />
          </Field>
          <Field label="GitHub Username" error={errors.emergencyGithub}>
            <input className="field-input" placeholder="successor-handle" value={emergencyGithub} onChange={e => setEmergencyGithub(e.target.value.replace('@', ''))} />
          </Field>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        <Field label="Inactivity Threshold (days)" error={errors.thresholdDays} hint="Minimum 60 days.">
          <input className="field-input" type="number" min="60" value={thresholdDays} onChange={e => setThresholdDays(Number(e.target.value))} />
        </Field>
        <Field label="Grace Period (days)" error={errors.gracePeriodDays} hint="Time to respond after a flag.">
          <input className="field-input" type="number" min="1" value={gracePeriodDays} onChange={e => setGracePeriodDays(Number(e.target.value))} />
        </Field>
      </div>

      <div className="panel-raised" style={{ fontSize: '0.825rem', color: 'var(--dim)', lineHeight: 1.7 }}>
        If <strong style={{ color: 'var(--bright)' }}>{githubUser || 'you'}</strong> go silent on{' '}
        <strong style={{ color: 'var(--bright)' }}>{repoOwner || '…'}/{repoName || '…'}</strong> for{' '}
        <strong style={{ color: 'var(--bright)' }}>{thresholdDays} days</strong>, anyone can flag it for a check.
        GenLayer AI reviews your GitHub activity. If confirmed inactive,{' '}
        <strong style={{ color: 'var(--signal)' }}>@{emergencyGithub || '…'}</strong> is authorized to take over.
        You have <strong style={{ color: 'var(--bright)' }}>{gracePeriodDays} days</strong> to respond to any flag.
      </div>

      <button className="btn-signal" onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}>
        {loading ? 'Registering…' : 'Register Package'}
      </button>
    </div>
  )
}

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label className="field-label">{label}</label>
      {children}
      {hint && !error && <span style={{ fontSize: '0.74rem', color: 'var(--dim)' }}>{hint}</span>}
      {error && <span style={{ fontSize: '0.74rem', color: 'var(--critical)' }}>{error}</span>}
    </div>
  )
}
