import json
import sys
from pathlib import Path

from db.repository import get_client, seed

DEFAULT = Path(__file__).parent.parent / "data" / "samples" / "mock.json"

path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
seed(get_client(), json.loads(path.read_text(encoding="utf-8")))
print("Seeded database from", path)