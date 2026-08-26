# AGENTS.md

The open adapter interface for Unrounded. Read the README first — the "one rule"
section is the whole design.

## Commands

| Task | Command |
|---|---|
| Typecheck | `pnpm typecheck` |
| Tests | `pnpm test` |
| Both | `pnpm check` |

## Gotchas

1. **Never let an absent value become a present one.** No `?? 0`, no `|| "-"`, no
   default on anything typed `Reported<T>`. A missing token count rendered as `0`
   tells the operator the agent is fine. Return `not_supported` or `stale` instead.

2. **An absent key in `CapabilityRow.supports` is not `false`, and neither is `"n/o"`.**
   Absent means the probe did not test it; `false` means it tested and the harness
   cannot do it; `"n/o"` means it tested and the harness emits nothing that answers the
   question. Three different instructions to the operator — re-probe, do not bother, ask
   elsewhere. Collapsing any two loses the one the operator needed. `"n/o"` is never
   inferred from a missing or malformed value; the probe emits that exact string.
   Beware that `"n/o"` is **truthy** and `tsc` will not flag a bare `if (supports[c])` —
   compare `=== true`, or use `isSupported`.

3. **An absent `outcome` is not `ok`.** It is optional only because rows written before
   the field existed omit it. Absent means the writer did not say. Do not add a default,
   and do not add a helper that supplies one — a reader handles `undefined` as its own
   case.

4. **Every commit needs `Signed-off-by`.** Use `git commit -s`. CI fails the PR
   otherwise, and an unsigned commit cannot be merged or later reused.

5. **The `gate` job uses `if: ${{ !cancelled() }}`, never `if: always()`.** With
   `always()`, a run cancelled by the concurrency group still schedules `gate`, which
   hangs queued forever and blocks the PR on a check that never reports. Observed, not
   theorised — it happened on the first canary PR.

6. **This is a public repo mirroring a proprietary one.** Nothing about Unrounded's
   internals, unreleased plans, or customers belongs in this repo's code or docs.

## Changes

- Behavioural change needs a test that was seen to fail before the fix.
- The PR body carries a `### Verified` section naming the exact commands you ran.
- Conventional Commits. Squash merge.
