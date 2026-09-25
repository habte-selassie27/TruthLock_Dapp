"""Direct mode unit tests for GovernanceDAO contract.

Mocks TruthLock cross-contract calls. Each test runs in <500ms.
"""

import importlib.util
import json
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# ---------------------------------------------------------------------------
# Fake `genlayer` module (must exist before governance_dao is imported)
# ---------------------------------------------------------------------------

CONTRACT_DIR = Path(__file__).resolve().parent.parent
GOV_CONTRACT_PATH = CONTRACT_DIR / "governance_dao.py"

FAKE_SENDER = "0xabcdef1234567890"
FAKE_SENDER_SUFFIX = FAKE_SENDER[-8:]
FAKE_MEMBER_1 = "0x1111111111111111"
FAKE_MEMBER_2 = "0x2222222222222222"
FAKE_MEMBER_3 = "0x3333333333333333"

# TruthLock mock check IDs
TL_CHECK_TRUE = "tl_check_true_001"
TL_CHECK_FALSE = "tl_check_false_002"
TL_CHECK_MISLEADING = "tl_check_mislead_003"
TL_CHECK_UNVERIFIABLE = "tl_check_unverif_004"
TL_CHECK_KNOWLEDGE_TRUE = "tl_check_knowledge_005"


class _FakeMessage:
    sender = FAKE_SENDER
    sender_address = FAKE_SENDER


class _FakeBlock:
    number = 1042881
    timestamp = 1755948000


class _UserError(ValueError):
    pass


class _TreeMap(dict):
    pass


class _DynArray(list):
    pass


def _allow_storage(cls):
    return cls


def _storage_default(annotation):
    import typing
    origin = typing.get_origin(annotation) or annotation
    if isinstance(origin, type) and issubclass(origin, dict):
        return _TreeMap()
    if isinstance(origin, type) and issubclass(origin, list):
        return _DynArray()
    if origin is int:
        return 0
    if origin is str:
        return ""
    if origin is bool:
        return False
    return None


class _FakeContract:
    def __new__(cls, *args, **kwargs):
        instance = super().__new__(cls)
        for klass in reversed(cls.__mro__):
            for name in getattr(klass, "__annotations__", {}):
                setattr(instance, name, _storage_default(klass.__annotations__[name]))
        return instance


def _passthrough_decorator(func=None, **kwargs):
    if callable(func):
        return func
    def decorator(fn):
        return fn
    return decorator


class _FakeGL(types.SimpleNamespace):
    def __init__(self):
        super().__init__()
        self.Contract = _FakeContract
        self.UserError = _UserError
        self.public = types.SimpleNamespace(
            write=_passthrough_decorator,
            view=_passthrough_decorator,
        )
        self.message = _FakeMessage()
        self.block = _FakeBlock()
        self.nondet = types.SimpleNamespace(exec_prompt=MagicMock())
        self.get_webpage = MagicMock()

        def fake_prompt_comparative(fn, principle=None):
            return fn()

        self.eq_principle = types.SimpleNamespace(
            prompt_comparative=fake_prompt_comparative
        )


def _build_fake_genlayer():
    module = types.ModuleType("genlayer")
    fake_gl = _FakeGL()
    module.gl = fake_gl
    module.TreeMap = _TreeMap
    module.DynArray = _DynArray
    module.allow_storage = _allow_storage
    module.bigint = int
    return module, fake_gl


_FAKE_MODULE, FAKE_GL = _build_fake_genlayer()
sys.modules["genlayer"] = _FAKE_MODULE


def _load_governance():
    spec = importlib.util.spec_from_file_location("governance_dao", GOV_CONTRACT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


gov_module = _load_governance()
GovernanceDAO = gov_module.GovernanceDAO

# Mock time
_FAKE_TIME_TS = 1755948000
_mock_time = MagicMock(return_value=_FAKE_TIME_TS)
gov_module.time.time = _mock_time

# ---------------------------------------------------------------------------
# TruthLock mock data
# ---------------------------------------------------------------------------

TRUTHLOCK_ADDRESS = "0xTRUTHLOCK_CONTRACT_ADDR_001"

MOCK_TL_RECORDS = {
    TL_CHECK_TRUE: {
        "id": TL_CHECK_TRUE,
        "claim": "Ethereum launched in 2015",
        "verdict": "TRUE",
        "confidence": 95,
        "explanation": "All sources confirm.",
        "sources_checked": ["https://ethereum.org", "https://en.wikipedia.org/wiki/Ethereum"],
        "verification_mode": "SOURCE_VERIFIED",
        "source_status": "FETCHED",
    },
    TL_CHECK_FALSE: {
        "id": TL_CHECK_FALSE,
        "claim": "Bitcoin was created by the US government",
        "verdict": "FALSE",
        "confidence": 92,
        "explanation": "Sources contradict this claim.",
        "sources_checked": ["https://bitcoin.org"],
        "verification_mode": "SOURCE_VERIFIED",
        "source_status": "FETCHED",
    },
    TL_CHECK_MISLEADING: {
        "id": TL_CHECK_MISLEADING,
        "claim": "AI will replace all jobs by 2025",
        "verdict": "MISLEADING",
        "confidence": 65,
        "explanation": "Partially true but omits critical context.",
        "sources_checked": ["https://example.com"],
        "verification_mode": "SOURCE_VERIFIED",
        "source_status": "FETCHED",
    },
    TL_CHECK_UNVERIFIABLE: {
        "id": TL_CHECK_UNVERIFIABLE,
        "claim": "Some unverifiable claim",
        "verdict": "UNVERIFIABLE",
        "confidence": 10,
        "explanation": "Insufficient evidence.",
        "sources_checked": [],
        "verification_mode": "KNOWLEDGE_BASED",
        "source_status": "NOT_PROVIDED",
    },
    TL_CHECK_KNOWLEDGE_TRUE: {
        "id": TL_CHECK_KNOWLEDGE_TRUE,
        "claim": "A knowledge-mode true claim",
        "verdict": "TRUE",
        "confidence": 85,
        "explanation": "Known from model knowledge without live sources.",
        "sources_checked": [],
        "verification_mode": "KNOWLEDGE_BASED",
        "source_status": "NOT_PROVIDED",
    },
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def truthlock_mock():
    """Mock gl.get_contract that returns TruthLock records."""
    mock_contract = MagicMock()
    def get_check(check_id):
        record = MOCK_TL_RECORDS.get(check_id)
        if record is None:
            raise Exception(f"Check not found: {check_id}")
        return record

    mock_contract.get_check = get_check
    FAKE_GL.get_contract = MagicMock(return_value=mock_contract)
    yield mock_contract


@pytest.fixture()
def dao(truthlock_mock):
    import time as _time_mod
    _mock_time.return_value = _FAKE_TIME_TS
    _time_mod.time = _mock_time
    FAKE_GL.message.sender_address = FAKE_SENDER
    FAKE_GL.message.sender = FAKE_SENDER
    contract = GovernanceDAO()
    contract.initialize(TRUTHLOCK_ADDRESS)  # admin = FAKE_SENDER
    # Admin is also an active member so they can propose/vote
    contract.add_member(FAKE_SENDER)
    contract.add_member(FAKE_MEMBER_1)
    contract.add_member(FAKE_MEMBER_2)
    contract.add_member(FAKE_MEMBER_3)
    return contract


def advance_time(seconds=12):
    _mock_time.return_value += seconds


def submit_proposal(dao, title="Test Proposal", desc="A test proposal", check_id=TL_CHECK_TRUE):
    proposal_id = dao.submit_proposal(
        title=title,
        description=desc,
        truthlock_check_id=check_id,
    )
    advance_time()
    return proposal_id


def cast_votes(dao, proposal_id, votes):
    """votes: list of (sender, support) tuples."""
    _orig = FAKE_GL.message.sender_address
    for sender, support in votes:
        FAKE_GL.message.sender_address = sender
        dao.vote(proposal_id, support)
    FAKE_GL.message.sender_address = _orig


def execute_happy_path_votes(dao, proposal_id, for_senders=None):
    """Cast enough FOR votes to satisfy quorum (≥2 of 4) and 2/3 supermajority."""
    senders = for_senders or [FAKE_SENDER, FAKE_MEMBER_1]
    cast_votes(dao, proposal_id, [(s, True) for s in senders])


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestInitialization:
    def test_initialize_sets_address(self, dao):
        assert dao.truthlock_address == TRUTHLOCK_ADDRESS
        assert dao.admin == FAKE_SENDER.lower()

    def test_initialize_cannot_be_called_twice(self, dao):
        with pytest.raises(Exception, match="Already initialized"):
            dao.initialize("0xanother")

    def test_initialize_requires_address(self):
        contract = GovernanceDAO()
        with pytest.raises(Exception, match="TruthLock address required"):
            contract.initialize("")

    def test_add_member(self, dao):
        assert dao.member_count == 4  # admin + 3 members

    def test_add_duplicate_member_rejected(self, dao):
        with pytest.raises(Exception, match="Already a member"):
            dao.add_member(FAKE_MEMBER_1)

    def test_add_member_admin_only(self, dao):
        FAKE_GL.message.sender_address = FAKE_MEMBER_1
        try:
            with pytest.raises(Exception, match="admin"):
                dao.add_member("0x9999999999999999")
        finally:
            FAKE_GL.message.sender_address = FAKE_SENDER

    def test_remove_member_admin_only(self, dao):
        FAKE_GL.message.sender_address = FAKE_MEMBER_1
        try:
            with pytest.raises(Exception, match="admin"):
                dao.remove_member(FAKE_MEMBER_2)
        finally:
            FAKE_GL.message.sender_address = FAKE_SENDER

    def test_remove_member(self, dao):
        dao.remove_member(FAKE_MEMBER_3)
        assert dao.member_count == 3
        with pytest.raises(Exception, match="Not a member"):
            dao.remove_member(FAKE_MEMBER_3)


class TestProposalSubmission:
    def test_submit_proposal_reads_truthlock(self, dao):
        proposal_id = submit_proposal(dao)
        proposal = dao.get_proposal(proposal_id)
        assert proposal["title"] == "Test Proposal"
        assert proposal["truthlock_verdict"] == "TRUE"
        assert proposal["truthlock_confidence"] == 95
        assert proposal["status"] == "VERIFIED"

    def test_submit_false_verdict_creates_disputed(self, dao):
        proposal_id = submit_proposal(dao, check_id=TL_CHECK_FALSE)
        proposal = dao.get_proposal(proposal_id)
        assert proposal["truthlock_verdict"] == "FALSE"
        assert proposal["status"] == "DISPUTED"

    def test_submit_misleading_verdict_creates_disputed(self, dao):
        proposal_id = submit_proposal(dao, check_id=TL_CHECK_MISLEADING)
        proposal = dao.get_proposal(proposal_id)
        assert proposal["truthlock_verdict"] == "MISLEADING"
        assert proposal["status"] == "DISPUTED"

    def test_submit_unverifiable_verdict(self, dao):
        proposal_id = submit_proposal(dao, check_id=TL_CHECK_UNVERIFIABLE)
        proposal = dao.get_proposal(proposal_id)
        assert proposal["truthlock_verdict"] == "UNVERIFIABLE"
        assert proposal["status"] == "UNVERIFIABLE"

    def test_proposal_id_format(self, dao):
        proposal_id = submit_proposal(dao)
        assert proposal_id.startswith(FAKE_SENDER_SUFFIX)

    def test_proposal_stores_proposer(self, dao):
        proposal_id = submit_proposal(dao)
        proposal = dao.get_proposal(proposal_id)
        assert proposal["proposer"] == FAKE_SENDER

    def test_proposal_stores_check_id(self, dao):
        proposal_id = submit_proposal(dao, check_id=TL_CHECK_FALSE)
        proposal = dao.get_proposal(proposal_id)
        assert proposal["truthlock_check_id"] == TL_CHECK_FALSE

    def test_total_proposals_increments(self, dao):
        assert dao.total_proposals == 0
        submit_proposal(dao)
        assert dao.total_proposals == 1
        submit_proposal(dao, title="Second")
        assert dao.total_proposals == 2

    def test_empty_title_rejected(self, dao):
        with pytest.raises(Exception, match="Title must be non-empty"):
            dao.submit_proposal(title="", description="desc", truthlock_check_id=TL_CHECK_TRUE)

    def test_title_too_long_rejected(self, dao):
        with pytest.raises(Exception, match="200 characters or fewer"):
            dao.submit_proposal(title="x" * 201, description="desc", truthlock_check_id=TL_CHECK_TRUE)

    def test_description_too_long_rejected(self, dao):
        with pytest.raises(Exception, match="1000 characters or fewer"):
            dao.submit_proposal(title="OK", description="x" * 1001, truthlock_check_id=TL_CHECK_TRUE)

    def test_uninitialized_contract_rejects(self):
        contract = GovernanceDAO()
        with pytest.raises(Exception, match="not initialized"):
            contract.submit_proposal("Title", "Desc", TL_CHECK_TRUE)

    def test_unknown_check_id_returns_unverifiable(self, dao):
        proposal_id = dao.submit_proposal(
            title="Unknown check",
            description="desc",
            truthlock_check_id="nonexistent_id",
        )
        proposal = dao.get_proposal(proposal_id)
        assert proposal["truthlock_verdict"] == "UNVERIFIABLE"
        assert proposal["status"] == "UNVERIFIABLE"

    def test_non_member_cannot_propose(self, dao):
        FAKE_GL.message.sender_address = "0xDEADBEEFDEADBEEF"
        try:
            with pytest.raises(Exception, match="not an active DAO member"):
                dao.submit_proposal(
                    title="Intruder",
                    description="desc",
                    truthlock_check_id=TL_CHECK_TRUE,
                )
        finally:
            FAKE_GL.message.sender_address = FAKE_SENDER

    def test_proposal_caches_truthlock_mode(self, dao):
        proposal_id = submit_proposal(dao)
        proposal = dao.get_proposal(proposal_id)
        assert proposal["truthlock_mode"] == "SOURCE_VERIFIED"


class TestVoting:
    def test_vote_for_verified_proposal(self, dao):
        proposal_id = submit_proposal(dao)
        result = dao.vote(proposal_id, True)
        assert "FOR" in result
        proposal = dao.get_proposal(proposal_id)
        assert proposal["votes_for"] == 1
        assert proposal["votes_against"] == 0
        assert proposal["total_voters"] == 1

    def test_vote_against_disputed_proposal(self, dao):
        proposal_id = submit_proposal(dao, check_id=TL_CHECK_FALSE)
        result = dao.vote(proposal_id, False)
        assert "AGAINST" in result
        proposal = dao.get_proposal(proposal_id)
        assert proposal["votes_against"] == 1

    def test_cannot_vote_twice(self, dao):
        proposal_id = submit_proposal(dao)
        dao.vote(proposal_id, True)
        with pytest.raises(Exception, match="Already voted"):
            dao.vote(proposal_id, True)

    def test_cannot_vote_on_pending_proposal(self, dao):
        # Submit with a check that returns UNVERIFIABLE → status UNVERIFIABLE
        proposal_id = submit_proposal(dao, check_id=TL_CHECK_UNVERIFIABLE)
        with pytest.raises(Exception, match="Cannot vote on"):
            dao.vote(proposal_id, True)

    def test_cannot_vote_on_executed_proposal(self, dao):
        proposal_id = submit_proposal(dao)
        execute_happy_path_votes(dao, proposal_id)
        dao.execute_proposal(proposal_id)
        with pytest.raises(Exception, match="Cannot vote on"):
            dao.vote(proposal_id, True)

    def test_multiple_members_can_vote(self, dao):
        proposal_id = submit_proposal(dao)

        # Member 1 votes
        _orig_sender = FAKE_GL.message.sender_address
        FAKE_GL.message.sender_address = FAKE_MEMBER_1
        dao.vote(proposal_id, True)

        # Member 2 votes
        FAKE_GL.message.sender_address = FAKE_MEMBER_2
        dao.vote(proposal_id, False)

        # Member 3 votes
        FAKE_GL.message.sender_address = FAKE_MEMBER_3
        dao.vote(proposal_id, True)

        FAKE_GL.message.sender_address = _orig_sender

        votes = dao.get_proposal_votes(proposal_id)
        assert votes["votes_for"] == 2
        assert votes["votes_against"] == 1
        assert votes["total_voters"] == 3

    def test_vote_on_nonexistent_proposal(self, dao):
        with pytest.raises(Exception, match="Proposal not found"):
            dao.vote("nonexistent", True)

    def test_non_member_cannot_vote(self, dao):
        proposal_id = submit_proposal(dao)
        FAKE_GL.message.sender_address = "0xDEADBEEFDEADBEEF"
        try:
            with pytest.raises(Exception, match="not an active DAO member"):
                dao.vote(proposal_id, True)
        finally:
            FAKE_GL.message.sender_address = FAKE_SENDER


class TestExecution:
    def test_execute_happy_path(self, dao):
        """VERIFIED + quorum + 2/3 + confidence ≥70 + SOURCE_VERIFIED → EXECUTED."""
        proposal_id = submit_proposal(dao)
        execute_happy_path_votes(dao, proposal_id)
        result = dao.execute_proposal(proposal_id)
        assert "executed" in result
        proposal = dao.get_proposal(proposal_id)
        assert proposal["status"] == "EXECUTED"
        assert proposal["executed_at"] > 0

    def test_cannot_execute_without_votes(self, dao):
        proposal_id = submit_proposal(dao)
        with pytest.raises(Exception, match="No votes in favor"):
            dao.execute_proposal(proposal_id)

    def test_execute_requires_quorum(self, dao):
        """member_count=4 → quorum=2. Only 1 vote → cannot execute."""
        proposal_id = submit_proposal(dao)
        dao.vote(proposal_id, True)  # only 1 of 4 members
        with pytest.raises(Exception, match="Quorum not met"):
            dao.execute_proposal(proposal_id)

    def test_execute_requires_supermajority(self, dao):
        """2 FOR + 2 AGAINST → quorum met, but FOR < 2/3."""
        proposal_id = submit_proposal(dao)
        cast_votes(
            dao,
            proposal_id,
            [
                (FAKE_SENDER, True),
                (FAKE_MEMBER_1, True),
                (FAKE_MEMBER_2, False),
                (FAKE_MEMBER_3, False),
            ],
        )
        with pytest.raises(Exception, match="Supermajority not met"):
            dao.execute_proposal(proposal_id)

    def test_execute_requires_source_verified(self, dao):
        """TRUE verdict from KNOWLEDGE_BASED mode cannot drive execution."""
        proposal_id = submit_proposal(dao, check_id=TL_CHECK_KNOWLEDGE_TRUE)
        proposal = dao.get_proposal(proposal_id)
        assert proposal["status"] == "VERIFIED"
        assert proposal["truthlock_mode"] == "KNOWLEDGE_BASED"
        execute_happy_path_votes(dao, proposal_id)
        with pytest.raises(Exception, match="SOURCE_VERIFIED"):
            dao.execute_proposal(proposal_id)

    def test_cannot_execute_with_majority_against(self, dao):
        proposal_id = submit_proposal(dao)
        cast_votes(
            dao,
            proposal_id,
            [
                (FAKE_SENDER, True),
                (FAKE_MEMBER_1, False),
                (FAKE_MEMBER_2, False),
            ],
        )
        with pytest.raises(Exception, match="Supermajority not met"):
            dao.execute_proposal(proposal_id)

    def test_cannot_execute_disputed_proposal(self, dao):
        proposal_id = submit_proposal(dao, check_id=TL_CHECK_FALSE)
        cast_votes(dao, proposal_id, [(FAKE_SENDER, True), (FAKE_MEMBER_1, True)])
        with pytest.raises(Exception, match="Only VERIFIED"):
            dao.execute_proposal(proposal_id)

    def test_cannot_execute_unverifiable_proposal(self, dao):
        proposal_id = submit_proposal(dao, check_id=TL_CHECK_UNVERIFIABLE)
        with pytest.raises(Exception, match="Only VERIFIED"):
            dao.execute_proposal(proposal_id)

    def test_execution_sets_timestamp(self, dao):
        proposal_id = submit_proposal(dao)
        execute_happy_path_votes(dao, proposal_id)
        dao.execute_proposal(proposal_id)
        proposal = dao.get_proposal(proposal_id)
        assert proposal["executed_at"] == _mock_time.return_value

    def test_cannot_vote_after_execution(self, dao):
        proposal_id = submit_proposal(dao)
        execute_happy_path_votes(dao, proposal_id)
        dao.execute_proposal(proposal_id)
        with pytest.raises(Exception, match="Cannot vote on"):
            dao.vote(proposal_id, True)

    def test_execute_below_confidence_threshold(self, dao):
        """Confidence < min_confidence blocks execution."""
        low_confidence_id = "tl_check_low_conf_006"
        MOCK_TL_RECORDS[low_confidence_id] = {
            "id": low_confidence_id,
            "claim": "Low confidence true claim",
            "verdict": "TRUE",
            "confidence": 50,
            "explanation": "Weak evidence.",
            "sources_checked": ["https://example.com"],
            "verification_mode": "SOURCE_VERIFIED",
            "source_status": "FETCHED",
        }
        try:
            proposal_id = submit_proposal(dao, check_id=low_confidence_id)
            execute_happy_path_votes(dao, proposal_id)
            with pytest.raises(Exception, match="below threshold"):
                dao.execute_proposal(proposal_id)
        finally:
            MOCK_TL_RECORDS.pop(low_confidence_id, None)


class TestGetters:
    def test_get_proposal_not_found(self, dao):
        with pytest.raises(Exception, match="Proposal not found"):
            dao.get_proposal("nonexistent")

    def test_get_recent_proposals(self, dao):
        submit_proposal(dao, title="First")
        submit_proposal(dao, title="Second")
        submit_proposal(dao, title="Third")
        recent = dao.get_recent_proposals(limit=2)
        assert len(recent) == 2
        assert recent[0]["title"] == "Third"  # newest first
        assert recent[1]["title"] == "Second"

    def test_get_recent_proposals_limit_cap(self, dao):
        for i in range(55):
            submit_proposal(dao, title=f"P{i}")
        recent = dao.get_recent_proposals(limit=500)
        assert len(recent) == 50

    def test_get_recent_proposals_default_limit(self, dao):
        for i in range(15):
            submit_proposal(dao, title=f"P{i}")
        recent = dao.get_recent_proposals()
        assert len(recent) == 10

    def test_get_proposal_votes(self, dao):
        proposal_id = submit_proposal(dao)
        votes = dao.get_proposal_votes(proposal_id)
        assert votes["votes_for"] == 0
        assert votes["votes_against"] == 0

    def test_get_stats(self, dao):
        stats = dao.get_stats()
        assert stats["total_proposals"] == 0
        assert stats["member_count"] == 4
        assert stats["truthlock_address"] == TRUTHLOCK_ADDRESS
        assert stats["min_confidence"] == 70
        assert stats["admin"] == FAKE_SENDER.lower()
        assert stats["supermajority"] == "2/3"

    def test_get_stats_after_submissions(self, dao):
        submit_proposal(dao, title="A", check_id=TL_CHECK_TRUE)
        submit_proposal(dao, title="B", check_id=TL_CHECK_FALSE)
        submit_proposal(dao, title="C", check_id=TL_CHECK_TRUE)
        stats = dao.get_stats()
        assert stats["total_proposals"] == 3
        assert stats["statuses"]["VERIFIED"] == 2
        assert stats["statuses"]["DISPUTED"] == 1


class TestEdgeCases:
    def test_proposal_with_empty_description(self, dao):
        proposal_id = dao.submit_proposal(
            title="No description",
            description="",
            truthlock_check_id=TL_CHECK_TRUE,
        )
        proposal = dao.get_proposal(proposal_id)
        assert proposal["description"] == ""

    def test_proposal_with_none_description(self, dao):
        proposal_id = dao.submit_proposal(
            title="None description",
            description=None,
            truthlock_check_id=TL_CHECK_TRUE,
        )
        proposal = dao.get_proposal(proposal_id)
        assert proposal["description"] == ""
        assert proposal["status"] == "VERIFIED"

    def test_execute_equivalent_votes_not_enough(self, dao):
        """Equal FOR and AGAINST votes → supermajority fails."""
        proposal_id = submit_proposal(dao)
        cast_votes(
            dao,
            proposal_id,
            [(FAKE_SENDER, True), (FAKE_MEMBER_1, False)],
        )
        with pytest.raises(Exception, match="Supermajority not met"):
            dao.execute_proposal(proposal_id)

    def test_vote_key_uniqueness(self, dao):
        """Same address cannot vote twice even with different cases."""
        proposal_id = submit_proposal(dao)
        _orig_sender = FAKE_GL.message.sender_address
        FAKE_GL.message.sender_address = FAKE_MEMBER_1
        dao.vote(proposal_id, True)
        # Try voting with uppercase version of same address
        FAKE_GL.message.sender_address = FAKE_MEMBER_1.upper()
        with pytest.raises(Exception, match="Already voted"):
            dao.vote(proposal_id, False)
        FAKE_GL.message.sender_address = _orig_sender
