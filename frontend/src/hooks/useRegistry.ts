import { useState, useCallback, useEffect } from 'react'
import { getReadClient, getWriteClient, ensureWalletOnNetwork, CONTRACT_ADDRESS, ACTIVE_NETWORK, CHECK_FEE } from '@/lib/config'

export interface PackageData {
  found: boolean
  github_user: string
  repo_owner: string
  repo_name: string
  package_url: string
  owner_wallet: string
  emergency_wallet: string
  emergency_github: string
  threshold_days: number
  grace_period_days: number
  last_ping: number
  registered_at: number
  status: string
  flagged_at: number
  flagged_by: string
  verdict_reason: string
  last_evidence: string
}

export interface PackageSummary {
  index: number
  github_user: string
  repo_owner: string
  repo_name: string
  status: string
  threshold_days: number
  owner_wallet: string
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('No wallet detected. Install MetaMask or a compatible wallet.')
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts[0]) setAddress(accounts[0])
    } catch (e: any) {
      setError(e?.message || 'Connection rejected')
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => setAddress(null), [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
      if (accounts[0]) setAddress(accounts[0])
    }).catch(() => {})
    const handler = (accounts: string[]) => setAddress(accounts[0] || null)
    window.ethereum.on('accountsChanged', handler)
    return () => window.ethereum?.removeListener('accountsChanged', handler)
  }, [])

  return { address, connecting, error, connect, disconnect }
}

export function useRegistry(connectedAddress?: string | null) {
  const [pkg, setPkg] = useState<PackageData | null>(null)
  const [allPackages, setAllPackages] = useState<PackageSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [txLoading, setTxLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Read-only client — no account needed for views.
  const readClient = getReadClient(ACTIVE_NETWORK)

  // Write client — must carry the connected wallet address and the
  // injected provider so genlayer-js knows to delegate signing to MetaMask,
  // and must be switched onto GenLayer's chain before sending.
  async function requireWriteClient() {
    if (!connectedAddress) {
      throw new Error('Connect your wallet before sending a transaction.')
    }
    const client = getWriteClient(ACTIVE_NETWORK, connectedAddress)
    await ensureWalletOnNetwork(client, ACTIVE_NETWORK)
    return client
  }

  const fetchPackage = useCallback(async (githubUser: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_package',
        args: [githubUser],
      })
      setPkg(result as PackageData)
      return result as PackageData
    } catch (e: any) {
      setError(e?.message || 'Failed to load package')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAllPackages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_all_packages',
        args: [],
      })
      setAllPackages(result as PackageSummary[])
    } catch (e: any) {
      setError(e?.message || 'Failed to load directory')
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (params: {
    githubUser: string
    repoOwner: string
    repoName: string
    packageUrl: string
    emergencyWallet: string
    emergencyGithub: string
    thresholdDays: number
    gracePeriodDays: number
  }) => {
    setTxLoading(true)
    setError(null)
    setTxHash(null)
    try {
      const client = await requireWriteClient()
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'register',
        args: [
          params.githubUser,
          params.repoOwner,
          params.repoName,
          params.packageUrl,
          params.emergencyWallet,
          params.emergencyGithub,
          params.thresholdDays,
          params.gracePeriodDays,
        ],
      })
      setTxHash(hash as string)
      return hash
    } catch (e: any) {
      setError(e?.message || 'Registration failed')
      throw e
    } finally {
      setTxLoading(false)
    }
  }, [connectedAddress])

  const ping = useCallback(async (githubUser: string) => {
    setTxLoading(true)
    setError(null)
    setTxHash(null)
    try {
      const client = await requireWriteClient()
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'ping',
        args: [githubUser],
      })
      setTxHash(hash as string)
      return hash
    } catch (e: any) {
      setError(e?.message || 'Ping failed')
      throw e
    } finally {
      setTxLoading(false)
    }
  }, [connectedAddress])

  const checkActivity = useCallback(async (githubUser: string) => {
    setTxLoading(true)
    setError(null)
    setTxHash(null)
    try {
      const client = await requireWriteClient()
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'check_activity',
        args: [githubUser],
        value: CHECK_FEE,
      })
      setTxHash(hash as string)
      return hash
    } catch (e: any) {
      setError(e?.message || 'Check failed')
      throw e
    } finally {
      setTxLoading(false)
    }
  }, [connectedAddress])

  const withdraw = useCallback(async (githubUser: string) => {
    setTxLoading(true)
    setError(null)
    setTxHash(null)
    try {
      const client = await requireWriteClient()
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'withdraw',
        args: [githubUser],
      })
      setTxHash(hash as string)
      return hash
    } catch (e: any) {
      setError(e?.message || 'Withdraw failed')
      throw e
    } finally {
      setTxLoading(false)
    }
  }, [connectedAddress])

  const updateEmergencyMaintainer = useCallback(async (
    githubUser: string, newWallet: string, newGithub: string
  ) => {
    setTxLoading(true)
    setError(null)
    setTxHash(null)
    try {
      const client = await requireWriteClient()
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'update_emergency_maintainer',
        args: [githubUser, newWallet, newGithub],
      })
      setTxHash(hash as string)
      return hash
    } catch (e: any) {
      setError(e?.message || 'Update failed')
      throw e
    } finally {
      setTxLoading(false)
    }
  }, [connectedAddress])

  const updateThreshold = useCallback(async (githubUser: string, newThresholdDays: number) => {
    setTxLoading(true)
    setError(null)
    setTxHash(null)
    try {
      const client = await requireWriteClient()
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'update_threshold',
        args: [githubUser, newThresholdDays],
      })
      setTxHash(hash as string)
      return hash
    } catch (e: any) {
      setError(e?.message || 'Update failed')
      throw e
    } finally {
      setTxLoading(false)
    }
  }, [connectedAddress])

  return {
    pkg, allPackages, loading, txLoading, error, txHash,
    fetchPackage, fetchAllPackages, register, ping,
    checkActivity, withdraw, updateEmergencyMaintainer, updateThreshold,
  }
}

export function useRegistryStats() {
  const [count, setCount] = useState<number>(0)
  const client = getReadClient(ACTIVE_NETWORK)

  const refresh = useCallback(async () => {
    try {
      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_package_count',
        args: [],
      })
      setCount(Number(result))
    } catch {
      // contract may not be deployed yet
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { count, refresh }
}
