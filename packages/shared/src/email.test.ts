import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidEmail } from "./email.js";

describe("isValidEmail", () => {
  it("accepts a normal address and ignores case and spaces", () => {
    assert.equal(isValidEmail("  Ada@Example.COM "), true);
  });

  it("rejects empty, missing domain, and missing @", () => {
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail("ada@"), false);
    assert.equal(isValidEmail("ada.example.com"), false);
  });
});
