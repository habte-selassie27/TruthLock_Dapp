"""Source independence helpers for TruthLock contract post-processing.

These run in the GenVM sandbox alongside fact_checker.py and are used for
deterministic post-processing of LLM outputs and per-source evidence:

- host normalization for provenance records
- counting distinct publishers among successfully FETCHED sources
- pure-Python FNV-1a 64-bit content hashing (no hashlib dependency)
"""

import re
from urllib.parse import urlparse

FETCHED_STATUS = "FETCHED"

FNV64_OFFSET = 0xCBF29CE484222325
FNV64_PRIME = 0x100000001B3
FNV64_MASK = 0xFFFFFFFFFFFFFFFF


def _host(url: str) -> str:
    try:
        parsed = urlparse(url)
        host = parsed.hostname or ""
        if not host:
            return ""
        # Strip www. for grouping purposes.
        return re.sub(r"^www\.", "", host, count=1).lower()
    except Exception:
        return ""


def _fnv1a64_hex(text: str) -> str:
    """FNV-1a 64-bit hash of text as 16-char lowercase hex."""
    h = FNV64_OFFSET
    for ch in str(text):
        h ^= ord(ch)
        h = (h * FNV64_PRIME) & FNV64_MASK
    return format(h, "016x")


def _fetched_host_count(evidence: list) -> int:
    """Count distinct hosts among FETCHED evidence entries.

    `evidence` items may be SourceEvidence dataclasses or plain dicts with
    at least `status` and either `host` or `url`.
    """
    hosts = set()
    for item in evidence or []:
        if isinstance(item, dict):
            status = item.get("status", "")
            url = item.get("url", "")
            host = item.get("host", "") or _host(str(url))
        else:
            status = getattr(item, "status", "")
            url = getattr(item, "url", "")
            host = getattr(item, "host", "") or _host(str(url))
        if status == FETCHED_STATUS and host:
            hosts.add(host)
    return len(hosts)


def _has_independent_fetched_hosts(evidence: list, min_hosts: int = 2) -> bool:
    return _fetched_host_count(evidence) >= min_hosts
