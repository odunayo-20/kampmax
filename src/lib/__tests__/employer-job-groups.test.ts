import { describe, expect, it } from "vitest";
import { defaultJobGroup, groupFromParams, jobGroup, jobsHeadline, postingLapsed, reviewLink, visibleJobs } from "../employer-job-groups";

type J = Parameters<typeof reviewLink>[0] & { title: string; expiresAt: string };
const job = (over: Partial<J>): J => ({ id: "j1", title: "Logo design", status: "open", opportunityType: "gig", proposalCount: 0, expiresAt: "", ...over });

describe("employer job groups", () => {
  it("groups raw statuses into live, not live yet and ended", () => {
    expect(jobGroup("open")).toBe("live");
    expect(jobGroup("pending_review")).toBe("draft");
    expect(jobGroup("expired")).toBe("ended");
    expect(defaultJobGroup([job({ status: "closed" }), job({ status: "draft" })])).toBe("draft");
  });

  it("counts only gig proposals, and never invents a number for a vacancy", () => {
    expect(jobsHeadline([job({ proposalCount: 3 }), job({ opportunityType: "internship", proposalCount: 0 })])).toBe("3 responses on your live jobs");
    expect(reviewLink(job({ opportunityType: "internship" }))).toMatchObject({ label: "See applicants", href: "/employer/jobs/j1/applications", enabled: true });
    expect(reviewLink(job({ proposalCount: 2 }))).toMatchObject({ label: "Review 2 proposals", href: "/employer/jobs/j1/applications", enabled: true, strong: true });
    expect(reviewLink(job({}))).toMatchObject({ label: "No proposals yet", enabled: false });
  });

  it("searches titles and spots a lapsed paid posting", () => {
    expect(visibleJobs([job({ title: "Logo design" }), job({ id: "j2", title: "Tutor" })], "live", "logo").map((j) => j.id)).toEqual(["j1"]);
    expect(postingLapsed(job({ opportunityType: "full_time", expiresAt: "2020-01-01T00:00:00Z" }))).toBe(true);
    expect(postingLapsed(job({ opportunityType: "gig", status: "expired" }))).toBe(false);
  });
});

describe("groupFromParams", () => {
  const p = (q: string) => new URLSearchParams(q);
  it("opens the group a link asks for, old status links included", () => {
    expect(groupFromParams(p("group=draft"))).toBe("draft");
    expect(groupFromParams(p("status=open"))).toBe("live");
    expect(groupFromParams(p("status=draft&type=gig"))).toBe("draft");
    expect(groupFromParams(p("group=nonsense"))).toBeNull();
  });
});
