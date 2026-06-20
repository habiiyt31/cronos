<div align="center">

# CRONOS

**Maintainer Dead-Man's-Switch Registry, built on GenLayer**

A trustless successor protocol for abandoned open-source packages.

</div>

---

## What it does

Critical npm and PyPI packages get abandoned constantly. When that happens, one of two things follows: the package rots with unpatched vulnerabilities, or its maintainer account gets hijacked and malicious code gets pushed to thousands of downstream projects — a real, recurring supply-chain attack pattern.

CRONOS gives a maintainer a way to pre-authorize a successor, verified onchain — instead of trusted to a single person's memory or a stale email address in a README.

**The flow, in one sentence:** a maintainer registers a repo and a heartbeat threshold → if they go silent past that threshold, anyone can flag it for a check → GenLayer fetches the maintainer's GitHub activity, an LLM evaluates it, validators reach consensus → if confirmed inactive, the registry authorizes a pre-designated emergency maintainer to take over.

---

## What CRONOS does **not** do

CRONOS does not call the npm or PyPI registry APIs to perform an ownership transfer itself. GenVM's web access is read-only by design — it has no path to hold or use the authenticated write credentials an actual npm transfer requires, and those credentials should never live inside a smart contract regardless.

CRONOS is the **trust-minimized source of truth**: `is_transfer_authorized(github_user)` flips to `true` once the AI verdict confirms inactivity, and a separately-secured off-chain agent — a GitHub Action holding org-owner secrets, for example — watches that flag and performs the actual handoff.

---

## Live deployment

| | |
|---|---|
| **Network** | Studionet |
| **Frontend** | Deployed on Vercel |
| **Contract** | `cronos_registry.py` |

> Update this table with your own contract address and Vercel URL once deployed.

---

## Architecture

### State machine

```
            ┌──────────┐  threshold passed  ┌──────────┐  AI confirms inactive  ┌──────────────┐
            │  ACTIVE  │ ─────────────────▶ │ FLAGGED  │ ─────────────────────▶ │ TRANSFERRED  │
            └──────────┘                     └──────────┘                       └──────────────┘
                 ▲                                │
                 │      maintainer pings within   │
                 └────────── grace period ────────┘

            ACTIVE ──▶ WITHDRAWN   (maintainer opts out voluntarily, terminal)
```

`withdrawn` is reachable only from `active`, and is final — though re-registering the same `github_user` later resets that same slot back to `active` (see [Storage model](#storage-model)).

### Check flow (the non-deterministic block)

1. `check_activity(github_user)` is called with a `CHECK_FEE` of 0.05 GEN attached.
2. The contract verifies the inactivity threshold has actually elapsed.
3. Status flips to `flagged` immediately — deterministic, before any AI call runs.
4. Inside the leader/validator function passed to `gl.eq_principle.prompt_comparative`:
   - Fetches the maintainer's GitHub profile page
   - Fetches the specific repository's commits page
   - Asks an LLM for a verdict: `INACTIVE` or `ACTIVE`, with a confidence level and supporting evidence
5. Validators independently repeat step 4 and must agree on the `verdict` field for consensus to pass.
6. **`INACTIVE`** → status becomes `transferred`; the checker who flagged correctly receives a 0.03 GEN reward.
7. **`ACTIVE`** → status returns to `active`; the checker forfeits their fee as a false-flag penalty.

A maintainer can be active on GitHub generally — commenting on unrelated repos, opening issues elsewhere — while having fully abandoned the one package that matters. The prompt explicitly instructs the model to treat that case as `INACTIVE` *for the registered repository specifically*, which is the actual risk CRONOS exists to catch.

### Storage model

A single `DynArray[Package]` holds every registered package as a storage dataclass. Lookups by GitHub username scan the array (`_find_index`) rather than using a keyed `TreeMap` — this mirrors a pattern already confirmed to work elsewhere in this environment.

**One slot per `github_user`, enforced on write.** Re-registering a `github_user` that already has a `withdrawn` or `transferred` entry overwrites that same slot in place rather than appending a new one. This matters: `_find_index()` always returns the *first* match it finds, so if registration ever appended a second entry for the same username, the old stale entry would permanently shadow the new active one — every lookup would resolve to the wrong record. `register()` checks for this and reuses the existing slot instead.

---

## Setup

### Prerequisites

- GenLayer Studio account (for Studionet) or a MetaMask-compatible wallet (for Bradbury)
- GEN testnet tokens
- Node.js 18+

### 1. Deploy the contract

Paste `contracts/cronos_registry.py` into [GenLayer Studio](https://studio.genlayer.com) and deploy.

If you have `genvm-lint` installed locally, run it first:

```bash
genvm-lint check contracts/cronos_registry.py
```

If it flags the `Depends` header, that's almost always a version mismatch between the hash in the file and your local GenVM build — update the hash to match your environment before touching the contract logic.

**Faucet:** Studionet has a built-in 💧 button in the account selector. For Bradbury: https://testnet-faucet.genlayer.foundation

### 2. Configure the frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_NETWORK=studionet
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...   # your deployed contract address
```

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

The Next.js app lives in `frontend/`, not the repo root — set that as the **Root Directory** in Vercel's project settings, or the build won't find `package.json`.

Set the same two environment variables (`NEXT_PUBLIC_NETWORK`, `NEXT_PUBLIC_CONTRACT_ADDRESS`) under **Settings → Environment Variables** in the Vercel dashboard, for every environment (Production, Preview, Development).

---

## Networks

| Network | RPC | Chain ID | Explorer |
|---|---|---|---|
| Studionet | `https://studio.genlayer.com/api` | `61999` | explorer-studio.genlayer.com |
| Bradbury | `https://rpc-bradbury.genlayer.com` | `4221` | explorer-bradbury.genlayer.com |

---

## Contract API

### Writes

| Function | Payable | Description |
|---|---|---|
| `register(github_user, repo_owner, repo_name, package_url, emergency_wallet, emergency_github, threshold_days, grace_period_days)` | — | Register a package. Caller becomes the maintainer. Threshold minimum 60 days. Re-registering a withdrawn/transferred `github_user` resets that slot to active. |
| `ping(github_user)` | — | Reset the inactivity timer. Clears a `flagged` state and refunds the checker's fee if called in time. |
| `check_activity(github_user)` | ✅ 0.05 GEN | Trigger an inactivity check once the threshold has passed. Runs the full AI evaluation. |
| `update_emergency_maintainer(github_user, new_wallet, new_github)` | — | Change the designated successor. Only while `active`. |
| `update_threshold(github_user, new_threshold_days)` | — | Change the inactivity window. Only while `active`. Minimum 60 days. |
| `withdraw(github_user)` | — | Permanently remove a package from protection. |

### Views

| Function | Returns |
|---|---|
| `get_package(github_user)` | Full package state as a dict, or `{"found": false}`. |
| `get_all_packages()` | Lightweight summary list of every registered package. |
| `get_days_inactive(github_user)` | Days since last ping. |
| `is_checkable(github_user)` | `true` if the threshold has passed and a check can be triggered. |
| `is_transfer_authorized(github_user)` | `true` once an `INACTIVE` verdict has been confirmed — the signal off-chain agents should watch for. |
| `get_package_count()` | Total packages ever registered (including withdrawn/transferred). |
| `get_owner()` | Address that deployed the contract. |

---

## Frontend

| Route | Description |
|---|---|
| `/` | Landing page — how it works, state machine overview |
| `/register` | Register a new package under protection |
| `/dashboard` | Maintainer view — ping, withdraw, see your own package status |
| `/directory` | Public directory of all registered packages, filterable by status, trigger a check |

### Wallet integration notes

Write transactions are signed through the injected wallet (MetaMask). `createClient()` needs both an `account` (the connected address) and a `provider` (`window.ethereum`) — passing only the address is not enough; the SDK has no way to actually request a signature without the provider reference. The client also calls `client.connect(network)` once before the first write, to make sure the wallet is actually pointed at GenLayer's chain rather than whatever network it happened to be on.

`window.ethereum` is injected at runtime by the wallet extension and isn't part of any standard DOM type definition, so a global ambient declaration (`src/types/global.d.ts`) is required — without it, `next build` fails under strict type-checking even though `next dev` lets it through silently.

---

## Known limitations

- **No multi-maintainer support.** One `owner_wallet` per package. A repo with several active maintainers can only register under one of them.
- **GitHub-only signal.** Inactivity evaluation looks at the GitHub profile and the specific repo's commits page. It does not check issue response times, PR review cadence, or activity on mirrors hosted elsewhere.
- **No automatic transfer.** As covered above, this is by design, but worth restating: registering with CRONOS alone does not move npm/PyPI ownership. The emergency maintainer still has to act on the `is_transfer_authorized` signal manually, or via a separately built off-chain agent.

---

## Roadmap

- [ ] GitHub Action template that watches `is_transfer_authorized` and opens a PR transferring `CODEOWNERS`
- [ ] npm/PyPI ownership-transfer runbook for the emergency maintainer to follow manually
- [ ] Multi-signal scoring (issue response time, PR merge cadence) beyond raw commit dates
- [ ] Org-level registration for packages with multiple existing maintainers

---

## License

MIT
