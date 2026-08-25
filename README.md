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
      supports: { "tokens.used": true, "turn.interrupt": false },
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
An absent key in `supports` means *the probe did not test it*, which is again not the
same as `false`.

## Contributing

Contributions welcome, under the [DCO](https://developercertificate.org/) — commit with
`git commit -s` so each commit carries a `Signed-off-by` line. CI checks it.

Licensed Apache-2.0, chosen over MIT for its explicit patent grant: this is an
interface a commercial product is built on, and the grant protects both directions.
