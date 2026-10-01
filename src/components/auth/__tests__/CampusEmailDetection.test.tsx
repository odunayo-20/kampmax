// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  extractEmailDomain,
  isInstitutionalEmail,
  detectCampusFromEmail,
} from "@/lib/campus-email";
import { VerifiedStudentBadgeNotice } from "../VerifiedStudentBadgeNotice";
import { campuses } from "@/data/campus";

afterEach(() => {
  cleanup();
});

describe("Campus Email Parsing & Detection Utilities", () => {
  it("extracts domain correctly from valid emails", () => {
    expect(extractEmailDomain("student@unilag.edu.ng")).toBe("unilag.edu.ng");
    expect(extractEmailDomain("USER.NAME@LIVE.UNILAG.EDU.NG")).toBe(
      "live.unilag.edu.ng"
    );
    expect(extractEmailDomain("")).toBeNull();
    expect(extractEmailDomain("invalid-email")).toBeNull();
  });

  it("identifies educational/institutional email domains", () => {
    expect(isInstitutionalEmail("user@unilag.edu.ng")).toBe(true);
    expect(isInstitutionalEmail("user@oauife.edu.ng")).toBe(true);
    expect(isInstitutionalEmail("user@lasu.edu.ng")).toBe(true);
    expect(isInstitutionalEmail("user@gmail.com")).toBe(false);
    expect(isInstitutionalEmail("user@yahoo.co.uk")).toBe(false);
  });

  it("auto-detects UNILAG from @unilag.edu.ng and queues badge", () => {
    const result = detectCampusFromEmail("john@unilag.edu.ng", campuses);
    expect(result.isInstitutional).toBe(true);
    expect(result.campusId).toBe("unilag");
    expect(result.matchedCampus?.name).toBe("University of Lagos");
    expect(result.badgeQueued).toBe(true);
  });

  it("auto-detects UNILAG from student subdomain @live.unilag.edu.ng", () => {
    const result = detectCampusFromEmail("student@live.unilag.edu.ng", campuses);
    expect(result.campusId).toBe("unilag");
    expect(result.badgeQueued).toBe(true);
  });

  it("auto-detects OAU from @oauife.edu.ng", () => {
    const result = detectCampusFromEmail("ade@oauife.edu.ng", campuses);
    expect(result.campusId).toBe("oau");
    expect(result.matchedCampus?.name).toBe("Obafemi Awolowo University");
    expect(result.badgeQueued).toBe(true);
  });

  it("auto-detects UI from @ui.edu.ng", () => {
    const result = detectCampusFromEmail("chidi@ui.edu.ng", campuses);
    expect(result.campusId).toBe("ui");
    expect(result.matchedCampus?.name).toBe("University of Ibadan");
    expect(result.badgeQueued).toBe(true);
  });

  it("auto-detects RUGIPO from @rugipo.edu.ng", () => {
    const result = detectCampusFromEmail("bola@rugipo.edu.ng", campuses);
    expect(result.campusId).toBe("rugipo");
    expect(result.matchedCampus?.name).toBe("Rufus Giwa Polytechnic");
    expect(result.badgeQueued).toBe(true);
  });

  it("auto-detects FUTO from @futo.edu.ng", () => {
    const result = detectCampusFromEmail("emeka@futo.edu.ng", campuses);
    expect(result.campusId).toBe("futo");
    expect(result.matchedCampus?.name).toBe(
      "Federal University of Technology"
    );
    expect(result.badgeQueued).toBe(true);
  });

  it("queues badge for unlisted institutional email without auto-selecting campus", () => {
    const result = detectCampusFromEmail("student@uniben.edu.ng", campuses);
    expect(result.isInstitutional).toBe(true);
    expect(result.campusId).toBeNull();
    expect(result.badgeQueued).toBe(true);
  });

  it("does not queue badge for personal consumer email", () => {
    const result = detectCampusFromEmail("john@gmail.com", campuses);
    expect(result.isInstitutional).toBe(false);
    expect(result.campusId).toBeNull();
    expect(result.badgeQueued).toBe(false);
  });
}, 20000);

describe("VerifiedStudentBadgeNotice Component", () => {
  it("renders nothing when badge is not queued", () => {
    const detection = detectCampusFromEmail("john@gmail.com", campuses);
    const { container } = render(
      <VerifiedStudentBadgeNotice detection={detection} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders badge queued alert with campus details when institutional email is detected", () => {
    const detection = detectCampusFromEmail("john@unilag.edu.ng", campuses);
    render(<VerifiedStudentBadgeNotice detection={detection} />);

    expect(screen.getByText(/Verified Student Badge Queued/i)).toBeTruthy();
    expect(screen.getByText("@unilag.edu.ng")).toBeTruthy();
    expect(screen.getByText("University of Lagos")).toBeTruthy();
    expect(screen.getByText(/Higher buyer & seller trust/i)).toBeTruthy();
  });

  it("renders generic badge notice for other .edu.ng emails", () => {
    const detection = detectCampusFromEmail("john@custom.edu.ng", campuses);
    render(<VerifiedStudentBadgeNotice detection={detection} />);

    expect(screen.getByText(/Verified Student Badge Queued/i)).toBeTruthy();
    expect(screen.getByText("@custom.edu.ng")).toBeTruthy();
  });
}, 20000);
