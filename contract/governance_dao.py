# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""TruthLock Governance DAO — On-Chain Proposal Verification.

A GenLayer Intelligent Contract that integrates with TruthLock to bring
evidence-based governance to DAOs.

How it works:
1. Admin initializes the DAO and manages an enforced membership list
2. A member submits a proposal with a factual claim + TruthLock check ID
3. The contract reads TruthLock.get_check() to verify the claim's verdict,
   confidence, and verification mode
4. Members vote on the proposal (one vote each)
5. Execution requires: VERIFIED status, quorum (≥50% of members voting),
   2/3 supermajority, confidence ≥ threshold, and SOURCE_VERIFIED mode
6. FALSE/MISLEADING verdicts flag proposals as disputed

This demonstrates real cross-contract integration on GenLayer:
  GovernanceDAO → gl.get_contract(truthlock) → get_check(id)
"""

import json
import time
from dataclasses import dataclass

from genlayer import *

MAX_TITLE_LENGTH = 200
MAX_DESCRIPTION_LENGTH = 1000
MAX_RECENT_LIMIT = 50
DEFAULT_RECENT_LIMIT = 10
MIN_CONFIDENCE_THRESHOLD = 70
QUORUM_DIVISOR = 2          # quorum: total_voters >= ceil(member_count / 2)
SUPERMAJORITY_NUMERATOR = 2 # supermajority: votes_for * 3 >= total_voters * 2
SUPERMAJORITY_DENOMINATOR = 3
MODE_SOURCE_VERIFIED = "SOURCE_VERIFIED"
MODE_KNOWLEDGE_BASED = "KNOWLEDGE_BASED"

STATUS_PENDING = "PENDING"
STATUS_VERIFIED = "VERIFIED"
STATUS_DISPUTED = "DISPUTED"
STATUS_UNVERIFIABLE = "UNVERIFIABLE"
STATUS_EXECUTED = "EXECUTED"
VALID_STATUSES = (
    STATUS_PENDING,
    STATUS_VERIFIED,
    STATUS_DISPUTED,
    STATUS_UNVERIFIABLE,
    STATUS_EXECUTED,
)

VERDICT_TRUE = "TRUE"
VERDICT_FALSE = "FALSE"
VERDICT_MISLEADING = "MISLEADING"
VERDICT_UNVERIFIABLE = "UNVERIFIABLE"

# Mapping from TruthLock verdict → proposal status
VERDICT_TO_STATUS = {
    VERDICT_TRUE: STATUS_VERIFIED,
    VERDICT_FALSE: STATUS_DISPUTED,
    VERDICT_MISLEADING: STATUS_DISPUTED,
    VERDICT_UNVERIFIABLE: STATUS_UNVERIFIABLE,
}


@allow_storage
@dataclass
class Proposal:
    id: str
    title: str
    description: str
    proposer: str                  # wallet address
    truthlock_check_id: str        # reference to TruthLock verification
    truthlock_verdict: str         # cached verdict from TruthLock
    truthlock_confidence: bigint   # cached confidence
    truthlock_mode: str            # cached verification mode from TruthLock
    status: str                    # PENDING | VERIFIED | DISPUTED | UNVERIFIABLE | EXECUTED
    votes_for: bigint              # number of votes in favor
    votes_against: bigint          # number of votes against
    total_voters: bigint           # unique voters
    timestamp: bigint              # creation time
    executed_at: bigint            # execution time (0 if not executed)


@allow_storage
@dataclass
class Vote:
    voter: str                     # wallet address
    proposal_id: str
    support: bool                  # True = for, False = against
    timestamp: bigint


class GovernanceDAO(gl.Contract):
    proposals: TreeMap[str, Proposal]
    votes: TreeMap[str, Vote]      # key = proposal_id + ":" + voter
    total_proposals: bigint
    member_count: bigint
    members: TreeMap[str, bool]    # address → is_member
    admin: str                     # set once by initialize()
    truthlock_address: str         # deployed TruthLock contract address
    min_confidence: bigint         # minimum confidence threshold

    def __init__(self):
        self.total_proposals = 0
        self.member_count = 0
        self.min_confidence = MIN_CONFIDENCE_THRESHOLD
        self.admin = ""

    # ------------------------------------------------------------------
    # Initialization & membership
    # ------------------------------------------------------------------

    @gl.public.write
    def initialize(self, truthlock_address) -> str:
        """Set the TruthLock contract address and admin. Call only once."""
        if self.truthlock_address != "":
            raise gl.UserError("Already initialized")
        # Handle both direct string and list-wrapped (CLI) args
        if isinstance(truthlock_address, (list, tuple)) and len(truthlock_address) > 0:
            truthlock_address = truthlock_address[0]
        if not isinstance(truthlock_address, str):
            truthlock_address = str(truthlock_address) if truthlock_address else ""
        addr = truthlock_address.strip()
        if addr == "":
            raise gl.UserError("TruthLock address required")
        self.truthlock_address = addr
        self.admin = str(gl.message.sender_address).lower()
        return "initialized"

    @gl.public.write
    def add_member(self, address) -> str:
        """Add a DAO member. Admin-only."""
        self._require_admin()
        addr = self._normalize_address(address)
        if addr == "":
            raise gl.UserError("Address required")
        if addr in self.members:
            raise gl.UserError("Already a member")
        self.members[addr] = True
        self.member_count += 1
        return f"member added: {addr}"

    @gl.public.write
    def remove_member(self, address) -> str:
        """Remove a DAO member. Admin-only."""
        self._require_admin()
        addr = self._normalize_address(address)
        if addr == "":
            raise gl.UserError("Address required")
        if addr not in self.members:
            raise gl.UserError("Not a member")
        del self.members[addr]
        self.member_count -= 1
        return f"member removed: {addr}"

    # ------------------------------------------------------------------
    # Proposal lifecycle
    # ------------------------------------------------------------------

    @gl.public.write
    def submit_proposal(
        self,
        title: str,
        description: str,
        truthlock_check_id: str,
    ) -> str:
        """Submit a DAO proposal backed by a TruthLock verification.

        Sender must be an active member. The contract reads
        TruthLock.get_check(truthlock_check_id) to verify the claim's
        verdict, confidence, and verification mode.
        Returns the proposal ID.
        """
        self._validate_proposal_inputs(title, description)
        if self.truthlock_address == "":
            raise gl.UserError("Contract not initialized. Call initialize() first.")
        self._require_member()

        # Read TruthLock verdict via cross-contract call
        verdict, confidence, mode = self._read_truthlock_verdict(truthlock_check_id)

        # Map verdict to proposal status
        status = VERDICT_TO_STATUS.get(verdict, STATUS_UNVERIFIABLE)

        proposal_id = str(gl.message.sender_address)[-8:] + str(int(time.time()))

        proposal = Proposal(
            id=proposal_id,
            title=title.strip(),
            description=description.strip() if description else "",
            proposer=str(gl.message.sender_address),
            truthlock_check_id=truthlock_check_id.strip(),
            truthlock_verdict=verdict,
            truthlock_confidence=confidence,
            truthlock_mode=mode,
            status=status,
            votes_for=0,
            votes_against=0,
            total_voters=0,
            timestamp=int(time.time()),
            executed_at=0,
        )
        self.proposals[proposal_id] = proposal
        self.total_proposals += 1
        return proposal_id

    @gl.public.write
    def vote(self, proposal_id: str, support: bool) -> str:
        """Cast a vote on a proposal.

        support=True → vote FOR
        support=False → vote AGAINST

        Sender must be an active member. Only VERIFIED and DISPUTED
        proposals can receive votes. Each member can only vote once.
        """
        self._require_member()
        if proposal_id not in self.proposals:
            raise gl.UserError("Proposal not found")

        proposal = self.proposals[proposal_id]
        if proposal.status not in (STATUS_VERIFIED, STATUS_DISPUTED):
            raise gl.UserError(f"Cannot vote on {proposal.status} proposals")

        voter = str(gl.message.sender_address).lower()
        vote_key = f"{proposal_id}:{voter}"
        if vote_key in self.votes:
            raise gl.UserError("Already voted on this proposal")

        vote = Vote(
            voter=voter,
            proposal_id=proposal_id,
            support=support,
            timestamp=int(time.time()),
        )
        self.votes[vote_key] = vote
        proposal.total_voters += 1
        if support:
            proposal.votes_for += 1
        else:
            proposal.votes_against += 1
        self.proposals[proposal_id] = proposal
        return f"vote cast: {'FOR' if support else 'AGAINST'}"

    @gl.public.write
    def execute_proposal(self, proposal_id: str) -> str:
        """Execute a verified proposal.

        Requirements (all must hold):
        - Status must be VERIFIED (TruthLock returned TRUE)
        - Quorum: total_voters >= ceil(member_count / 2)
        - Supermajority: votes_for * 3 >= total_voters * 2 (≥ 2/3 FOR)
        - Confidence must meet minimum threshold (default 70)
        - TruthLock verification_mode must be SOURCE_VERIFIED
        """
        if proposal_id not in self.proposals:
            raise gl.UserError("Proposal not found")

        proposal = self.proposals[proposal_id]
        if proposal.status != STATUS_VERIFIED:
            raise gl.UserError(f"Only VERIFIED proposals can be executed (current: {proposal.status})")
        if proposal.votes_for == 0:
            raise gl.UserError("No votes in favor")

        # Quorum: at least half of members must have voted
        quorum = (self.member_count + QUORUM_DIVISOR - 1) // QUORUM_DIVISOR
        if proposal.total_voters < quorum:
            raise gl.UserError(
                f"Quorum not met: {proposal.total_voters}/{proposal.total_voters} voted, "
                f"need >= {quorum} of {self.member_count} members"
            )

        # Supermajority: ≥ 2/3 of votes must be FOR
        if proposal.votes_for * SUPERMAJORITY_DENOMINATOR < proposal.total_voters * SUPERMAJORITY_NUMERATOR:
            raise gl.UserError(
                "Supermajority not met: need at least 2/3 of votes in favor"
            )

        if proposal.truthlock_confidence < self.min_confidence:
            raise gl.UserError(
                f"Confidence {proposal.truthlock_confidence}% below threshold {self.min_confidence}%"
            )

        if proposal.truthlock_mode != MODE_SOURCE_VERIFIED:
            raise gl.UserError(
                "Only SOURCE_VERIFIED TruthLock checks can drive execution "
                f"(got {proposal.truthlock_mode})"
            )

        proposal.status = STATUS_EXECUTED
        proposal.executed_at = int(time.time())
        self.proposals[proposal_id] = proposal
        return f"proposal executed: {proposal_id}"

    # ------------------------------------------------------------------
    # View methods
    # ------------------------------------------------------------------

    @gl.public.view
    def get_proposal(self, proposal_id: str) -> dict:
        """Return a proposal by ID."""
        if proposal_id not in self.proposals:
            raise gl.UserError("Proposal not found")
        return self._proposal_to_dict(self.proposals[proposal_id])

    @gl.public.view
    def get_recent_proposals(self, limit: int = DEFAULT_RECENT_LIMIT) -> list:
        """Return the last N proposals sorted by timestamp desc."""
        if limit is None or limit <= 0:
            limit = DEFAULT_RECENT_LIMIT
        limit = min(limit, MAX_RECENT_LIMIT)

        proposals = sorted(
            list(self.proposals.values()),
            key=lambda p: p.timestamp,
            reverse=True,
        )
        return [self._proposal_to_dict(p) for p in proposals[:limit]]

    @gl.public.view
    def get_proposal_votes(self, proposal_id: str) -> dict:
        """Return vote counts for a proposal."""
        if proposal_id not in self.proposals:
            raise gl.UserError("Proposal not found")
        proposal = self.proposals[proposal_id]
        return {
            "proposal_id": proposal_id,
            "votes_for": proposal.votes_for,
            "votes_against": proposal.votes_against,
            "total_voters": proposal.total_voters,
        }

    @gl.public.view
    def get_stats(self) -> dict:
        """Return governance stats."""
        statuses = {}
        for s in VALID_STATUSES:
            statuses[s] = 0
        for proposal in self.proposals.values():
            if proposal.status in statuses:
                statuses[proposal.status] += 1
        return {
            "total_proposals": self.total_proposals,
            "member_count": self.member_count,
            "admin": self.admin,
            "statuses": statuses,
            "truthlock_address": self.truthlock_address,
            "min_confidence": self.min_confidence,
            "quorum_divisor": QUORUM_DIVISOR,
            "supermajority": f"{SUPERMAJORITY_NUMERATOR}/{SUPERMAJORITY_DENOMINATOR}",
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _validate_proposal_inputs(self, title: str, description: str) -> None:
        if title is None or len(title.strip()) == 0:
            raise gl.UserError("Title must be non-empty")
        if len(title) > MAX_TITLE_LENGTH:
            raise gl.UserError("Title must be 200 characters or fewer")
        if description is None or description.strip() == "":
            description = ""
        if len(description) > MAX_DESCRIPTION_LENGTH:
            raise gl.UserError("Description must be 1000 characters or fewer")

    @staticmethod
    def _normalize_address(address) -> str:
        if isinstance(address, (list, tuple)) and len(address) > 0:
            address = address[0]
        if not isinstance(address, str):
            address = str(address) if address else ""
        return address.strip().lower()

    def _require_admin(self) -> None:
        sender = str(gl.message.sender_address).lower()
        if self.admin == "" or sender != self.admin:
            raise gl.UserError("Only the admin can manage members")

    def _require_member(self) -> None:
        sender = str(gl.message.sender_address).lower()
        if sender not in self.members or not self.members[sender]:
            raise gl.UserError("Sender is not an active DAO member")

    def _read_truthlock_verdict(self, check_id: str) -> tuple[str, int, str]:
        """Cross-contract call to TruthLock.get_check().

        Returns (verdict, confidence, verification_mode).
        Falls back to UNVERIFIABLE/0/KNOWLEDGE_BASED if the call fails.
        """
        try:
            truthlock = gl.get_contract(self.truthlock_address)
            result = truthlock.get_check(check_id)
            if isinstance(result, dict):
                verdict = result.get("verdict", VERDICT_UNVERIFIABLE)
                confidence = result.get("confidence", 0)
                mode = result.get("verification_mode", MODE_KNOWLEDGE_BASED)
                if verdict not in (
                    VERDICT_TRUE, VERDICT_FALSE,
                    VERDICT_MISLEADING, VERDICT_UNVERIFIABLE,
                ):
                    verdict = VERDICT_UNVERIFIABLE
                try:
                    confidence = int(confidence)
                except (TypeError, ValueError):
                    confidence = 0
                confidence = max(0, min(100, confidence))
                if mode not in (MODE_SOURCE_VERIFIED, MODE_KNOWLEDGE_BASED):
                    mode = MODE_KNOWLEDGE_BASED
                return verdict, confidence, mode
            return VERDICT_UNVERIFIABLE, 0, MODE_KNOWLEDGE_BASED
        except Exception:
            return VERDICT_UNVERIFIABLE, 0, MODE_KNOWLEDGE_BASED

    def _proposal_to_dict(self, proposal: Proposal) -> dict:
        return {
            "id": proposal.id,
            "title": proposal.title,
            "description": proposal.description,
            "proposer": proposal.proposer,
            "truthlock_check_id": proposal.truthlock_check_id,
            "truthlock_verdict": proposal.truthlock_verdict,
            "truthlock_confidence": proposal.truthlock_confidence,
            "truthlock_mode": proposal.truthlock_mode,
            "status": proposal.status,
            "votes_for": proposal.votes_for,
            "votes_against": proposal.votes_against,
            "total_voters": proposal.total_voters,
            "timestamp": proposal.timestamp,
            "executed_at": proposal.executed_at,
        }
