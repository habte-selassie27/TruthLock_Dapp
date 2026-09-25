export const VERDICTS = ["TRUE", "FALSE", "MISLEADING", "UNVERIFIABLE"] as const;

export type Verdict = (typeof VERDICTS)[number];

export const VERIFICATION_MODES = [
  "SOURCE_VERIFIED",
  "KNOWLEDGE_BASED",
] as const;

export type VerificationMode = (typeof VERIFICATION_MODES)[number];

export const SOURCE_STATUSES = [
  "NOT_PROVIDED",
  "FETCHED",
  "EMPTY",
  "BLOCKED",
  "TIMEOUT",
  "INVALID",
  "ERROR",
] as const;

export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const SOURCE_ROLES = ["primary", "corroborating"] as const;

export type SourceRole = (typeof SOURCE_ROLES)[number];

export interface SourceEvidence {
  url: string;
  status: SourceStatus;
  role: SourceRole;
  host: string;
  content_length: number;
  content_hash: string;
  retrieved_at: number;
}

export interface FactCheckRecord {
  id: string;
  claim: string;
  source_url: string;
  source_urls: string[];
  verdict: Verdict;
  confidence: number;
  explanation: string;
  sources_checked: string[];
  verification_mode: VerificationMode;
  source_status: SourceStatus;
  source_details: SourceEvidence[];
  timestamp: number;
  tx_hash?: string;
  submitter: string;
}

export interface ContractStats {
  total_checks: number;
  verdicts_by_type: Partial<Record<Verdict, number>>;
  modes?: Partial<Record<VerificationMode, number>>;
  most_recent_timestamp: number;
}

export type TxStatus =
  | "idle"
  | "wallet"
  | "pending"
  | "confirming"
  | "done"
  | "error";

export function isVerdict(value: unknown): value is Verdict {
  return typeof value === "string" && (VERDICTS as readonly string[]).includes(value);
}

export function isVerificationMode(value: unknown): value is VerificationMode {
  return (
    typeof value === "string" &&
    (VERIFICATION_MODES as readonly string[]).includes(value)
  );
}

export function isSourceStatus(value: unknown): value is SourceStatus {
  return (
    typeof value === "string" &&
    (SOURCE_STATUSES as readonly string[]).includes(value)
  );
}

export function isSourceRole(value: unknown): value is SourceRole {
  return typeof value === "string" && (SOURCE_ROLES as readonly string[]).includes(value);
}

export const SOURCE_STATUS_LABELS: Record<SourceStatus, string> = {
  NOT_PROVIDED: "No source provided",
  FETCHED: "Retrieved",
  EMPTY: "Empty page",
  BLOCKED: "Blocked / 403",
  TIMEOUT: "Timed out",
  INVALID: "Invalid URL",
  ERROR: "Fetch error",
};

// ── Governance types ──────────────────────────────────────────────

export const PROPOSAL_STATUSES = [
  "PENDING",
  "VERIFIED",
  "DISPUTED",
  "UNVERIFIABLE",
  "EXECUTED",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  truthlock_check_id: string;
  truthlock_verdict: Verdict;
  truthlock_confidence: number;
  truthlock_mode: VerificationMode;
  status: ProposalStatus;
  votes_for: number;
  votes_against: number;
  total_voters: number;
  timestamp: number;
  executed_at: number;
}

export interface GovernanceStats {
  total_proposals: number;
  member_count: number;
  admin?: string;
  statuses: Partial<Record<ProposalStatus, number>>;
  truthlock_address: string;
  min_confidence: number;
  quorum_divisor?: number;
  supermajority?: string;
}

export function isProposalStatus(value: unknown): value is ProposalStatus {
  return (
    typeof value === "string" &&
    (PROPOSAL_STATUSES as readonly string[]).includes(value)
  );
}
