# 🔐 TruthLock

### On-Chain Fact Checking Powered by GenLayer

**TruthLock** is a decentralized fact-checking protocol that turns claims into **verifiable, permanent on-chain records**.

Submit a claim with or without a source. TruthLock uses **GenLayer Intelligent Contracts**, live web data, LLM reasoning, and validator consensus to determine whether a claim is:

> **TRUE · FALSE · MISLEADING · UNVERIFIABLE**

Each verification produces a permanent on-chain record containing the verdict, confidence score, explanation, evidence status, and verification metadata.

<p align="center">
  <a href="https://truthlockdapp.vercel.app">🌐 Live App</a> ·
  <a href="https://truthlockdapp.vercel.app/developers">🧑‍💻 Developer Hub</a> ·
  <a href="https://genlayer.com">GenLayer</a>
</p>

---

## ✨ Why TruthLock?

The internet contains enormous amounts of information—but determining **what is actually true** remains difficult.

Traditional fact-checking is often:

* Centralized
* Difficult to audit
* Dependent on a single authority
* Not permanently verifiable
* Vulnerable to changing or disappearing sources

TruthLock approaches the problem differently.

### The core idea

```text
          USER CLAIM
               │
               ▼
      ┌─────────────────┐
      │  Evidence Input │
      │ URL(s) optional │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────┐
      │ Live Web Fetch  │
      │ + Source Check  │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────┐
      │  LLM Reasoning  │
      │ Cross-reference │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────┐
      │    Validator    │
      │    Consensus    │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────┐
      │ On-Chain Record │
      └────────┬────────┘
               │
               ▼
       TRUE / FALSE /
     MISLEADING / UNVERIFIABLE
```

The result isn't just an AI response.

**It becomes an on-chain fact-check record that other applications can independently read.**

---

# 🚀 Features

### 🔎 Intelligent Fact Checking

Submit any claim and let the protocol evaluate it using live evidence and LLM reasoning.

### 🌐 Live Web Evidence

When a source URL is provided, the Intelligent Contract can fetch the source directly and analyze its contents.

### 🧠 Multi-Source Reasoning

TruthLock can extract additional corroborating sources and compare the available evidence.

### ⚖️ Optimistic Democracy Consensus

Validators independently re-run the verification pipeline and reach consensus using GenLayer's `gl.eq_principle.prompt_comparative`.

### ⛓️ Permanent On-Chain Verdicts

Every verification stores:

* Verdict
* Confidence score
* Explanation
* Claim
* Source information
* Fetch status
* Timestamp
* Submitter
* Verification mode

### 📊 Network Analytics

Explore aggregate statistics across verified claims, including:

* Verdict distribution
* Verification modes
* Recent checks
* Trending claims
* Source reliability
* Live verdict activity

### 🕐 Verification Timeline

Follow the complete verification lifecycle from claim submission to final on-chain commitment.

### 🧑‍💻 Developer Integration

Other decentralized applications can read TruthLock verdicts directly from the Intelligent Contract.

### 🏛️ Governance Integration

The repository includes a `GovernanceDAO` reference implementation capable of reading TruthLock verdicts cross-contract.

---

# 🖥️ Application

## 1. Home — Claim Submission

![Home Page Screenshot](./Screenshot%20from%202026-09-06%2016-23-59.png)

The submission portal allows users to:

* Enter a claim
* Provide one or more evidence URLs
* Automatically select a claim category
* Specify a category manually
* Start the verification process
* View the Claim of the Day
* Explore recent fact checks

---

## 2. Verification Result

![Result Main Screen](./Screenshot%20from%202026-09-06%2016-26-46.png)

The result page provides the primary verdict and supporting evidence.

Example:

```text
VERDICT
UNVERIFIABLE

Confidence
18%

Evidence
Insufficient corroboration
```

It also displays:

* Source verification status
* Evidence agreement
* Corroborating sources
* Verification explanation

---

## 3. Verification Analysis

![Result Analysis Screen](./Screenshot%20from%202026-09-06%2016-27-10.png)

The analysis view exposes the reasoning behind the verdict.

It includes:

* Evidence divergence
* Validator agreement
* Optimistic Democracy results
* Source quality tiers
* Claim scoring
* Evidence consistency

This makes the verification process more transparent than a simple AI-generated answer.

---

## 4. Verification Timeline

![Result Timeline Screen](./Screenshot%20from%202026-09-06%2016-27-29.png)

The timeline provides a chronological view of the verification lifecycle.

```text
Claim Submitted
      ↓
Primary Source Retrieved
      ↓
Evidence Extracted
      ↓
Corroborating Sources Retrieved
      ↓
LLM Reasoning
      ↓
Validator Verification
      ↓
Consensus
      ↓
On-Chain Commitment
```

---

## 5. On-Chain Proof

![On-Chain Proof Screen](./Screenshot%20from%202026-09-06%2016-27-41.png)

Once verification is complete, TruthLock exposes the resulting on-chain proof.

The interface includes:

* Transaction ID
* Timestamp
* Contract address
* Submitter wallet
* Verification ID
* Immutable verdict record

Users can also:

* Export a report card
* Share the result
* Embed a verdict
* Challenge a verdict *(roadmap)*

---

# 📊 Network Analytics

## Stats Overview

![Stats Overview](./Screenshot%20from%202026-09-06%2016-24-29.png)

TruthLock provides a network-level view of fact-checking activity.

Metrics include:

* Total claims verified
* TRUE / FALSE / MISLEADING / UNVERIFIABLE distribution
* Source-verified checks
* Knowledge-based checks
* Latest verification timestamp

## Live Feeds

![Stats Feeds & Analytics](./Screenshot%20from%202026-09-06%2016-24-59.png)

The analytics dashboard provides:

* Trending claims
* Verdict activity
* Source reliability information
* Recent verification events
* Verification-mode statistics

---

# 🗂️ Fact-Check History

![History Screen](./Screenshot%20from%202026-09-06%2016-25-19.png)

TruthLock maintains a searchable history of verified claims.

Users can:

* Search claims
* Filter by category
* Filter by verdict
* Explore historical checks
* Analyze misinformation patterns

The dashboard also includes a **14-day misinformation heat map** showing verification frequency and verdict trends.

---

# 🧑‍💻 Developer Hub

![Developers Screen 1](./Screenshot%20from%202026-09-06%2016-25-37.png)

![Developers Screen 2](./Screenshot%20from%202026-09-06%2016-25-51.png)

TruthLock is designed to function as **fact-checking infrastructure**, not only as a consumer application.

Developers can integrate TruthLock into their own applications and read verification results directly from the contract.

The Developer Hub provides examples for:

* Python
* Solidity
* cURL
* Contract-to-contract integrations

It also includes an interactive API playground for querying verification records.

---

# ⚙️ How It Works

TruthLock supports two verification modes.

## 1. `SOURCE_VERIFIED`

The user provides one or more HTTPS source URLs.

### Step 1 — Fetch evidence

The Intelligent Contract retrieves source content using:

```python
gl.nondet.web.render(url, mode="text")
```

### Step 2 — Extract corroborating sources

The LLM analyzes the fetched content and can identify up to two additional corroborating URLs.

### Step 3 — Cross-reference evidence

The available sources are analyzed together to determine:

* Agreement
* Contradictions
* Source quality
* Evidence strength
* Claim consistency

### Step 4 — Validator consensus

Validators independently re-run the verification pipeline.

Consensus is reached using GenLayer's Optimistic Democracy mechanism:

```python
gl.eq_principle.prompt_comparative(...)
```

### Step 5 — Permanent storage

The final result is committed on-chain.

---

# 🧠 2. `KNOWLEDGE_BASED`

When no source URL is supplied—or when all source fetches fail—the system falls back to LLM knowledge.

The protocol explicitly records that **no live evidence was successfully verified**.

For this mode:

```text
Maximum confidence = 85%
```

This prevents knowledge-only verification from appearing as strong as live-source verification.

---

# ⛓️ On-Chain Data Model

Each fact check produces a persistent `FactCheckRecord`.

Conceptually:

```text
FactCheckRecord
├── ID
├── Claim
├── Verdict
├── Confidence
├── Explanation
├── Verification Mode
├── Source URLs
├── Source Fetch Status
├── Timestamp
└── Submitter
```

### Supported verdicts

| Verdict          | Meaning                                               |
| ---------------- | ----------------------------------------------------- |
| 🟢 `TRUE`        | Available evidence supports the claim                 |
| 🔴 `FALSE`       | Available evidence contradicts the claim              |
| 🟡 `MISLEADING`  | Claim contains materially misleading context          |
| ⚪ `UNVERIFIABLE` | Available evidence is insufficient to establish truth |

---

# 🏗️ Architecture

```text
┌──────────────────────────────────────────────┐
│                  React SPA                   │
│            Vite + React 19 + TS              │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│              GenLayer JS SDK                 │
│        createClient / read / write           │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│          TruthLock Intelligent Contract      │
│                 Python / GenVM               │
├──────────────────────────────────────────────┤
│ Claim Processing                             │
│ Web Evidence Retrieval                       │
│ LLM Reasoning                                │
│ Source Cross-Referencing                     │
│ Validator Consensus                          │
│ On-Chain Storage                             │
└──────────────────────────────────────────────┘
```

### Design principle

All GenLayer SDK interaction is isolated inside:

```text
frontend/src/lib/genlayer.ts
```

React components **never call the SDK directly**.

This keeps blockchain infrastructure separated from UI logic.

---

# 📁 Repository Structure

```text
.
├── contract/
│   ├── fact_checker.py
│   ├── governance_dao.py
│   └── tests/
│       ├── test_direct.py
│       └── test_integration.py
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── genlayer.ts
│   │   └── pages/
│   │       ├── Home
│   │       ├── History
│   │       ├── Result
│   │       ├── Stats
│   │       ├── Leaderboard
│   │       └── Governance
│   └── ...
│
├── docs/
│   └── design system + GenLayer submission notes
│
├── AGENTS.md
└── README.md
```

---

# 🛠️ Tech Stack

| Layer            | Technology                     |
| ---------------- | ------------------------------ |
| Smart Contracts  | GenLayer Intelligent Contracts |
| Contract Runtime | Python / GenVM                 |
| Consensus        | Optimistic Democracy           |
| Web Evidence     | `gl.nondet.web.render`         |
| Frontend         | React 19                       |
| Build Tool       | Vite                           |
| Language         | TypeScript                     |
| Blockchain SDK   | `genlayer-js`                  |
| Wallet           | Browser wallet / MetaMask      |
| Testing          | Pytest + gltest                |
| Deployment       | GenLayer Studio                |

---

# 🚀 Getting Started

## Prerequisites

Make sure you have:

* Node.js
* npm
* Python 3
* A browser wallet such as MetaMask
* GenLayer CLI

---

## 1. Install GenLayer CLI

```bash
npm install -g genlayer
```

On Linux, additional system packages such as `libsecret` may be required.

---

## 2. Start Local GenLayer

Optional — only required for local development/testing.

```bash
genlayer init
genlayer up
```

---

## 3. Deploy TruthLock

```bash
genlayer deploy --contract contract/fact_checker.py
```

Optional governance contract:

```bash
genlayer deploy --contract contract/governance_dao.py
```

Copy the deployed contract addresses.

---

# 🌐 Frontend Setup

```bash
cd frontend

npm install

cp .env.example .env
```

Configure `.env`:

```env
VITE_CONTRACT_ADDRESS=0x...
VITE_NETWORK=studionet
VITE_GOVERNANCE_ADDRESS=
VITE_EXPLORER_URL=
```

Supported networks:

```text
localnet
studionet
testnetAsimov
testnetBradbury
```

Start the application:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

> Submitting a claim requires a browser wallet. Reading existing verification records does not require one.

---

# 🌍 Use the Existing Deployment

You can also connect the frontend to the deployed TruthLock contract:

```env
VITE_CONTRACT_ADDRESS=0x3F0E70f8655A52a436924261461E2fFdad236b16
VITE_NETWORK=studionet
```

### Current deployment

```text
Network:
GenLayer Studio Testnet

Contract:
0x3F0E70f8655A52a436924261461E2fFdad236b16

Application:
https://truthlockdapp.vercel.app
```

---

# 🧪 Testing

## Direct Tests

Direct mode uses mocked web and LLM responses and does not require the SDK.

```bash
python3 -m pytest contract/tests/test_direct.py -v
```

---

## Integration Tests

Install `gltest`:

```bash
pip install gltest
```

Set the Studio URL:

```bash
export GENLAYER_STUDIO_URL=http://localhost:8080
```

Run:

```bash
pytest contract/tests/test_integration.py -v
```

---

# 📡 Smart Contract API

The `FactChecker` contract exposes the following public methods.

| Method                | Type  | Description                      |
| --------------------- | ----- | -------------------------------- |
| `submit_claim()`      | Write | Submit and verify a claim        |
| `get_check()`         | View  | Retrieve a specific verification |
| `get_recent_checks()` | View  | Retrieve recent checks           |
| `get_stats()`         | View  | Retrieve network statistics      |

### `submit_claim`

```text
submit_claim(
    claim,
    source_url="",
    source_urls=[]
)
```

Runs the complete verification pipeline and returns a check ID.

### `get_check`

```text
get_check(id)
```

Returns the complete `FactCheckRecord`.

### `get_recent_checks`

```text
get_recent_checks(limit=10)
```

Returns the latest verification records.

Maximum:

```text
50
```

### `get_stats`

```text
get_stats()
```

Returns:

* Total checks
* Verdict distribution
* Verification mode distribution
* Latest verification timestamp

---

# 🔗 Cross-Contract Integration

Other Intelligent Contracts can consume TruthLock results directly.

Example:

```python
truthlock = gl.get_contract(
    "0x3F0E70f8655A52a436924261461E2fFdad236b16"
)

result = truthlock.get_check(check_id)
```

This enables TruthLock to become a **shared verification layer for other decentralized applications**.

For example:

```text
TruthLock
    │
    ├── Governance
    ├── Prediction Markets
    ├── DAOs
    ├── Social Networks
    ├── News Platforms
    ├── Reputation Systems
    └── AI Agents
```

---

# 🗺️ Roadmap

## Phase 1 — Core Verification ✅

* [x] Claim submission
* [x] Source-based verification
* [x] Knowledge-based verification
* [x] Multi-source reasoning
* [x] Validator consensus
* [x] On-chain verdict storage
* [x] Verification history
* [x] Network statistics
* [x] Developer integration examples

---

## Phase 2 — Stronger Evidence Verification 🚧

### Publisher Independence

Detect when multiple sources originate from:

* The same publisher
* The same domain
* Closely related publisher networks

Agreement between dependent sources should receive less evidentiary weight.

> The current deployment records source fetch status but does **not yet weight publisher independence**.

---

## Phase 3 — Dispute & Appeals

Introduce an on-chain challenge mechanism.

```text
Verdict
   │
   ▼
Challenge
   │
   ▼
Validator Re-Review
   │
   ▼
New Consensus
   │
   ▼
Updated Resolution
```

This creates an explicit dispute-resolution layer for controversial claims.

---

## Phase 4 — Reputation-Aware Consensus

Display live validator consensus and reputation information.

Potential metrics:

* Validator agreement
* Historical accuracy
* Participation
* Reputation
* Consensus confidence

---

## Phase 5 — Public Verification API

Expose TruthLock as public infrastructure through:

* REST API
* Embeddable verdict badges
* Verification widgets
* Developer SDK
* `/embed/:id` integrations

The existing `/embed/:id` widget provides the foundation for this direction.

---

# 🔮 Long-Term Vision

TruthLock is designed to evolve from a fact-checking application into a **decentralized truth-verification layer**.

Instead of every application independently building its own fact-checking system:

```text
                 ┌───────────────┐
                 │   TruthLock   │
                 │ Verification  │
                 │     Layer     │
                 └───────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   Prediction         Social           Governance
    Markets           Apps               DAOs
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                  Trusted Web3 Apps
```

The goal is simple:

> **Make claims verifiable, evidence auditable, and verdicts composable.**

---

# 🎨 Verdict Colors

| Verdict        | Color     |
| -------------- | --------- |
| `TRUE`         | `#00E5A0` |
| `FALSE`        | `#FF4D4D` |
| `MISLEADING`   | `#FFB800` |
| `UNVERIFIABLE` | `#6B7280` |

---

# 🔐 Security & Trust Model

TruthLock does not treat a single LLM response as ground truth.

Instead, the system combines:

```text
Web Evidence
     +
LLM Analysis
     +
Multiple Sources
     +
Validator Re-execution
     +
Optimistic Democracy
     +
On-Chain Storage
```

The result is intended to make fact-checking **more transparent, reproducible, and composable**.

---

# 📜 License

MIT License

---

# ⭐ Built With

Built with ❤️ using:

* **GenLayer Intelligent Contracts**
* **GenVM**
* **React**
* **TypeScript**
* **Vite**
* **genlayer-js**

**TruthLock — Verify the claim. Preserve the proof.**
