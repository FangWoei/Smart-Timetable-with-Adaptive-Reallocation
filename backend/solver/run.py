import json
import sys
from pathlib import Path

from solver.engine import DAYS, SolverError, solve

DEFAULT_FILE = Path(__file__).parent.parent / "data" / "samples" / "mock.json"


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_FILE
    data = json.loads(path.read_text(encoding="utf-8"))

    try:
        result = solve(data)
    except SolverError as e:
        print("Error:", e)
        sys.exit(1)

    print(result["status"], "| penalty =", result["penalty"], "\n")

    current = None
    for e in result["entries"]:
        if e["group"] != current:
            print(f"== {e['group']} ==")
            current = e["group"]
        day = DAYS[e["day"] - 1]
        print(f"  {day} {e['start_time']}-{e['end_time']}  {e['module']:<18} {e['room']:<5} {e['lecturer']}")


if __name__ == "__main__":
    main()