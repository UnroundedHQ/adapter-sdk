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

2. **An absent key in `CapabilityRow.supports` is not `false`.** Absent means the probe
   did not test it; `false` means it tested and the harness cannot do it. Collapsing
   the two loses the distinction the operator needs to decide whether to re-probe.

3. **Every commit needs `Signed-off-by`.** Use `git commit -s`. CI fails the PR
   otherwise, and an unsigned commit cannot be merged or later reused.

4. **This is a public repo mirroring a proprietary one.** Nothing about Unrounded's
   internals, unreleased plans, or customers belongs in this repo's code or docs.

## Changes

- Behavioural change needs a test that was seen to fail before the fix.
- The PR body carries a `### Verified` section naming the exact commands you ran.
- Conventional Commits. Squash merge.
