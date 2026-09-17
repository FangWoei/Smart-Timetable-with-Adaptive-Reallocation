import argparse
import importlib
import time

from solver.checker import check
from solver.engine import SolverError
from solver.generate import generate

parser = argparse.ArgumentParser(description="Benchmark a solver engine")
parser.add_argument("--engine", default="engine", choices=["engine", "engine_v2"])
parser.add_argument("--sizes", nargs="+", type=int, default=[5, 10, 20, 40])
parser.add_argument("--time", type=float, default=60)
args = parser.parse_args()

engine = importlib.import_module(f"solver.{args.engine}")
print(f"Engine: {args.engine}\n")
print(f"{'groups':>6} | {'lessons':>7} | {'status':<10} | {'penalty':>7} | {'time':>6} | problems")
print("-" * 62)

for n in args.sizes:
    data = generate(n)
    start = time.perf_counter()
    try:
        result = engine.solve(data, time_limit=args.time)
    except SolverError as e:
        print(f"{n:>6} | {len(data['lessons']):>7} | FAILED: {e}")
        continue
    seconds = time.perf_counter() - start
    problems = check(data, result["entries"])
    print(f"{n:>6} | {len(data['lessons']):>7} | {result['status']:<10} | "
          f"{result['penalty']:>7.0f} | {seconds:>5.1f}s | {len(problems)}")