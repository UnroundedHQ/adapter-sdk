import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isSupported, mark } from "./index.ts";
import type { Capability, CapabilityRow, Support } from "./index.ts";

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

test("every capability the probe writes is in the vocabulary, in order", () => {
  // The twelve wire keys, in the order an operator reads them down a column — which is
  // also the consumer's enum order, and so the order its BTreeMap iterates.
  const vocabulary = [
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
  ] as const satisfies readonly Capability[];

  // `satisfies` above rejects a member that is not in `Capability`. This rejects a
  // member of `Capability` that is not above: `Exclude` is `never` only when the two
  // are the same set, and `ExpectNever` fails to compile when it is not. Without it a
  // thirteenth member could be added to the union and no command would notice.
  type ExpectNever<T extends never> = T;
  type _NoMemberUnlisted = ExpectNever<Exclude<Capability, (typeof vocabulary)[number]>>;

  assert.equal(vocabulary.length, 12);
  assert.equal(new Set(vocabulary).size, 12);

  // Order is not observable from a union type, so read it off the source instead. This
  // is what makes the check run under `node --test`, which erases types entirely.
  const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  const union = src.slice(src.indexOf("export type Capability ="));
  const declared = [...union.slice(0, union.indexOf(";")).matchAll(/"([^"]+)"/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(declared, [...vocabulary]);
});

test("`n/o` is truthy, so isSupported is the guard, not a bare if", () => {
  const nothingObservable: Support = "n/o";
  // The hazard, stated as an assertion: a bare `if` would take this branch.
  assert.ok(nothingObservable);
  assert.equal(isSupported(nothingObservable), false);
  assert.equal(isSupported(true), true);
  assert.equal(isSupported(false), false);
  // An absent key is not supported either, and is not `false`.
  assert.equal(isSupported(undefined), false);
});
