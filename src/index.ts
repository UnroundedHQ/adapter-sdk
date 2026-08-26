/**
 * The Unrounded adapter interface.
 *
 * There is no CRI for coding-agent harnesses — no contract that Claude Code,
 * llama.cpp, and a Grok bot all implement. So an adapter does not *declare* what it
 * supports; a probe *discovers* it at runtime and writes a capability row. This file
 * is that contract.
 */

/** A value a harness may or may not be able to report. */
export type Reported<T> =
  | { kind: "known"; value: T }
  | { kind: "not_supported" }
  | { kind: "stale"; value: T; asOf: string };

/** Operator-facing mark. Never returns "" — a blank cell reads as "fine". */
export function mark(r: Reported<number>): string {
  switch (r.kind) {
    case "known":
      return r.value === 0 ? "·" : String(r.value);
    case "not_supported":
      return "n/s";
    case "stale":
      return "?";
  }
}

/**
 * Metrics and controls a harness may or may not expose.
 *
 * Ordered by what an operator reads down a matrix column, not alphabetically. The
 * six members added after `0.1.0` are ones probes already discover in practice:
 * `identity` (does the harness say which agent it is), `session.write` (can a turn
 * be fed back in on stdin), `thinking.channel`, `tool.pairing` (does a tool result
 * arrive tied to the call that made it), `turn.events`, and `secrets.structured`
 * (a structured secret reference, versus a best-effort regex over the transcript).
 */
export type Capability =
  | "identity"
  | "tokens.used"
  | "tokens.limit"
  | "session.read"
  | "session.stream"
  | "session.write"
  | "thinking.channel"
  | "tool.pairing"
  | "turn.events"
  | "turn.interrupt"
  | "secrets.structured"
  | "process.kill";

/**
 * What a probe found out about one capability.
 *
 * `true` and `false` are unchanged: tested and it can, tested and it cannot. `"n/o"`
 * is the third answer — the probe asked, and the harness emitted nothing that answers
 * the question either way. It is not a fourth spelling of `false`, and it is not an
 * absent key: the three are three different instructions. An absent key says re-probe;
 * `false` says do not bother; `"n/o"` says probing the same way will be silent again,
 * so the answer has to come from somewhere else.
 *
 * `"n/o"` is never inferred. A probe emits that exact string or the value is invalid —
 * a missing, null, or malformed value is not quietly read as "nothing observable".
 */
export type Support = boolean | "n/o";

/**
 * What happened to the probe run itself.
 *
 * Without it, a probe that timed out and a probe that ran and tested nothing are the
 * same empty `supports` object, and the operator is shown a blank row — the exact
 * absence-reads-as-presence failure this SDK exists to prevent.
 *
 * `failed` carries the reason so the row can say why. The reason is written by the
 * caller running the probe, never quoted back from the probe's own output.
 */
export type ProbeOutcome =
  | { kind: "ok" }
  | { kind: "timed_out" }
  | { kind: "failed"; reason: string };

/**
 * One row of the capability matrix. Written by {@link HarnessAdapter.probe} and by
 * nothing else — a hand-edited row drifts from reality and becomes a confident lie.
 */
export interface CapabilityRow {
  harness: string;
  probedAt: string;
  /**
   * Absent key means "the probe did not test it", which is not the same as `false`
   * and not the same as `"n/o"`. Nothing may fill an absent key in.
   */
  supports: Partial<Record<Capability, Support>>;
  /** Why a capability is unsupported, when the probe can tell. Shown to the operator. */
  notes?: Partial<Record<Capability, string>>;
  /**
   * What happened to the probe run. Optional, because every row written before this
   * field existed omits it.
   *
   * An absent `outcome` means **the writer did not say**, and must never be read as
   * `{ kind: "ok" }`. There is deliberately no default and no helper that supplies
   * one; a reader that needs to know must handle `undefined` as its own case and
   * render it as unknown, the same way it handles an absent `supports` key.
   */
  outcome?: ProbeOutcome;
}

export interface AgentSnapshot {
  agent: string;
  harness: string;
  tokensUsed: Reported<number>;
  tokensLimit: Reported<number>;
  blocked: Reported<boolean>;
}

export interface HarnessAdapter {
  readonly harness: string;
  /** Discover what this harness can actually report. Runs when the harness is added. */
  probe(): Promise<CapabilityRow>;
  /** Current state. Anything the probe found unsupported must return `not_supported`. */
  snapshot(): Promise<AgentSnapshot[]>;
}
