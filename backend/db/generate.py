import time

from db.repository import get_client, load_input, save_run
from solver import engine_v2
from solver.checker import check

sb = get_client()
data = load_input(sb)
print(len(data["lessons"]), "lessons loaded from Supabase")

start = time.perf_counter()
result = engine_v2.solve(data)
seconds = time.perf_counter() - start

problems = check(data, result["entries"])
if problems:
    print("Checker found problems, nothing saved:")
    for p in problems:
        print(" -", p)
    raise SystemExit(1)

run_id = save_run(sb, result, "engine_v2", seconds)
print(f"Saved run {run_id}: {result['status']} | penalty {result['penalty']:.0f} | {seconds:.1f}s")