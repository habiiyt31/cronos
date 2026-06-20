import { createClient } from 'genlayer-js'
import { studionet, testnetBradbury } from 'genlayer-js/chains'

export const NETWORKS = {
  studionet: {
    name: 'Studionet',
    rpc: 'https://studio.genlayer.com/api',
    chainId: 61999,
    explorer: 'https://explorer-studio.genlayer.com',
    connectName: 'studionet' as const,
  },
  bradbury: {
    name: 'Bradbury',
    rpc: 'https://rpc-bradbury.genlayer.com',
    chainId: 4221,
    explorer: 'https://explorer-bradbury.genlayer.com',
    connectName: 'testnetBradbury' as const,
  },
} as const

export type NetworkKey = keyof typeof NETWORKS

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000'

export const ACTIVE_NETWORK: NetworkKey =
  (process.env.NEXT_PUBLIC_NETWORK as NetworkKey) || 'studionet'

function chainFor(network: NetworkKey) {
  return network === 'studionet' ? studionet : testnetBradbury
}

/**
 * Read-only client. No account, no provider — just talks to the GenLayer RPC.
 * Safe to call on every page load, no wallet required.
 */
export function getReadClient(network: NetworkKey = ACTIVE_NETWORK) {
  return createClient({ chain: chainFor(network) })
}

/**
 * Write client, signed through the injected wallet (MetaMask).
 *
 * Two things are required for this to actually reach the network instead of
 * failing with "No account set" or a silent RPC fetch error:
 *  1. `account` — the connected wallet address, so the SDK knows who signs.
 *  2. `provider` — the injected EIP-1193 provider (window.ethereum), so the
 *     SDK can actually ask the wallet to sign rather than guessing a default
 *     RPC transport.
 *
 * Before the first write, call `await client.connect(NETWORKS[network].connectName)`
 * to make sure MetaMask is actually pointed at GenLayer's chain — otherwise
 * a wallet sitting on a different chain can cause writes to fail with
 * RPC-shaped errors that look unrelated to "wrong network."
 */
export function getWriteClient(network: NetworkKey, account: string) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet provider found. Install MetaMask or a compatible wallet.')
  }
  return createClient({
    chain: chainFor(network),
    account: account as `0x${string}`,
    provider: window.ethereum,
  })
}

export async function ensureWalletOnNetwork(client: ReturnType<typeof getWriteClient>, network: NetworkKey) {
  try {
    await client.connect(NETWORKS[network].connectName)
  } catch {
    // Some wallets/SDK versions may not support connect() the same way —
    // fail open here and let the actual writeContract call surface a
    // clearer chain-mismatch error if there is one.
  }
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

