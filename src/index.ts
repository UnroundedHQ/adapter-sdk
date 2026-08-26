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
 * **`"n/o"` is truthy, and TypeScript will not warn you.** `if (row.supports[c])` is
 * the most common guard there is, and it reads "the harness emits nothing that answers
 * the question" as "supported" — an absent-ish value becoming a present one, the exact
 * defect this contract exists to prevent. `tsc` catches only the consumer that assigns
 * to `boolean` or switches exhaustively; a bare `if` compiles clean. Compare against
 * `=== true`, or use {@link isSupported}.
 *
 * `"n/o"` is never inferred: the contract is that a probe emits that exact string, and
 * nothing derives it from a missing, null, or malformed value. This package declares
 * that contract and does not police it — there is no runtime validator here. The
 * enforcement lives in the consumer that deserializes the row.
 */
export type Support = boolean | "n/o";

/**
 * Narrow a {@link Support} to "tested and it can".
 *
 * Exists because `"n/o"` is truthy and `if (row.supports[c])` compiles clean. Prefer
 * this or an explicit `=== true` over a bare truthiness check.
 */
export function isSupported(v: Support | undefined): v is true {
  return v === true;
}

/**
 * What happened to the probe run itself.
 *
 * Written by whoever *runs* the probe, never by the probe. `failed` carries the reason
 * so the row can say why, and that reason is the runner's own — never quoted back from
 * the probe's output.
 *
 * Without it, a probe that timed out and a probe that ran and tested nothing are the
 * same empty `supports` object, and the operator is shown a blank row — the exact
 * absence-reads-as-presence failure this SDK exists to prevent.
 *
 * Named to match the consumer's field, which is `outcome: Outcome`. Do not confuse it
 * with Unrounded's internal `probe::ProbeOutcome`, a different type describing how the
 * child process ended (completed with stdout / timed out / failed to spawn).
 */
export type Outcome =
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
   * What happened to the probe run, written by the runner rather than by the probe.
   * Optional, because every row written before this field existed omits it.
   *
   * An absent `outcome` means **the writer did not say**, and must never be read as
   * `{ kind: "ok" }`. There is deliberately no default and no helper that supplies
   * one; a reader that needs to know must handle `undefined` as its own case and
   * render it as unknown, the same way it handles an absent `supports` key.
   *
   * Optional here, required there: Unrounded's row deserializer has no default for
   * this field, so a row this package accepts without it is one that consumer rejects.
   * Omit it only for a row you are not handing to Unrounded.
   */
  outcome?: Outcome;
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
  /**
   * Discover what this harness can actually report. Runs when the harness is added.
   *
   * An in-process adapter returns the whole row, including `harness` and `probedAt`.
   * It should leave `outcome` unset: the verdict on the run belongs to whoever ran it,
   * and an adapter cannot report its own timeout. A probe that instead prints JSON to
   * stdout is a different contract — see the README.
   */
  probe(): Promise<CapabilityRow>;
  /** Current state. Anything the probe found unsupported must return `not_supported`. */
  snapshot(): Promise<AgentSnapshot[]>;
}
