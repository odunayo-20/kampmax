import { describe, expect, it } from "vitest";
import { agentDetailsPatch, agentDetailsProblems, formFromAgent } from "./agent-details";

const agent = { phone: "08031234567", email: "ada@uni.edu.ng", operatingLocation: "UNILAG", agencyName: "Ada Homes", businessAddress: null };

describe("the agent's details", () => {
  it("checks phone and email, and will not blank an agency name once set", () => {
    const f = { ...formFromAgent(agent), phone: "abc", agencyName: " " };
    expect(Object.keys(agentDetailsProblems(f, agent)).sort()).toEqual(["agencyName", "phone"]);
    expect(agentDetailsProblems(formFromAgent(agent), agent)).toEqual({});
  });

  it("sends only what changed", () => {
    expect(agentDetailsPatch(formFromAgent(agent), agent)).toEqual({});
    expect(agentDetailsPatch({ ...formFromAgent(agent), operatingLocation: "  Yaba  ", businessAddress: "12 Church St" }, agent)).toEqual({
      operatingLocation: "Yaba",
      businessAddress: "12 Church St",
    });
  });
});
