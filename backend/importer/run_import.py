import argparse
import json
from pathlib import Path

from importer.course_listing import parse

PLACEHOLDER_ROOMS = {
    "R1": {"cap": 30, "type": "lecture"},
    "R2": {"cap": 30, "type": "lecture"},
    "R3": {"cap": 30, "type": "lecture"},
    "R4": {"cap": 30, "type": "lecture"},
    "LAB1": {"cap": 30, "type": "lab"},
    "LAB2": {"cap": 30, "type": "lab"},
}


def main():
    p = argparse.ArgumentParser(description="Import a Course Listing CSV")
    p.add_argument("csv", type=Path)
    p.add_argument("--out", type=Path, help="write solver JSON here")
    args = p.parse_args()

    result = parse(args.csv)

    print(f"{len(result['groups'])} intake groups, {len(result['classes'])} classes\n")
    for c in result["classes"]:
        pt = " [PT]" if c["part_time"] else ""
        print(f"  {c['id']:<9} {c['module'][:38]:<40} {c['students']:>3} students  "
              f"{c['weekly_hours']}h  {c['lecturer']}{pt}")
        print(f"            groups: {', '.join(c['groups'])}")

    if result["skipped"]:
        print("\nSkipped (not timetabled):")
        for group, code in result["skipped"]:
            print(f"  {code}  {group}")

    if args.out:
        data = {
            "rooms": PLACEHOLDER_ROOMS,
            "groups": result["groups"],
            "classes": [{k: v for k, v in c.items() if k != "part_time"}
                        for c in result["classes"]],
        }
        args.out.write_text(json.dumps(data, indent=2), encoding="utf-8")
        print(f"\nWrote {args.out}")


if __name__ == "__main__":
    main()