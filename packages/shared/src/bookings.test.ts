import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingFieldError, parseBookingBody } from "./bookings.js";

describe("parseBookingBody", () => {
  it("trims the name and lowercases the email", () => {
    const parsed = parseBookingBody({
      slot_id: " s1 ",
      name: "  Ada Obi  ",
      email: "  Ada@Example.COM ",
    });
    assert.equal(parsed.slot_id, "s1");
    assert.equal(parsed.name, "Ada Obi");
    assert.equal(parsed.emailNorm, "ada@example.com");
  });
});

describe("bookingFieldError", () => {
  it("flags missing fields and an invalid email", () => {
    assert.equal(
      bookingFieldError({ slot_id: "", name: "Ada", email: "ada@example.com", emailNorm: "ada@example.com" }),
      "missing"
    );
    assert.equal(
      bookingFieldError({ slot_id: "s1", name: "Ada", email: "nope", emailNorm: "nope" }),
      "invalid_email"
    );
    assert.equal(
      bookingFieldError({ slot_id: "s1", name: "Ada", email: "ada@example.com", emailNorm: "ada@example.com" }),
      null
    );
  });
});
