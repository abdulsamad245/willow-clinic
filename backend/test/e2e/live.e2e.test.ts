import { describe, it } from "node:test";

const baseUrl = process.env.BASE_URL;

describe("live e2e", { skip: !baseUrl }, () => {
  it("requires BASE_URL before hitting a deployed API", async () => {
    if (!baseUrl) return;
    const res = await fetch(`${baseUrl}/slots`, {
      headers: { "X-API-Key": process.env.API_KEY || "koya_c4_willow_9e2b7f4a" },
    });
    if (!res.ok) {
      throw new Error(`live /slots returned ${res.status}`);
    }
  });
});
