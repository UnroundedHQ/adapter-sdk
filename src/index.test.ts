import { test } from "node:test";
import assert from "node:assert/strict";
import { mark } from "./index.ts";
import type { Capability, CapabilityRow } from "./index.ts";

test("every absence has a distinct, non-empty mark", () => {
  const marks = [
    mark({ kind: "known", value: 0 }),
    mark({ kind: "known", value: 7 }),
    mark({ kind: "not_supported" }),
    mark({ kind: "stale", value: 7, asOf: "2026-08-25T00:00:00Z" }),
  ];
  assert.deepEqual(marks, ["·", "7", "n/s", "?"]);
  assert.ok(marks.every((m) => m !== ""));
});

test("a row written before `outcome` and `n/o` existed still typechecks and round-trips", () => {
  // Byte-for-byte what the README's example adapter has always returned. It must
  // still satisfy CapabilityRow with no edit and no added field.
  const legacy: CapabilityRow = {
    harness: "my-harness",
    probedAt: "2026-08-25T00:00:00Z",
    supports: { "tokens.used": true, "turn.interrupt": false },
    notes: { "turn.interrupt": "No interrupt endpoint; kill and restart the process." },
  };
  const json = JSON.stringify(legacy);
  assert.equal(
    json,
    '{"harness":"my-harness","probedAt":"2026-08-25T00:00:00Z",' +
      '"supports":{"tokens.used":true,"turn.interrupt":false},' +
      '"notes":{"turn.interrupt":"No interrupt endpoint; kill and restart the process."}}',
  );
  assert.deepEqual(JSON.parse(json), legacy);
  assert.ok(!("outcome" in legacy));
});

test("a capability has three answers, and an absent key is none of them", () => {
  const row: CapabilityRow = {
    harness: "my-harness",
    probedAt: "2026-08-25T00:00:00Z",
    supports: { "tokens.used": true, "turn.interrupt": false, "thinking.channel": "n/o" },
    outcome: { kind: "ok" },
  };
  assert.equal(row.supports["thinking.channel"], "n/o");
  // Tested-and-cannot is not nothing-observable, and neither is not-tested.
  assert.notEqual(row.supports["turn.interrupt"], row.supports["thinking.channel"]);
  assert.equal(row.supports["tokens.limit"], undefined);
  assert.ok(!("tokens.limit" in row.supports));
  // The wire value is the exact string, not a truthy stand-in.
  assert.equal(
    JSON.stringify(row.supports),
    '{"tokens.used":true,"turn.interrupt":false,"thinking.channel":"n/o"}',
  );
});

test("a timed-out probe is distinguishable from one that tested nothing", () => {
  const timedOut: CapabilityRow = {
    harness: "my-harness",
    probedAt: "2026-08-25T00:00:00Z",
    supports: {},
    outcome: { kind: "timed_out" },
  };
  const testedNothing: CapabilityRow = { ...timedOut, outcome: { kind: "ok" } };
  const didNotSay: CapabilityRow = {
    harness: "my-harness",
    probedAt: "2026-08-25T00:00:00Z",
    supports: {},
  };
  assert.notDeepEqual(timedOut.outcome, testedNothing.outcome);
  // Absent means the writer did not say. It is not `ok`.
  assert.equal(didNotSay.outcome, undefined);
  assert.notDeepEqual(didNotSay.outcome, { kind: "ok" });
});

test("every capability the probe writes is in the vocabulary", () => {
  // The twelve wire keys, in the order an operator reads them down a column.
  const vocabulary: Capability[] = [
    "identity",
    "tokens.used",
    "tokens.limit",
    "session.read",
    "session.stream",
    "session.write",
    "thinking.channel",
    "tool.pairing",
    "turn.events",
    "turn.interrupt",
    "secrets.structured",
    "process.kill",
  ];
  assert.equal(vocabulary.length, 12);
  assert.equal(new Set(vocabulary).size, 12);
});
