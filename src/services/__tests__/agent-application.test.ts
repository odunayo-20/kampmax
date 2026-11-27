import { describe, expect, it } from "vitest";
import {
  agentDocProblem,
  agentStatusView,
  agentStepProblem,
  applicationSteps,
  documentsToSend,
  emptyAgent,
  uploadsFailedText,
  opensAfterApproval,
  showsPendingApplication,
} from "@/services/agent-application";
import { AGENT_DASHBOARD_GATE } from "@/services/agent-dashboard";

describe("agentStatusView", () => {
  it("words a pending application as under review", () => {
    expect(agentStatusView("PENDING")).toMatchObject({ tone: "info", title: "Application under review", canAddDocuments: true });
  });

  it("puts the review team's question first when they asked for more", () => {
    expect(agentStatusView("PENDING", { infoRequest: "  Please add your CAC certificate. " })).toEqual({
      tone: "attention",
      title: "Kampmax needs a little more",
      text: "Please add your CAC certificate.",
      canAddDocuments: true,
    });
  });

  it("uses the reason given, or a plain fallback, when the answer is no", () => {
    expect(agentStatusView("REJECTED", { rejectionReason: "ID unreadable" }).text).toBe("ID unreadable");
    expect(agentStatusView("SUSPENDED").tone).toBe("bad");
    expect(agentStatusView("REVOKED").canAddDocuments).toBe(false);
  });
});

describe("applicationSteps", () => {
  const states = (tone: Parameters<typeof applicationSteps>[0]) => applicationSteps(tone).map((s) => s.state);

  it("shows the check happening now while under review", () => {
    expect(states("info")).toEqual(["done", "current", "todo", "todo"]);
  });

  it("marks the check as needing the agent, or stopped", () => {
    expect(states("attention")).toEqual(["done", "action", "todo", "todo"]);
    expect(states("bad")).toEqual(["done", "stopped", "todo", "todo"]);
  });

  it("moves on to preparing properties once approved", () => {
    expect(states("positive")).toEqual(["done", "done", "current", "todo"]);
  });
});

describe("which pages a pending agent can use", () => {
  it("knows the pages that open after approval, and their sub-pages", () => {
    expect(opensAfterApproval("/agent/listings")).toBe(true);
    expect(opensAfterApproval("/agent/properties/p1")).toBe(true);
    expect(opensAfterApproval("/agent/listings-old")).toBe(false);
    expect(opensAfterApproval("/agent/profile")).toBe(false);
  });

  it("shows the application on the overview and locked pages, never to an approved agent", () => {
    const waiting = AGENT_DASHBOARD_GATE.PENDING_REVIEW;
    expect(showsPendingApplication(waiting, "/agent")).toBe(true);
    expect(showsPendingApplication(AGENT_DASHBOARD_GATE.MORE_INFORMATION, "/agent/billing")).toBe(true);
    expect(showsPendingApplication(waiting, "/agent/verification")).toBe(false);
    expect(showsPendingApplication(AGENT_DASHBOARD_GATE.APPROVED, "/agent")).toBe(false);
  });
});

describe("applying to be an agent", () => {
  const file = (name: string, type = "application/pdf", size = 1000) => new File([new Uint8Array(size)], name, { type });

  it("checks each step, and will not go past documents without an ID and proof of authority", () => {
    const a = { ...emptyAgent({ name: "Ada Obi", phone: "0803 123 4567", email: "ada@uni.edu.ng" }), operatingLocation: "UNILAG" };
    expect(agentStepProblem(0, a)).toBeNull();
    expect(agentStepProblem(0, { ...a, phone: "12" })).toMatch(/phone number/);
    expect(agentStepProblem(1, a)).toMatch(/government ID/);
    expect(agentStepProblem(1, { ...a, identity: file("id.pdf") })).toMatch(/proof you may rent/);
    expect(agentStepProblem(2, a)).toMatch(/agreement/);
  });

  it("refuses files the backend refuses, and sends each document under its type", () => {
    expect(agentDocProblem(file("a.gif", "image/gif"))).toMatch(/PDF, JPEG or PNG/);
    expect(agentDocProblem({ type: "application/pdf", size: 6 * 1024 * 1024 })).toMatch(/over 5 MB/);
    const a = { ...emptyAgent(), identity: file("id.pdf"), authority: file("letter.pdf") };
    expect(documentsToSend(a).map((d) => d.type)).toEqual(["IDENTITY", "AUTHORIZATION_LETTER"]);
    expect(uploadsFailedText(["Government ID", "Proof of authority"])).toMatch(/but Government ID and Proof of authority could not be uploaded/);
  });
});
