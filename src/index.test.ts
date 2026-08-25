import { test } from "node:test";
import assert from "node:assert/strict";
import { mark } from "./index.ts";

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
