# GenLayer Portal Submission Notes

Use as the portal "Notes / Description" field (everything below the line):

---

TruthLock is an on-chain fact-checker powered by GenLayer Intelligent Contracts.

PROBLEM:
Anyone can ask an LLM anything, but an LLM answer is just a better chatbot response —
it carries no accountability. Traditional smart contracts cannot evaluate "Is this
claim supported by evidence?" TruthLock turns fact-checking into a permanent,
auditable, consensus-backed on-chain record.

HOW IT WORKS:
1. User submits a claim (≤500 chars) with optional https:// source URL(s) via the React frontend
2. SOURCE_VERIFIED mode: the Intelligent Contract fetches the source(s) live using
   gl.nondet.web.render(), then an LLM pass extracts up to 2 corroborating URLs from
   the fetched content, and all sources are fetched and cross-referenced
3. KNOWLEDGE_BASED mode (no URL, or all fetches failed): the LLM evaluates from its
   own knowledge with confidence capped at 85 and an explicit no-live-evidence note
4. Validators re-run the pipeline and reach consensus via Optimistic Democracy,
   constrained by the equivalence principle (verdict identical across validators)
5. Result is stored permanently on-chain: TRUE / FALSE / MISLEADING / UNVERIFIABLE,
   with confidence, explanation, verification mode, and per-source fetch status

WHY GENLAYER:
GenLayer's LLM consensus + live web access enables trustless judgment — no oracle,
no human reviewer, no centralized API. The verdict, its reasoning, and the consensus
votes are all auditable forever.

WHAT'S BUILT:
- FactChecker Intelligent Contract (Python/GenVM) with 4 public methods:
  submit_claim, get_check, get_recent_checks, get_stats
- GovernanceDAO contract that reads FactChecker verdicts cross-contract to
  verify DAO proposals (real cross-contract integration on GenLayer)
- Vite + React 19 + TypeScript frontend calling the contract end-to-end via
  genlayer-js (wallet connection, live tx status pending → consensus → verdict)
- Direct mode test suite (40 tests, all LLM/web calls mocked) + Studio
  integration suite (deploy, live claim, storage, history)
- Result page with animated confidence ring, validator consensus proof,
  evidence panel, verdict matrix, shareable embed widget, and PDF/report export

HOW TO USE:
1. Open the app and connect your wallet
2. Enter a claim (e.g. "The Great Wall of China is visible from space") and
   optionally any https:// source URL (or several)
3. Watch the transaction status: pending → validators reaching consensus → verdict recorded
4. The result page shows the verdict, confidence, explanation, and every source
   checked — permanently verifiable by anyone via the History page

REPO: https://github.com/habte-selassie27/truthlock-genlayer

---

## Live demo

- **Deployed frontend:** https://truthlockdapp.vercel.app
- **Contract address (FactChecker):** `0x3F0E70f8655A52a436924261461E2fFdad236b16`
- **Network:** GenLayer Studio testnet (studionet)
- **Example check to open live:** [/result/1225DB1b1788674195](https://truthlockdapp.vercel.app/result/1225DB1b1788674195) — "The Great Wall of China is visible from space with the naked eye" → UNVERIFIABLE · 18%
- **Also try:** /stats (source reliability analytics + live verdict feed), /history (searchable on-chain history), /developers (cross-contract integration examples + API playground)

Reviewers should be able to: connect a wallet, submit a claim with a real URL,
watch consensus finalize, and open the stored verdict from History.

## Demo video script (<3 min, Loom)

1. 0:00–0:20 — Problem: LLM answers have no accountability; show the hero page.
2. 0:20–0:50 — Submit a live claim with a real https:// source; show the tx pending
   and the validator progress UI.
3. 0:50–1:30 — Consensus finalizes; walk the Result page: verdict badge, confidence
   ring, explanation, sources panel with fetch statuses.
4. 1:30–2:10 — Open Onchain Proof (tx hash + consensus votes); show History filtering;
   open the embed widget for the same check.
5. 2:10–2:40 — Contrast with KNOWLEDGE_BASED mode (submit a claim with no URL;
   point out the capped-confidence notice).
6. 2:40–3:00 — GovernanceDAO page: proposal verified against a TruthLock check;
   close on "permanent, auditable, on-chain."

## X / Twitter post (tag @GenLayerLabs)

> Fact-checking shouldn't live in a centralized API's black box.
>
> TruthLock turns any claim into a permanent on-chain verdict —
> TRUE / FALSE / MISLEADING / UNVERIFIABLE — reached by validator consensus over
> live web evidence. No oracle. No human reviewer.
>
> Try it live: https://truthlockdapp.vercel.app
>
> Built with @GenLayerLabs Intelligent Contracts. Repo below 👇
