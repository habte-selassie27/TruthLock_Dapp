import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Code2,
  Copy,
  Check,
  ExternalLink,
  FileCode2,
  Shield,
  Terminal,
} from "lucide-react";
import { CONTRACT_ADDRESS, NETWORK } from "@/lib/genlayer";

const PYTHON_CODE = `from genlayer import *

class MyVerifier(gl.Contract):
    """Example: a contract that reads TruthLock verdicts."""

    @gl.public.view
    def verify_claim(self, truthlock_id: str) -> dict:
        """Read a TruthLock verification result on-chain."""
        result = gl.get_contract(
            "${CONTRACT_ADDRESS}"
        ).get_check(truthlock_id)

        return {
            "verdict": result["verdict"],
            "confidence": result["confidence"],
            "explanation": result["explanation"],
            "sources": result["sources_checked"],
            "mode": result["verification_mode"],
        }

    @gl.public.write
    def gated_action(self, truthlock_id: str) -> str:
        """Only proceed if TruthLock says the claim is TRUE."""
        result = gl.get_contract(
            "${CONTRACT_ADDRESS}"
        ).get_check(truthlock_id)

        if result["verdict"] != "TRUE":
            raise gl.UserError("Claim not verified")

        # ... your custom logic here
        return "action executed"`;

const SOLIDITY_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITruthLock {
    struct FactCheckResult {
        string verdict;      // "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIABLE"
        uint256 confidence;  // 0-100
        string explanation;
        string[] sourcesChecked;
        string verificationMode; // "SOURCE_VERIFIED" | "KNOWLEDGE_BASED"
    }

    function getCheck(string calldata id)
        external view returns (FactCheckResult memory);
}

contract MyDAO {
    ITruthLock constant truthlock = ITruthLock(
        ${CONTRACT_ADDRESS}
    );

    function executeProposal(
        string calldata truthlockId,
        bytes calldata action
    ) external {
        ITruthLock.FactCheckResult memory result =
            truthlock.getCheck(truthlockId);

        require(
            keccak256(bytes(result.verdict)) ==
            keccak256("TRUE"),
            "Claim not verified by TruthLock"
        );

        require(
            result.confidence >= 70,
            "Confidence too low"
        );

        // ... execute your logic
    }
}`;

const CURL_EXAMPLE = `curl -X POST https://studio.genlayer.com/api \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
      "to": "${CONTRACT_ADDRESS}",
      "data": "0x..."
    }, "latest"],
    "id": 1
  }'`;

const MOCK_RESPONSE = {
  verdict: "TRUE",
  confidence: 91,
  explanation:
    "All three sources confirm the claim. Reuters, BBC, and Wikipedia independently corroborate the announcement.",
  sources_checked: [
    "https://reuters.com/article/example",
    "https://bbc.com/news/example",
    "https://en.wikipedia.org/wiki/Example",
  ],
  verification_mode: "SOURCE_VERIFIED",
  source_status: "FETCHED",
  timestamp: Math.floor(Date.now() / 1000) - 300,
  submitter: "0x04e0353b7218b66d6803725ce7342e6e1225db1b",
};

const TABS = [
  { id: "python", label: "Python", icon: FileCode2 },
  { id: "solidity", label: "Solidity", icon: Shield },
  { id: "curl", label: "cURL", icon: Terminal },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Developers() {
  const reduceMotion = useReducedMotion();
  const delay = (ms: number) => (reduceMotion ? 0 : ms);
  const [activeTab, setActiveTab] = useState<TabId>("python");
  const [copied, setCopied] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const code =
    activeTab === "python"
      ? PYTHON_CODE
      : activeTab === "solidity"
        ? SOLIDITY_CODE
        : CURL_EXAMPLE;

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRun() {
    setRunResult("Running...");
    setTimeout(() => {
      setRunResult(JSON.stringify(MOCK_RESPONSE, null, 2));
    }, 1200);
  }

  return (
    <div className="mx-auto max-w-page px-5 pb-24">
      {/* Header */}
      <section className="pt-16 pb-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-signal/20 bg-signal/5 px-4 py-1.5">
            <Code2 size={12} className="text-signal" />
            <span className="font-mono text-xs text-signal">
              Smart contract integration
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Build with <span className="text-gradient-signal">TruthLock</span>
          </h1>
          <p className="mt-3 max-w-lg text-ink-dim">
            Read verification results from any smart contract. TruthLock is
            infrastructure — other contracts can gate actions on verified
            on-chain verdicts.
          </p>
        </motion.div>
      </section>

      {/* Contract details */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.1), duration: 0.45 }}
        className="mb-6 rounded-xl border border-line bg-surface p-6 shadow-card"
      >
        <h2 className="mb-4 font-display text-sm font-semibold tracking-wide text-ink">
          Contract details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-ghost">
              Address
            </p>
            <p className="mt-1 truncate font-mono text-xs text-signal">
              {CONTRACT_ADDRESS}
            </p>
          </div>
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-ghost">
              Network
            </p>
            <p className="mt-1 font-mono text-xs text-ink">GenLayer {NETWORK}</p>
          </div>
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-ghost">
              Key functions
            </p>
            <p className="mt-1 font-mono text-xs text-ink">
              get_check · submit_claim · get_recent_checks · get_stats
            </p>
          </div>
        </div>
      </motion.section>

      {/* Integration code */}
      <div className="space-y-6">
        {/* Code tabs */}
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay(0.2), duration: 0.45 }}
          className="rounded-xl border border-line bg-surface shadow-card overflow-hidden"
        >
          {/* Tab bar */}
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <div className="flex gap-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                      activeTab === tab.id
                        ? "bg-surface-2 text-ink"
                        : "text-ink-ghost hover:text-ink-dim"
                    }`}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[0.6rem] text-ink-ghost transition-colors hover:text-ink"
            >
              {copied ? (
                <Check size={11} className="text-signal" />
              ) : (
                <Copy size={11} />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Code block */}
          <div className="overflow-x-auto p-4">
            <pre className="font-mono text-[0.7rem] leading-relaxed text-ink-dim">
              <code>{code}</code>
            </pre>
          </div>
        </motion.section>

        {/* API playground */}
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay(0.3), duration: 0.45 }}
          className="rounded-xl border border-line bg-surface p-6 shadow-card"
        >
          <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold tracking-wide text-ink">
            <Terminal size={14} className="text-signal" />
            API Playground
          </h2>

          <p className="mb-4 font-mono text-xs text-ink-dim">
            Read a verification result from the TruthLock contract:
          </p>

          <div className="mb-4 rounded-lg bg-surface-2 p-4">
            <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-wider text-ink-ghost">
              Example response
            </p>
            <pre className="overflow-auto font-mono text-[0.65rem] leading-relaxed text-ink-dim">
              <code>
                {runResult
                  ? runResult
                  : JSON.stringify(
                      {
                        verdict: "TRUE",
                        confidence: 91,
                        explanation: "...",
                        sources_checked: ["..."],
                        verification_mode: "SOURCE_VERIFIED",
                      },
                      null,
                      2
                    )}
              </code>
            </pre>
          </div>

          <button
            type="button"
            onClick={handleRun}
            className="w-full rounded-lg border border-signal/40 bg-signal/5 px-4 py-2.5 font-display text-xs font-semibold text-signal transition-colors hover:bg-signal/10"
          >
            {runResult ? "Run again" : "Run example"}
          </button>

          <div className="mt-5 space-y-3">
            <h3 className="font-display text-xs font-semibold text-ink">
              Available functions
            </h3>
            {[
              {
                name: "get_check(id)",
                desc: "Retrieve a single verification by ID",
              },
              {
                name: "submit_claim(claim, source_url?)",
                desc: "Submit a new claim for verification",
              },
              {
                name: "get_recent_checks(limit)",
                desc: "Fetch the last N verifications",
              },
              {
                name: "get_stats()",
                desc: "Network-wide verification statistics",
              },
            ].map((fn) => (
              <div
                key={fn.name}
                className="rounded-lg border border-line bg-surface-2 px-3 py-2"
              >
                <p className="font-mono text-[0.65rem] font-semibold text-signal">
                  {fn.name}
                </p>
                <p className="mt-0.5 font-mono text-[0.6rem] text-ink-dim">
                  {fn.desc}
                </p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Integration architecture */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.4), duration: 0.45 }}
        className="mt-6 rounded-xl border border-line bg-surface p-6 shadow-card"
      >
        <h2 className="mb-5 font-display text-sm font-semibold tracking-wide text-ink">
          How integration works
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-signal/40 bg-signal/10">
              <span className="font-display text-lg font-bold text-signal">1</span>
            </div>
            <p className="font-display text-sm font-semibold text-ink">
              Your contract
            </p>
            <p className="mt-1 font-mono text-[0.65rem] text-ink-ghost">
              Calls TruthLock.get_check() with a verification ID
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-signal/40 bg-signal/10">
              <span className="font-display text-lg font-bold text-signal">2</span>
            </div>
            <p className="font-display text-sm font-semibold text-ink">
              TruthLock contract
            </p>
            <p className="mt-1 font-mono text-[0.65rem] text-ink-ghost">
              Returns verdict, confidence, explanation, sources on-chain
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-signal/40 bg-signal/10">
              <span className="font-display text-lg font-bold text-signal">3</span>
            </div>
            <p className="font-display text-sm font-semibold text-ink">
              Gate your logic
            </p>
            <p className="mt-1 font-mono text-[0.65rem] text-ink-ghost">
              Require TRUE verdict or minimum confidence before proceeding
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-surface-2 px-4 py-3 text-center">
          <p className="font-mono text-xs text-ink-dim">
            All verification results are permanently stored on-chain.
            No API key required. No rate limits. No trust required.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
