"""pytest config for scripts/tests/ — adds collectors/ to sys.path so
collectors.base_collector can be imported."""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
COLLECTORS = REPO_ROOT / "collectors"
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(COLLECTORS))
