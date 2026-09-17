import json
import random
import sys
from pathlib import Path

OUT_DIR = Path(__file__).parent.parent / "data" / "samples"
MODULES_PER_GROUP = 6
LABS_PER_GROUP = 2


def generate(n_groups=20, seed=1):
    """Build a fake but realistic school with n_groups intake groups."""
    rng = random.Random(seed)

    # Rooms grow with the number of groups
    rooms = {}
    for i in range(1, n_groups // 2 + 3):
        rooms[f"R{100 + i}"] = {"cap": 40, "type": "lecture"}
    for i in range(1, 3):
        rooms[f"HALL{i}"] = {"cap": 120, "type": "lecture"}
    for i in range(1, n_groups // 5 + 2):
        rooms[f"LAB{i}"] = {"cap": 40, "type": "lab"}

    lecturers = [f"Lecturer {i:02d}" for i in range(1, n_groups // 2 + 3)]

    groups = {}
    lessons = []
    for g in range(1, n_groups + 1):
        group = f"G{g:02d}"
        groups[group] = rng.randint(20, 40)
        for m in range(1, MODULES_PER_GROUP + 1):
            lab = m > MODULES_PER_GROUP - LABS_PER_GROUP
            lessons.append({
                "id": f"{group}-M{m}",
                "module": f"Module {m}{' Lab' if lab else ''}",
                "group": group,
                "lecturer": rng.choice(lecturers),
                "hours": 2 if lab else rng.choice([2, 3]),
                "lab": lab,
            })

    return {"rooms": rooms, "groups": groups, "lessons": lessons}


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 20
    path = OUT_DIR / f"generated_{n}.json"
    path.write_text(json.dumps(generate(n), indent=2), encoding="utf-8")
    print("Wrote", path)