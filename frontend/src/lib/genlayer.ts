import { createClient } from "genlayer-js";
import type { Hash, Network } from "genlayer-js/types";
import {
  localnet,
  studionet,
  testnetAsimov,
  testnetBradbury,
} from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import {
  isVerdict,
  isVerificationMode,
  isSourceStatus,
  isSourceRole,
  type ContractStats,
  type FactCheckRecord,
  type SourceEvidence,
  type SourceStatus,
  type VerificationMode,
  type Verdict,
} from "./types";
import { saveTxProof, type TxProof } from "./verification";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? "";
export const NETWORK = import.meta.env.VITE_NETWORK ?? "studionet";

const CHAINS = { localnet, studionet, testnetAsimov, testnetBradbury } as const;
type ChainName = keyof typeof CHAINS;

function resolveChain() {
  const chain = CHAINS[NETWORK as ChainName] ?? studionet;
  return chain;
}

export class GenLayerClientError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "GenLayerClientError";
  }
}

type GenlayerClient = ReturnType<typeof createClient>;

let readClientPromise: Promise<GenlayerClient> | null = null;

async function getReadClient(): Promise<GenlayerClient> {
  if (!readClientPromise) {
    readClientPromise = Promise.resolve(createClient({ chain: resolveChain() }));
  }
  return readClientPromise;
}

interface MinimalEthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: MinimalEthereumProvider;
  }
}

async function getWalletAccount(): Promise<`0x${string}`> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new GenLayerClientError(
      "No Web3 wallet detected. Install MetaMask or another GenLayer-compatible wallet to submit claims."
    );
  }
  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  const address = accounts[0];
  if (!address) {
    throw new GenLayerClientError("Wallet returned no account address.");
  }
  return address as `0x${string}`;
}

async function getWriteClient(account: `0x${string}`): Promise<GenlayerClient> {
  const provider = window.ethereum;
  if (!provider) {
    throw new GenLayerClientError("No Web3 wallet provider available.");
  }
  const client = createClient({
    chain: resolveChain(),
    account,
    provider,
  });
  try {
    await client.connect(NETWORK as Network);
  } catch {
    // wallet may already be on the correct network; writeContract surfaces real errors
  }
  return client;
}

function requireContractAddress(): string {
  if (!CONTRACT_ADDRESS) {
    throw new GenLayerClientError(
      "VITE_CONTRACT_ADDRESS is not configured. Copy frontend/.env.example to .env and set it after deploying the contract."
    );
  }
  return CONTRACT_ADDRESS;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    throw new GenLayerClientError("Unexpected response shape from contract.");
  }
  return value as Record<string, unknown>;
}

function coerceVerdict(value: unknown): Verdict {
  if (!isVerdict(value)) {
    throw new GenLayerClientError("On-chain record has an invalid verdict value.");
  }
  return value;
}

interface RawRecordShape extends Record<string, unknown> {
  id?: unknown;
  claim?: unknown;
  source_url?: unknown;
  verdict?: unknown;
  confidence?: unknown;
  explanation?: unknown;
  sources_checked?: unknown;
  timestamp?: unknown;
  submitter?: unknown;
  verification_mode?: unknown;
  source_status?: unknown;
  source_details?: unknown;
}

function coerceSourceEvidence(value: unknown): SourceEvidence | null {
  if (value === null || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const url = String(raw.url ?? "");
  if (!url) return null;
  const status: SourceStatus = isSourceStatus(raw.status) ? raw.status : "ERROR";
  const role = isSourceRole(raw.role) ? raw.role : "primary";
  return {
    url,
    status,
    role,
    host: String(raw.host ?? ""),
    content_length: Number(raw.content_length ?? 0),
    content_hash: String(raw.content_hash ?? ""),
    retrieved_at: Number(raw.retrieved_at ?? 0),
  };
}

function coerceRecord(value: unknown): FactCheckRecord {
  const raw = value as RawRecordShape;
  if (raw === null || typeof raw !== "object") {
    throw new GenLayerClientError("On-chain record is malformed.");
  }
  if (typeof raw.id === "object" && raw.id !== null) {
    raw.id = (raw.id as { id?: unknown }).id ?? String(raw.id);
  }
  const sourceUrl = String(raw.source_url ?? "");
  const verificationMode: VerificationMode = isVerificationMode(
    raw.verification_mode
  )
    ? raw.verification_mode
    : sourceUrl
      ? "SOURCE_VERIFIED"
      : "KNOWLEDGE_BASED";
  const sourceStatus: SourceStatus = isSourceStatus(raw.source_status)
    ? raw.source_status
    : sourceUrl
      ? "FETCHED"
      : "NOT_PROVIDED";
  const sourceDetails: SourceEvidence[] = Array.isArray(raw.source_details)
    ? raw.source_details
        .map(coerceSourceEvidence)
        .filter((d): d is SourceEvidence => d !== null)
    : [];
  return {
    id: String(raw.id ?? ""),
    claim: String(raw.claim ?? ""),
    source_url: sourceUrl,
    source_urls: Array.isArray(raw.sources_checked)
      ? raw.sources_checked.filter((s: unknown) => s !== sourceUrl).map(String)
      : [],
    verdict: coerceVerdict(raw.verdict),
    confidence: Number(raw.confidence ?? 0),
    explanation: String(raw.explanation ?? ""),
    sources_checked: Array.isArray(raw.sources_checked)
      ? raw.sources_checked.map(String)
      : [],
    timestamp: Number(raw.timestamp ?? 0),
    submitter: String(raw.submitter ?? ""),
    verification_mode: verificationMode,
    source_status: sourceStatus,
    source_details: sourceDetails,
  };
}

async function findLatestCheckId(
  submitter: string,
  claim: string
): Promise<string | null> {
  // Poll while state propagates after consensus (LLM checks can lag)
  const normalized = submitter.toLowerCase();
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 2000 + attempt * 1000));
    try {
      const recent = await getRecentChecks(10);
      const match = recent.find(
        (r) =>
          r.submitter.toLowerCase() === normalized &&
          (!claim || r.claim === claim)
      );
      if (match) return match.id;
    } catch {
      // retry
    }
  }
  return null;
}

export async function submitClaim(
  claim: string,
  sourceUrl: string,
  sourceUrls: string[] = [],
): Promise<{ checkId: string; txHash: string }> {
  const address = requireContractAddress() as `0x${string}`;
  const account = await getWalletAccount();

  let txHash: string;
  try {
    const writeClient = await getWriteClient(account);
    const filteredUrls = sourceUrls.filter((u) => u.trim() !== "");
    const args =
      filteredUrls.length > 0
        ? [claim, "", filteredUrls]
        : [claim, sourceUrl];
    txHash = await writeClient.writeContract({
      address,
      functionName: "submit_claim",
      args,
      value: BigInt(0),
    });
  } catch (error) {
    throw new GenLayerClientError(
      error instanceof Error ? error.message : "Failed to submit transaction.",
      error
    );
  }

  const readClient = await getReadClient();
  const rawReceipt = await readClient.waitForTransactionReceipt({
    hash: txHash as unknown as Hash,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 120,
  });
  const receipt = asRecord(rawReceipt);

  const executionResultName = receipt.txExecutionResultName;
  if (
    executionResultName !== ExecutionResult.FINISHED_WITH_RETURN &&
    executionResultName !== ExecutionResult.FINISHED_WITH_ERROR &&
    executionResultName !== undefined
  ) {
    throw new GenLayerClientError(
      "Consensus has not finalized this transaction yet. Check the history page in a moment."
    );
  }
  if (executionResultName === ExecutionResult.FINISHED_WITH_ERROR) {
    throw new GenLayerClientError(
      "Contract execution failed. Verify the URL is reachable and starts with https://."
    );
  }

  // Resolve the check ID by polling recent checks for this submitter + claim
  // (contract generates ID as sender[-8:] + tx-pinned unix timestamp)
  const checkId = await findLatestCheckId(account, claim);

  // Capture consensus proof for display in Result page
  if (checkId) {
    const consensus = receipt.consensus_data as Record<string, unknown> | undefined;
    const votesRaw = consensus?.votes as Record<string, string> | undefined;
    const votes: Record<string, string> = votesRaw && typeof votesRaw === "object"
      ? Object.fromEntries(
          Object.entries(votesRaw).map(([k, v]) => [k.toLowerCase(), String(v)])
        )
      : {};
    const agreeCount = Object.values(votes).filter(
      (v) => v === "agree"
    ).length;
    const totalVotes = Object.keys(votes).length;
    const lastRound = receipt.lastRound as Record<string, unknown> | undefined;
    const resultName = String(receipt.resultName ?? "MAJORITY_AGREE");
    const rounds = lastRound ? 1 : 1;

    saveTxProof(checkId, {
      txHash,
      votes,
      agreeCount,
      totalVotes,
      resultName,
      rounds,
      savedAt: Date.now(),
    } satisfies TxProof);
  }

  if (!checkId) {
    throw new GenLayerClientError(
      "The transaction succeeded but the check ID could not be resolved. Open History to find your check."
    );
  }

  return { checkId, txHash };
}

export async function getCheck(id: string): Promise<FactCheckRecord> {
  const address = requireContractAddress() as `0x${string}`;
  const client = await getReadClient();
  const result = await client.readContract({
    address,
    functionName: "get_check",
    args: [id],
  });
  return coerceRecord(result);
}

export async function getRecentChecks(limit = 10): Promise<FactCheckRecord[]> {
  const address = requireContractAddress() as `0x${string}`;
  const client = await getReadClient();
  const result = await client.readContract({
    address,
    functionName: "get_recent_checks",
    args: [limit],
  });
  if (!Array.isArray(result)) {
    throw new GenLayerClientError("get_recent_checks did not return a list.");
  }
  return result.map(coerceRecord);
}

export async function getStats(): Promise<ContractStats> {
  const address = requireContractAddress() as `0x${string}`;
  const client = await getReadClient();
  const raw = asRecord(
    await client.readContract({
      address,
      functionName: "get_stats",
      args: [],
    })
  );
  const byTypeRaw =
    raw.verdicts_by_type && typeof raw.verdicts_by_type === "object"
      ? (raw.verdicts_by_type as Record<string, unknown>)
      : {};
  const verdicts_by_type: ContractStats["verdicts_by_type"] = {};
  for (const [key, value] of Object.entries(byTypeRaw)) {
    if (isVerdict(key)) {
      verdicts_by_type[key] = Number(value);
    }
  }
  const modesRaw =
    raw.modes && typeof raw.modes === "object"
      ? (raw.modes as Record<string, unknown>)
      : {};
  const modes: ContractStats["modes"] = {};
  for (const [key, value] of Object.entries(modesRaw)) {
    if (isVerificationMode(key)) {
      modes[key] = Number(value);
    }
  }
  return {
    total_checks: Number(raw.total_checks ?? 0),
    verdicts_by_type,
    modes,
    most_recent_timestamp: Number(raw.most_recent_timestamp ?? 0),
  };
}

export function truncateHash(hash: string, head = 6, tail = 4): string {
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}...${hash.slice(-tail)}`;
}
