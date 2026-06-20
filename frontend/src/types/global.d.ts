// Global ambient type declarations for this project.
//
// TypeScript's built-in `Window` type has no knowledge of `ethereum` —
// that property is injected at runtime by MetaMask or any other
// EIP-1193-compatible wallet extension, not part of the DOM spec.
// Without this declaration, `next build`'s strict type checking fails
// with "Property 'ethereum' does not exist on type 'Window'", even
// though `next dev` lets it through.

interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>
  on: (event: string, handler: (...args: any[]) => void) => void
  removeListener: (event: string, handler: (...args: any[]) => void) => void
  isMetaMask?: boolean
}

declare global {
  interface Window {
    ethereum?: EIP1193Provider
  }
}

export {}
