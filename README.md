# CRONOS — Maintainer Dead-Man's-Switch Registry

CRONOS is a GenLayer Intelligent Contract that protects open-source packages from maintainer abandonment. A maintainer registers a repository and a heartbeat threshold. If they stop pinging the contract, anyone can trigger a check — GenLayer fetches the maintainer's GitHub profile and repo commit activity, an LLM evaluates the evidence, and validators reach consensus. If confirmed inactive, the registry authorizes a pre-designated emergency maintainer to take over.

---

## Why this exists

Critical npm and PyPI packages get abandoned constantly. Two failure modes follow: the package rots with unpatched vulnerabilities, or its maintainer account gets hijacked and malicious code gets pushed to thousands of downstream projects — a real, recurring supply-chain attack pattern. CRONOS gives maintainers a way to pre-authorize a successor, verified onchain instead of trusted to a single person's memory or a stale email in a README.

## What CRONOS does NOT do

CRONOS does not call the npm or PyPI registry APIs to perform an ownership transfer itself. GenVM's web access (`gl.nondet.web.get`, `gl.nondet.web.render`) is read-only by design — it cannot hold or use the authenticated write credentials an actual npm transfer requires, and those credentials should never live in a smart contract regardless. CRONOS is the trust-minimized **source of truth**: `is_transfer_authorized(github_user)` returns `true` once the AI verdict confirms inactivity, and a separately-secured off-chain agent (a GitHub Action holding org-owner secrets, for example) watches that flag and performs the actual handoff.

---

## A note on how this contract was built

This contract was rewritten twice during development. The first version used API patterns straight from public GenLayer documentation examples and failed `genvm-lint` with errors about `nondet` calls not being reachable from an equivalence principle block, plus an import error for `genlayer.std`. Documentation examples and the SDK changelog describe **multiple, sometimes conflicting API generations** (e.g. `gl.eq_principle_strict_eq(fn)` in one version vs `gl.eq_principle.strict_eq(fn)` in another; `gl.get_webpage()` vs `gl.nondet.web.get()`).

To get something that actually passes lint and deploys, this version was rewritten against two real, working contracts already running in this environment (a wallet dead-man's-switch contract and a weather prediction market). Every API call below — `DynArray[Package]` with `gl.storage.inmem_allocate`, `gl.eq_principle.prompt_comparative(fn, principle_string)` with a positional principle string, `gl.nondet.web.get(url).body.decode("utf-8")`, the `@gl.evm.contract_interface` proxy pattern for `emit_transfer`, and `gl.message.timestamp` guarded with `hasattr` — is copied from code confirmed to run, not from a documentation snippet alone.

**If `genvm-lint` still flags something**, it's most likely a version mismatch between the `Depends` hash in the header and your local GenVM build. Run `genvm-lint check contracts/cronos_registry.py` first and adjust the `Depends` string at the top of the file to match a hash known to work in your Studio/local environment before changing the contract logic.

---

## Architecture

### Storage model

A single `DynArray[Package]` holds every registered package as a storage dataclass. Lookups by GitHub username scan the array (`_find_index`) rather than using a `TreeMap[str, ...]` keyed registry — this mirrors the pattern in the reference weather-market contract and avoids storage-generic allocation edge cases that are easy to get wrong with `TreeMap` of complex value types.

### State machine

```
active → flagged → transferred
            ↑
   maintainer pings within grace period → active
```

`withdrawn` is a terminal state reachable only from `active`, for maintainers who no longer want protection.

### Check flow (non-deterministic block)

1. `check_activity(github_user)` is called with `CHECK_FEE` (0.05 GEN) attached.
2. Contract verifies the inactivity threshold has actually elapsed.
3. State flips to `"flagged"` immediately — deterministic, before any AI call.
4. Inside `evaluate_inactivity()` (the leader/validator function passed to `gl.eq_principle.prompt_comparative`):
   - Fetches the maintainer's GitHub profile page
   - Fetches the specific repository's commits page
   - Asks an LLM to return a JSON verdict: `INACTIVE` or `ACTIVE`, with confidence and evidence
5. Validators independently repeat steps 4 and must agree on the `verdict` field for consensus to pass.
6. If `INACTIVE`: status becomes `"transferred"`, the checker who flagged correctly receives a 0.03 GEN reward.
7. If `ACTIVE`: status returns to `"active"`, the checker forfeits their fee as a false-flag penalty.

### Why a specific repo's commits page, not just the GitHub profile

A maintainer can be active on GitHub generally — commenting on unrelated repos, opening issues elsewhere — while having fully abandoned the one package that matters. The prompt explicitly instructs the model to treat that case as `INACTIVE` for the registered repository, which is the actual risk CRONOS is meant to catch.

---

## Setup

### Prerequisites

- GenLayer Studio account or local GLSim, for Studionet
- MetaMask or compatible wallet for Bradbury
- GEN testnet tokens

### Deploy

Paste `contracts/cronos_registry.py` into [GenLayer Studio](https://studio.genlayer.com) and deploy. Run `genvm-lint check contracts/cronos_registry.py` locally first if you have the linter installed — adjust the `Depends` hash in the header if your environment uses a different SDK build.

**Faucet:** Studionet has a built-in 💧 button in the account selector. Bradbury: https://testnet-faucet.genlayer.foundation

### Configure the frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local` with your deployed contract address and chosen network (`studionet` or `bradbury`).

### Run

```bash
npm install
npm run dev
```

---

## Networks

| Network | RPC | Chain ID | Explorer |
|---|---|---|---|
| Studionet | https://studio.genlayer.com/api | 61999 | explorer-studio.genlayer.com |
| Bradbury | https://rpc-bradbury.genlayer.com | 4221 | explorer-bradbury.genlayer.com |

---

## Contract API

| Function | Type | Description |
|---|---|---|
| `register(github_user, repo_owner, repo_name, package_url, emergency_wallet, emergency_github, threshold_days, grace_period_days)` | write | Register a package. Caller becomes the maintainer. Threshold minimum 60 days. |
| `ping(github_user)` | write | Reset the inactivity timer. Also clears a `flagged` state and refunds the checker's fee. |
| `check_activity(github_user)` | write payable | Trigger an inactivity check. Requires 0.05 GEN. Runs AI evaluation. |
| `update_emergency_maintainer(github_user, new_wallet, new_github)` | write | Change the designated successor. Only while `active`. |
| `update_threshold(github_user, new_threshold_days)` | write | Change the inactivity window. Only while `active`. |
| `withdraw(github_user)` | write | Permanently remove a package from protection. |
| `get_package(github_user)` | view | Full package state as a dict. |
| `get_all_packages()` | view | Lightweight list of every registered package. |
| `get_days_inactive(github_user)` | view | Days since last ping. |
| `is_checkable(github_user)` | view | True if the threshold has passed and a check can be triggered. |
| `is_transfer_authorized(github_user)` | view | True once an `INACTIVE` verdict has been confirmed — the signal off-chain agents watch for. |
| `get_package_count()` | view | Total packages ever registered. |

---

## Frontend pages

| Route | Description |
|---|---|
| `/` | Landing page — how it works, state machine overview |
| `/register` | Register a new package under protection |
| `/dashboard` | Maintainer view — ping, update emergency contact, withdraw |
| `/directory` | Public directory of all registered packages, trigger a check |

---

## Roadmap

- [ ] GitHub Action template that watches `is_transfer_authorized` and opens a PR transferring `CODEOWNERS`
- [ ] npm/PyPI ownership-transfer runbook for the emergency maintainer to follow manually
- [ ] Multi-signal scoring (issue response time, PR merge cadence) beyond raw commit dates
- [ ] Org-level registration for packages with multiple existing maintainers

---

## License

MIT
