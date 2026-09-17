import argparse
import json
import sys
from pathlib import Path

from solver.engine import DAYS, SolverError, solve

DEFAULT_FILE = Path(__file__).parent.parent / "data" / "samples" / "mock.json"


def main():
    parser = argparse.ArgumentParser(description="Generate a timetable")
    parser.add_argument("file", nargs="?", default=DEFAULT_FILE, type=Path)
    parser.add_argument("--time", type=float, default=10, help="time limit in seconds")
    args = parser.parse_args()

    data = json.loads(args.file.read_text(encoding="utf-8"))

    try:
        result = solve(data, time_limit=args.time)
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