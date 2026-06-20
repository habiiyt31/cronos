import { createClient, simulator, testnet } from 'genlayer-js'

export const NETWORKS = {
  studionet: {
    name: 'Studionet',
    rpc: 'https://studio.genlayer.com/api',
    chainId: 61999,
    explorer: 'https://explorer-studio.genlayer.com',
  },
  bradbury: {
    name: 'Bradbury',
    rpc: 'https://rpc-bradbury.genlayer.com',
    chainId: 4221,
    explorer: 'https://explorer-bradbury.genlayer.com',
  },
} as const

export type NetworkKey = keyof typeof NETWORKS

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000'

export const ACTIVE_NETWORK: NetworkKey =
  (process.env.NEXT_PUBLIC_NETWORK as NetworkKey) || 'studionet'

export function getClient(network: NetworkKey = ACTIVE_NETWORK) {
  if (network === 'studionet') {
    return createClient({ network: simulator })
  }
  const cfg = NETWORKS[network]
  return createClient({ network: testnet, endpoint: cfg.rpc })
}

export const CHECK_FEE = BigInt('50000000000000000')   // 0.05 GEN
export const GEN_DECIMALS = 18

export const STATUS_META: Record<string, { label: string; badgeClass: string; textClass: string }> = {
  active: { label: 'Active', badgeClass: 'badge-active', textClass: 'status-active' },
  flagged: { label: 'Flagged', badgeClass: 'badge-flagged', textClass: 'status-flagged' },
  transferred: { label: 'Transferred', badgeClass: 'badge-transferred', textClass: 'status-transferred' },
  withdrawn: { label: 'Withdrawn', badgeClass: 'badge-withdrawn', textClass: 'status-withdrawn' },
}

export function formatGEN(wei: bigint | number | string): string {
  const n = typeof wei === 'bigint' ? wei : BigInt(wei)
  const whole = n / BigInt(10 ** GEN_DECIMALS)
  const frac = n % BigInt(10 ** GEN_DECIMALS)
  const fracStr = frac.toString().padStart(GEN_DECIMALS, '0').slice(0, 3)
  return `${whole}.${fracStr} GEN`
}

export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function daysAgoLabel(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}
