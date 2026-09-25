import { createClient } from "genlayer-js";
import type { Hash } from "genlayer-js/types";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import {
  isProposalStatus,
  isVerdict,
  isVerificationMode,
  type GovernanceProposal,
  type GovernanceStats,
  type Verdict,
  type VerificationMode,
} from "./types";
import { CONTRACT_ADDRESS, NETWORK } from "./genlayer";
import { studionet } from "genlayer-js/chains";

// The GovernanceDAO contract address — set after deploying governance_dao.py
export const GOVERNANCE_ADDRESS = import.meta.env.VITE_GOVERNANCE_ADDRESS ?? "";

function requireGovernanceAddress(): `0x${string}` {
  if (!GOVERNANCE_ADDRESS) {
    throw new Error(
      "VITE_GOVERNANCE_ADDRESS is not configured. Deploy governance_dao.py and set it in .env."
    );
  }
  return GOVERNANCE_ADDRESS as `0x${string}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    throw new Error("Unexpected response shape from contract.");
  }
  return value as Record<string, unknown>;
}

function coerceProposal(value: unknown): GovernanceProposal {
  const raw = asRecord(value);
  const truthlockMode: VerificationMode = isVerificationMode(raw.truthlock_mode)
    ? raw.truthlock_mode
    : "KNOWLEDGE_BASED";
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    proposer: String(raw.proposer ?? ""),
    truthlock_check_id: String(raw.truthlock_check_id ?? ""),
    truthlock_verdict: isVerdict(raw.truthlock_verdict)
      ? raw.truthlock_verdict
      : "UNVERIFIABLE",
    truthlock_confidence: Number(raw.truthlock_confidence ?? 0),
    truthlock_mode: truthlockMode,
    status: isProposalStatus(raw.status) ? raw.status : "PENDING",
    votes_for: Number(raw.votes_for ?? 0),
    votes_against: Number(raw.votes_against ?? 0),
    total_voters: Number(raw.total_voters ?? 0),
    timestamp: Number(raw.timestamp ?? 0),
    executed_at: Number(raw.executed_at ?? 0),
  };
}

function coerceStats(value: unknown): GovernanceStats {
  const raw = asRecord(value);
  const statusesRaw =
    raw.statuses && typeof raw.statuses === "object"
      ? (raw.statuses as Record<string, unknown>)
      : {};
  const statuses: GovernanceStats["statuses"] = {};
  for (const [key, value] of Object.entries(statusesRaw)) {
    if (isProposalStatus(key)) {
      statuses[key] = Number(value);
    }
  }
  return {
    total_proposals: Number(raw.total_proposals ?? 0),
    member_count: Number(raw.member_count ?? 0),
    admin: typeof raw.admin === "string" ? raw.admin : undefined,
    statuses,
    truthlock_address: String(raw.truthlock_address ?? ""),
    min_confidence: Number(raw.min_confidence ?? 70),
    quorum_divisor:
      typeof raw.quorum_divisor === "number" ? raw.quorum_divisor : undefined,
    supermajority:
      typeof raw.supermajority === "string" ? raw.supermajority : undefined,
  };
}

let readClientPromise: Promise<ReturnType<typeof createClient>> | null = null;

async function getReadClient() {
  if (!readClientPromise) {
    readClientPromise = Promise.resolve(createClient({ chain: studionet }));
  }
  return readClientPromise;
}

async function getWriteClient(account: `0x${string}`) {
  const provider = window.ethereum;
  if (!provider) {
    throw new Error("No Web3 wallet provider available.");
  }
  const client = createClient({
    chain: studionet,
    account,
    provider,
  });
  try {
    await client.connect(NETWORK as "studionet" | "localnet" | "testnetAsimov" | "testnetBradbury");
  } catch {
    // wallet may already be on correct network
  }
  return client;
}

async function getWalletAccount(): Promise<`0x${string}`> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No Web3 wallet detected.");
  }
  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  const address = accounts[0];
  if (!address) throw new Error("Wallet returned no account.");
  return address as `0x${string}`;
}

// ── Read methods ───────────────────────────────────────────────────

export async function getProposal(id: string): Promise<GovernanceProposal> {
  const address = requireGovernanceAddress();
  const client = await getReadClient();
  const result = await client.readContract({
    address,
    functionName: "get_proposal",
    args: [id],
  });
  return coerceProposal(result);
}

export async function getRecentProposals(limit = 10): Promise<GovernanceProposal[]> {
  const address = requireGovernanceAddress();
  const client = await getReadClient();
  const result = await client.readContract({
    address,
    functionName: "get_recent_proposals",
    args: [limit],
  });
  if (!Array.isArray(result)) {
    throw new Error("get_recent_proposals did not return a list.");
  }
  return result.map(coerceProposal);
}

export async function getGovernanceStats(): Promise<GovernanceStats> {
  const address = requireGovernanceAddress();
  const client = await getReadClient();
  const result = await client.readContract({
    address,
    functionName: "get_stats",
    args: [],
  });
  return coerceStats(result);
}

// ── Write methods ──────────────────────────────────────────────────

export async function submitProposal(
  title: string,
  description: string,
  truthlockCheckId: string
): Promise<{ proposalId: string; txHash: string }> {
  const address = requireGovernanceAddress();
  const account = await getWalletAccount();

  const writeClient = await getWriteClient(account);
  const txHash = await writeClient.writeContract({
    address,
    functionName: "submit_proposal",
    args: [title, description, truthlockCheckId],
    value: BigInt(0),
  });

  // Wait for finalization
  const readClient = await getReadClient();
  await readClient.waitForTransactionReceipt({
    hash: txHash as unknown as Hash,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 120,
  });

  // Resolve proposal ID by polling recent proposals
  const normalized = account.toLowerCase();
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 2000 + attempt * 1000));
    try {
      const recent = await getRecentProposals(10);
      const match = recent.find(
        (p) =>
          p.proposer.toLowerCase() === normalized && p.title === title
      );
      if (match) return { proposalId: match.id, txHash };
    } catch {
      // retry
    }
  }

  throw new Error("Proposal submitted but ID could not be resolved. Check the governance page.");
}

export async function voteOnProposal(
  proposalId: string,
  support: boolean
): Promise<string> {
  const address = requireGovernanceAddress();
  const account = await getWalletAccount();

  const writeClient = await getWriteClient(account);
  const txHash = await writeClient.writeContract({
    address,
    functionName: "vote",
    args: [proposalId, support],
    value: BigInt(0),
  });

  const readClient = await getReadClient();
  await readClient.waitForTransactionReceipt({
    hash: txHash as unknown as Hash,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 120,
  });

  return txHash;
}

export async function executeProposal(proposalId: string): Promise<string> {
  const address = requireGovernanceAddress();
  const account = await getWalletAccount();

  const writeClient = await getWriteClient(account);
  const txHash = await writeClient.writeContract({
    address,
    functionName: "execute_proposal",
    args: [proposalId],
    value: BigInt(0),
  });

  const readClient = await getReadClient();
  await readClient.waitForTransactionReceipt({
    hash: txHash as unknown as Hash,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 120,
  });

  return txHash;
}
