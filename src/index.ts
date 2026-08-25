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

/** Metrics and controls a harness may or may not expose. */
export type Capability =
  | "tokens.used"
  | "tokens.limit"
  | "session.read"
  | "session.stream"
  | "turn.interrupt"
  | "process.kill";

/**
 * One row of the capability matrix. Written by {@link HarnessAdapter.probe} and by
 * nothing else — a hand-edited row drifts from reality and becomes a confident lie.
 */
export interface CapabilityRow {
  harness: string;
  probedAt: string;
  /** Absent key means "the probe did not test it", which is not the same as false. */
  supports: Partial<Record<Capability, boolean>>;
  /** Why a capability is unsupported, when the probe can tell. Shown to the operator. */
  notes?: Partial<Record<Capability, string>>;
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
// canary: unsigned commit, to prove the DCO gate fails. Reverted after.
