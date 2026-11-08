import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeCursor, encodeCursor, parseLimit } from "../../src/shared/pagination.js";

describe("cursor", () => {
  it("round-trips created_at and id", () => {
    const cursor = { created_at: "2027-06-01T09:00:00.000Z", id: "b1" };
    assert.deepEqual(decodeCursor(encodeCursor(cursor)), cursor);
  });

  it("rejects junk", () => {
    assert.equal(decodeCursor("not-a-cursor"), null);
    assert.equal(decodeCursor(""), null);
  });
});

describe("parseLimit", () => {
  it("defaults, accepts 1–50, and rejects the rest", () => {
    assert.equal(parseLimit(undefined), 10);
    assert.equal(parseLimit("20"), 20);
    assert.equal(parseLimit("0"), "invalid");
    assert.equal(parseLimit("51"), "invalid");
    assert.equal(parseLimit("1.5"), "invalid");
  });
});
