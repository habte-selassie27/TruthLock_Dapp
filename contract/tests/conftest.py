"""Pytest configuration for the direct-mode contract test suites.

`fact_checker.py` imports `source_independence` from its own directory, so
`contract/` must be on sys.path. Adding it here makes the documented command
work from the repo root without extra env vars:

    python3 -m pytest contract/tests/test_direct.py -v
"""

import sys
from pathlib import Path

CONTRACT_DIR = Path(__file__).resolve().parent.parent
if str(CONTRACT_DIR) not in sys.path:
    sys.path.insert(0, str(CONTRACT_DIR))
