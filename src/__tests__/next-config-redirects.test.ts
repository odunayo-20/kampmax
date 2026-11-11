import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

type Redirect = {
  source: string;
  destination: string;
  has?: { type: string; key: string }[];
};

async function rules(): Promise<Redirect[]> {
  return (await nextConfig.redirects!()) as Redirect[];
}

describe("old accommodation agent address", () => {
  it("sends a payment return to the billing page, whichever name the gateway used", async () => {
    const all = (await rules()).filter((r) => r.source === "/accommodation/agent" && r.has);
    expect(all.map((r) => r.has![0].key).sort()).toEqual(["reference", "trxref"]);
    for (const rule of all) {
      expect(rule.has![0].type).toBe("query");
      expect(rule.destination).toBe("/agent/billing");
    }
  });

  it("tries the payment rules before the plain one, which would swallow them", async () => {
    const all = (await rules()).filter((r) => r.source === "/accommodation/agent");
    const plain = all.findIndex((r) => !r.has);
    expect(plain).toBeGreaterThan(0);
    expect(all.slice(0, plain).every((r) => r.has)).toBe(true);
    expect(all[plain].destination).toBe("/agent");
  });

  it("still sends the onboarding address to the onboarding flow", async () => {
    const onboarding = (await rules()).find((r) => r.source === "/accommodation/agent/onboarding");
    expect(onboarding?.destination).toBe("/onboarding/agent");
  });
});
