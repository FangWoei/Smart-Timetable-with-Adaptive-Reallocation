import json
from pathlib import Path

from db.repository import get_client

path = Path(__file__).parent.parent / "data" / "samples" / "rooms.json"
rooms = json.loads(path.read_text(encoding="utf-8"))

sb = get_client()
sb.table("rooms").upsert(
    [{"code": c, "capacity": r["cap"], "room_type": r["type"]}
     for c, r in rooms.items()],
    on_conflict="code",
).execute()
print(f"Seeded {len(rooms)} rooms")