import time

from solver.checker import check
from solver.engine import SolverError, solve
from solver.generate import generate

SIZES = [5, 10, 20, 40]
TIME_LIMIT = 60

print(f"{'groups':>6} | {'lessons':>7} | {'status':<10} | {'penalty':>7} | {'time':>6} | problems")
print("-" * 62)

for n in SIZES:
    data = generate(n)
    start = time.perf_counter()
    try:
        result = solve(data, time_limit=TIME_LIMIT)
    except SolverError as e:
        print(f"{n:>6} | {len(data['lessons']):>7} | FAILED: {e}")
        continue
    seconds = time.perf_counter() - start
    problems = check(data, result["entries"])
    print(f"{n:>6} | {len(data['lessons']):>7} | {result['status']:<10} | "
          f"{result['penalty']:>7.0f} | {seconds:>5.1f}s | {len(problems)}")