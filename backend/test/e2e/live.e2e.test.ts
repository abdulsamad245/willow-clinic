import { describe, it } from "node:test";

const baseUrl = process.env.BASE_URL;
const apiKey = process.env.API_KEY;

describe("live e2e", { skip: !baseUrl || !apiKey }, () => {
  it("requires BASE_URL and API_KEY before hitting a deployed API", async () => {
    if (!baseUrl || !apiKey) return;
    const res = await fetch(`${baseUrl}/slots`, {
      headers: { "X-API-Key": apiKey },
    });
    if (!res.ok) {
      throw new Error(`live /slots returned ${res.status}`);
    }
  });
});
