# TruthLock — On-Chain Fact Checker

Submit any claim — with or without a source URL. A GenLayer Intelligent Contract fetches live web data when a source is given, cross-references multiple sources via LLM reasoning, and stores a permanent consensus verdict on-chain: `TRUE / FALSE / MISLEADING / UNVERIFIABLE` with confidence score and explanation.

Built on [GenLayer](https://genlayer.com) Intelligent Contracts (Python/GenVM) with a Vite + React 19 + TypeScript frontend.

🌐 **Live app:** [truthlockdapp.vercel.app](https://truthlockdapp.vercel.app) · **Network:** GenLayer Studio testnet · **Contract:** `0x3F0E70f8655A52a436924261461E2fFdad236b16`

## How it works

Two verification modes:

1. **SOURCE_VERIFIED** — the user supplies one or more `https://` source URLs:
   - The contract fetches each primary source live with `gl.nondet.web.render(url, mode="text")`
   - An LLM pass extracts up to 2 corroborating source URLs from the fetched content
   - All fetched sources are cross-referenced by the LLM
2. **KNOWLEDGE_BASED** — no URL provided, or all fetches failed:
   - The LLM evaluates the claim from its own knowledge, with confidence capped at 85 and an explicit "no live evidence" note on-chain

In both modes:

- Validators re-run the pipeline and reach consensus via `gl.eq_principle.prompt_comparative` (Optimistic Democracy); output is constrained by the equivalence principle
- The verdict + confidence + explanation + per-source fetch status are stored permanently on-chain

## Repository layout

```
contract/               Intelligent Contracts (Python/GenVM)
  fact_checker.py         main fact-checker contract
  governance_dao.py       GovernanceDAO that reads TruthLock verdicts cross-contract
  tests/                  direct-mode (mocked) + integration tests
frontend/               Vite + React 19 SPA (TypeScript strict)
  src/lib/genlayer.ts     all genlayer-js SDK calls isolated here
  src/pages/              Home, History, Result, Stats, Leaderboard, Governance, ...
docs/                   design system + GenLayer submission notes
AGENTS.md               binding technical spec for AI agents
```

## Deploy the contract

```bash
# Install GenLayer CLI (requires Node.js; Linux may also need libsecret)
npm install -g genlayer

# Start a local environment (optional — for localnet testing)
genlayer init && genlayer up

# Deploy the fact-checker contract
genlayer deploy --contract contract/fact_checker.py

# Optionally deploy the governance contract and wire it to the frontend
genlayer deploy --contract contract/governance_dao.py
```

Copy the deployed contract address(es) into `frontend/.env` (see below).

## Run the frontend

```bash
cd frontend
npm install
cp .env.example .env
```

`.env`:

```env
VITE_CONTRACT_ADDRESS=0x...        # address from the deploy step
VITE_NETWORK=studionet             # localnet | studionet | testnetAsimov | testnetBradbury
VITE_GOVERNANCE_ADDRESS=           # optional: enables the /governance page
VITE_EXPLORER_URL=                 # optional: links transactions to a block explorer
```

```bash
npm run dev
```

Or point your local frontend at the live testnet deployment: set `VITE_CONTRACT_ADDRESS=0x3F0E70f8655A52a436924261461E2fFdad236b16` and `VITE_NETWORK=studionet`.

Open http://localhost:3000. Submitting a claim requires a browser wallet (e.g. MetaMask); reads work without one.

> SDK note: all on-chain access is isolated in `frontend/src/lib/genlayer.ts` using `genlayer-js`
> (`createClient`, `readContract`, `writeContract`, `waitForTransactionReceipt`). Components never
> call the SDK directly.

## Tests

Direct mode (mocked LLM/web, no SDK needed — runs anywhere):

```bash
python3 -m pytest contract/tests/test_direct.py -v
```

Integration (requires a running Studio/localnet node and the `gltest` plugin):

```bash
pip install gltest
export GENLAYER_STUDIO_URL=http://localhost:8080
pytest contract/tests/test_integration.py -v
```

## Public methods (FactChecker)

| Method | Type | Description |
|---|---|---|
| `submit_claim(claim, source_url="", source_urls=[])` | write | Runs the full check pipeline, returns check ID |
| `get_check(id)` | view | Returns one `FactCheckRecord` |
| `get_recent_checks(limit=10)` | view | Last N checks (max 50), newest first |
| `get_stats()` | view | Total checks, verdict tally, mode breakdown, latest timestamp |

Other Intelligent Contracts can read verdicts cross-contract via `gl.get_contract("0x3F0E70f8655A52a436924261461E2fFdad236b16").get_check(id)` — the in-app [Developers page](https://truthlockdapp.vercel.app/developers) has copy-paste Python / Solidity / cURL examples, and `contract/governance_dao.py` is a working reference integration.

## Roadmap / future upgrades

- **Cross-publisher source independence scoring** — detect when all checked sources come from the same publisher host or closely related network, and treat such agreement as weak corroboration (planned next contract upgrade; the deployed contract currently reports fetch status per source but does not yet weigh publisher independence)
- **Verdict challenge & appeal flow** — on-chain dispute of a stored verdict with validator re-review
- **Reputation-weighted validator consensus** display using live consensus data
- **Public REST API + embeddable verdict badges** for third-party sites (the `/embed/:id` widget is the first step)

## Verdicts

| Verdict | Color |
|---|---|
| TRUE | `#00E5A0` mint green |
| FALSE | `#FF4D4D` red |
| MISLEADING | `#FFB800` amber |
| UNVERIFIABLE | `#6B7280` gray |

## License

MIT
