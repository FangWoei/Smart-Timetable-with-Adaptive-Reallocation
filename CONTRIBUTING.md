# Contributing to STAR

Small team, so keep this simple — the point is just that everyone's commits say **what kind of work it was**, so the history and PRs are easy to skim.

## 1. Pick a branch before you start work

Branch name = `type/short-description`

| Type | Use for |
|---|---|
| `feature/` | New functionality, development work |
| `fix/` | Bug fixes |
| `ui/` | UI/UX/styling-only changes |
| `docs/` | Documentation, report, README changes |
| `data/` | CSV imports, data cleaning, schema changes |
| `test/` | Tests, test data |
| `chore/` | Config, tooling, dependency bumps — no feature/behavior change |

Examples: `feature/lecturer-self-input`, `fix/csv-blank-columns`, `ui/dashboard-sidebar`

```bash
git checkout -b feature/lecturer-self-input
```

## 2. Commit using the type prefix

Once you run `git config commit.template .gitmessage.txt` (see README), typing `git commit` opens a template like this:

```
type: short summary (max ~50 chars)

# Types: feature | fix | ui | docs | data | test | chore
# Example: feature: add PT teacher availability form
#
# Optional longer description below (why, not just what):

```

You fill in the top line and delete the comment lines. If you prefer the one-liner:

```bash
git commit -m "fix: handle PT1/PT2 placeholder lecturer values"
```

## 3. Push and open a PR

```bash
git push -u origin feature/lecturer-self-input
```

Then open a Pull Request on GitHub into `main`. Fill in the PR template (it'll load automatically) — it just asks what type of change it is and a one-line summary, same as the commit type.

## 4. Merging

- For solo/independent pieces (e.g. your own module), self-merge once it builds/runs.
- For anything touching the solver's data model or shared schema, get at least one other look before merging — those changes are easy to conflict on.

## Quick reference: which type do I pick?

- Writing a new page/feature end to end → `feature`
- Something's broken and you're fixing it → `fix`
- Only touched colors/layout/spacing/components' look → `ui`
- Only touched .md files / report / wireframes → `docs`
- Touched CSV parsing, Supabase schema, data cleaning → `data`
- Added/changed tests → `test`
- Everything else (config, CI, deps) → `chore`
