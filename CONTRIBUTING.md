# Contributing

New harness adapters are the point of this repo. Please open one.

## Sign your commits off (DCO)

Every commit needs a `Signed-off-by` line: `git commit -s`. That is your assertion of
the [Developer Certificate of Origin](https://developercertificate.org/) — that you
wrote the patch or have the right to submit it. CI checks every commit in the PR.

We use a DCO rather than a CLA deliberately: a CLA is heavier and costs contributors
at this scale.

## Before you open a PR

```sh
pnpm install
pnpm check      # typecheck + tests
```

- Behavioural change needs a test that was seen to fail before the fix.
- Conventional Commits. Squash merge; the PR title becomes the commit subject.
- An adapter that returns a placeholder value where it should return `not_supported`
  will be rejected. See the one rule in the README.
