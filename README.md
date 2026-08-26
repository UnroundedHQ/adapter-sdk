# @unrounded/adapter-sdk

The open adapter interface for [Unrounded](https://github.com/UnroundedHQ/unrounded),
a supervisory control plane for heterogeneous agent harnesses.

Kubernetes has a CRI — a contract every container runtime implements. Coding-agent
harnesses have nothing of the kind. Claude Code, Codex, Gemini, a Grok bot, and a
local llama.cpp build share no interface: no session format, no permission model, no
agreement on what a tool is or what a running agent will tell you about itself.

So an adapter here does not **declare** what it supports. A probe **discovers** it at
runtime and writes a capability row. That row is the closest thing we have to a spec,
and it is negotiated per harness rather than specified in advance.

## Write an adapter

```ts
import type { HarnessAdapter, CapabilityRow, AgentSnapshot } from "@unrounded/adapter-sdk";

export const myHarness: HarnessAdapter = {
  harness: "my-harness",
  async probe(): Promise<CapabilityRow> {
    return {
      harness: "my-harness",
      probedAt: new Date().toISOString(),
      supports: {
        "tokens.used": true,
        "turn.interrupt": false,
        "thinking.channel": "n/o",
      },
      notes: { "turn.interrupt": "No interrupt endpoint; kill and restart the process." },
    };
  },
  async snapshot(): Promise<AgentSnapshot[]> {
    return [{
      agent: "worker-1",
      harness: "my-harness",
      tokensUsed: { kind: "known", value: 18_400 },
      tokensLimit: { kind: "not_supported" },
      blocked: { kind: "known", value: false },
    }];
  },
};
```

## The one rule

**An adapter may never invent a value it cannot observe.** Return `not_supported`, not
`0`. Return `stale` with its `asOf`, not a fresh-looking number. A missing token count
rendered as zero tells an operator the agent is fine, and the entire product exists to
make that impossible.

Three marks, never interchangeable: `·` zero · `n/s` cannot report · `?` stale.
A capability has three answers and an absent key is none of them. `true` tested and it
can, `false` tested and it cannot, `"n/o"` tested and the harness emits nothing that
answers the question either way — probing the same way will be silent again. An absent
key means *the probe did not test it*. Never infer `"n/o"`: a probe emits that exact
string or the value is invalid.

Do not rely on truthiness. **`"n/o"` is a truthy string**, so `if (row.supports[c])`
reads "the harness emits nothing that answers the question" as "supported", and
TypeScript will not warn you — a bare `if` compiles clean; only assigning to `boolean`
or switching exhaustively is an error. Write `row.supports[c] === true`, or use the
exported `isSupported`.

Nothing in this package makes a value invalid: it is a contract, not a validator. The
enforcement is in Unrounded's row deserializer, which rejects anything that is not
`true`, `false`, or the exact string `"n/o"`.

## `outcome` is the runner's verdict, not the probe's

`outcome` says what happened to the probe **run** — it ran, it timed out, it failed. A
probe cannot report its own timeout, so the code that *ran* the probe writes this field.
Without it a probe that timed out and a probe that ran and tested nothing are the same
empty `supports`, and the operator gets a blank row. It is optional because rows written
before it existed omit it — and an absent `outcome` means *the writer did not say*,
never `ok`. Note that Unrounded's deserializer requires the field, so a row headed there
should carry the runner's verdict.

The adapter above is in-process: it returns a whole `CapabilityRow` and leaves `outcome`
to its caller. A probe that is a separate executable is a narrower contract — it prints
one JSON object on stdout carrying **only** what a probe determines:

```json
{
  "supports": { "tokens.used": true, "thinking.channel": "n/o" },
  "notes": { "turn.interrupt": "No interrupt endpoint; kill and restart the process." }
}
```

`harness` and `probedAt` come from the harness config and the clock; `outcome` comes
from the run. Printing any other key — `outcome` included — is not a partial success:
Unrounded rejects the whole payload and the row becomes `failed`, costing the operator
every capability of that harness rather than one key.

## Contributing

Contributions welcome, under the [DCO](https://developercertificate.org/) — commit with
`git commit -s` so each commit carries a `Signed-off-by` line. CI checks it.

Licensed Apache-2.0, chosen over MIT for its explicit patent grant: this is an
interface a commercial product is built on, and the grant protects both directions.
