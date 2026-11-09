// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => {
  const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false });
  return {
    params: { id: "a1" },
    admin: { role: "ADMIN", permissions: ["accommodation.agents.review"] } as {
      role: string;
      permissions?: string[];
    } | null,
    useAdminAgents: vi.fn(),
    useAdminAgent: vi.fn(),
    useAdminAgentListings: vi.fn(),
    approve: mutation(),
    reject: mutation(),
    requestInfo: mutation(),
    suspend: mutation(),
    restore: mutation(),
    revoke: mutation(),
    reviewDocument: mutation(),
    mutation,
    openAgentDocument: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({ useParams: () => h.params }));
vi.mock("@/lib/admin/admin-auth-context", () => ({ useAdminSession: () => ({ admin: h.admin }) }));
vi.mock("@/services/admin", () => ({ accommodationService: { openAgentDocument: h.openAgentDocument } }));
vi.mock("@/hooks/admin/use-admin-accommodation", () => ({
  useAdminAgents: h.useAdminAgents,
  useAdminAgent: h.useAdminAgent,
  useAdminAgentListings: h.useAdminAgentListings,
  useApproveAgent: () => h.approve,
  useRejectAgent: () => h.reject,
  useRequestAgentInfo: () => h.requestInfo,
  useSuspendAgent: () => h.suspend,
  useRestoreAgent: () => h.restore,
  useRevokeAgent: () => h.revoke,
  useReviewAgentDocument: () => h.reviewDocument,
}));

import AgentsPage from "../agents/page";
import AgentPage from "../agents/[id]/page";

afterEach(cleanup);

const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 15, total: items.length, totalPages: 1 });
const COUNTS = { pending: 4, approved: 20, rejected: 3, suspended: 2, revoked: 1 };

const item = (over = {}) => ({
  id: "a1",
  userId: "u1",
  fullName: "Ada Obi",
  email: "ada@example.com",
  phone: "+2348012345678",
  agencyName: "Obi Homes",
  operatingLocation: "Ugbokolo, Benue",
  status: "PENDING",
  createdAt: new Date().toISOString(),
  ...over,
});

describe("agents list page", () => {
  beforeEach(() => {
    h.useAdminAgents.mockReset();
    h.useAdminAgents.mockReturnValue({
      data: { ...page([item()]), counts: COUNTS },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it("opens on the pending queue, with a count on every tab", () => {
    render(<AgentsPage />);
    expect(h.useAdminAgents).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING", page: 1 }));
    const tabs = within(screen.getByRole("tablist", { name: "Agent status" }));
    expect(tabs.getByRole("tab", { name: /Pending\s*4/ }).getAttribute("aria-selected")).toBe("true");
    expect(tabs.getByRole("tab", { name: /Approved\s*20/ })).toBeTruthy();
    expect(tabs.getByRole("tab", { name: /Suspended\s*2/ })).toBeTruthy();
    expect(tabs.getByRole("tab", { name: /Rejected\s*3/ })).toBeTruthy();
    expect(tabs.getByRole("tab", { name: /Revoked\s*1/ })).toBeTruthy();
  });

  it("lists the applicant with contact details and a Review link to their application", () => {
    render(<AgentsPage />);
    expect(screen.getByText("Ada Obi")).toBeTruthy();
    expect(screen.getByText("Obi Homes")).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByText("Ugbokolo, Benue")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Review Ada Obi" }).getAttribute("href")).toBe(
      "/admin/accommodation/agents/a1"
    );
  });

  it("says Open, not Review, for someone already decided", () => {
    h.useAdminAgents.mockReturnValue({
      data: { ...page([item({ status: "APPROVED" })]), counts: COUNTS },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<AgentsPage />);
    expect(screen.getByRole("link", { name: "Open Ada Obi" })).toBeTruthy();
  });

  it("switches tab and asks for that status from the first page", () => {
    render(<AgentsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Suspended/ }));
    expect(h.useAdminAgents).toHaveBeenLastCalledWith(expect.objectContaining({ status: "SUSPENDED", page: 1 }));
  });

  it("searches after a short pause, trimmed", async () => {
    render(<AgentsPage />);
    fireEvent.change(screen.getByLabelText("Search agents"), { target: { value: "  ada " } });
    await waitFor(() =>
      expect(h.useAdminAgents).toHaveBeenLastCalledWith(expect.objectContaining({ search: "ada", page: 1 }))
    );
  });

  it("explains an empty queue in words, and an empty search differently", async () => {
    h.useAdminAgents.mockReturnValue({
      data: { ...page([]), counts: { ...COUNTS, pending: 0 } },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });
    render(<AgentsPage />);
    expect(screen.getByText("No applications waiting")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search agents"), { target: { value: "zzz" } });
    expect(await screen.findByText("No matching agents")).toBeTruthy();
  });

  it("shows a loading skeleton, and an error with a retry", () => {
    h.useAdminAgents.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    const { unmount } = render(<AgentsPage />);
    expect(screen.queryByText("Ada Obi")).toBeNull();
    unmount();
    const refetch = vi.fn();
    h.useAdminAgents.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });
    render(<AgentsPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

const doc = (documentType: string, over = {}) => ({
  id: `d-${documentType}`,
  documentType,
  originalFilename: `${documentType.toLowerCase()}.pdf`,
  status: "PENDING",
  rejectionReason: null,
  createdAt: new Date().toISOString(),
  ...over,
});

const agent = (over = {}) => ({
  id: "a1",
  userId: "u1",
  status: "PENDING",
  fullName: "Ada Obi",
  phone: "+2348012345678",
  email: "ada@example.com",
  photoUrl: null,
  operatingLocation: "Ugbokolo, Benue",
  agencyName: "Obi Homes",
  businessAddress: "5 Market Road",
  infoRequest: null,
  rejectionReason: null,
  suspensionReason: null,
  approvedAt: null,
  createdAt: "2026-12-01T10:00:00.000Z",
  documents: [doc("IDENTITY"), doc("OWNERSHIP_PROOF")],
  ...over,
});

function showAgent(over = {}, listings = page<unknown>([])) {
  h.useAdminAgent.mockReturnValue({ data: agent(over), isPending: false, isError: false, refetch: vi.fn() });
  h.useAdminAgentListings.mockReturnValue({ data: listings, isPending: false, isError: false, refetch: vi.fn() });
}

describe("agent application page", () => {
  beforeEach(() => {
    h.admin = { role: "ADMIN", permissions: ["accommodation.agents.review"] };
    for (const m of [h.approve, h.reject, h.requestInfo, h.suspend, h.restore, h.revoke, h.reviewDocument]) {
      m.mutateAsync.mockReset();
      m.mutateAsync.mockResolvedValue({});
      m.isPending = false;
    }
    h.openAgentDocument.mockReset();
    showAgent();
  });

  it("shows the applicant, the documents and their status", () => {
    render(<AgentPage />);
    expect(screen.getByRole("heading", { name: "Ada Obi" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getByText("5 Market Road")).toBeTruthy();
    expect(screen.getByText("Identity")).toBeTruthy();
    expect(screen.getByText("Proof of ownership")).toBeTruthy();
    expect(screen.getAllByText("Not reviewed")).toHaveLength(2);
    expect(screen.getByText(/Opening one is recorded in the audit log/)).toBeTruthy();
  });

  it("will not allow approval without identity and proof of ownership, and says what is missing", () => {
    showAgent({ documents: [doc("IDENTITY")] });
    render(<AgentPage />);
    expect((screen.getByRole("button", { name: "Approve agent" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/still needs to provide proof of ownership or a letter of authorization/)).toBeTruthy();
  });

  it("does not count a rejected document toward approval", () => {
    showAgent({ documents: [doc("IDENTITY"), doc("OWNERSHIP_PROOF", { status: "REJECTED", rejectionReason: "Blurry" })] });
    render(<AgentPage />);
    expect((screen.getByRole("button", { name: "Approve agent" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Reason: Blurry")).toBeTruthy();
  });

  it("allows approval once both are on file, and approves", async () => {
    render(<AgentPage />);
    const approve = screen.getByRole("button", { name: "Approve agent" }) as HTMLButtonElement;
    expect(approve.disabled).toBe(false);
    expect(screen.getByText(/Identity and proof of ownership are on file/)).toBeTruthy();
    fireEvent.click(approve);
    await waitFor(() => expect(h.approve.mutateAsync).toHaveBeenCalledWith("a1"));
  });

  it("will not reject without a reason, and sends it once given", async () => {
    render(<AgentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    const dialog = within(screen.getByRole("alertdialog"));
    const confirm = dialog.getByRole("button", { name: "Reject application" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(dialog.getByLabelText("Reason shown to the applicant"), {
      target: { value: "Documents are unreadable" },
    });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(h.reject.mutateAsync).toHaveBeenCalledWith({ id: "a1", reason: "Documents are unreadable" })
    );
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("asks the applicant for more documents", async () => {
    render(<AgentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Ask for more documents" }));
    const dialog = within(screen.getByRole("alertdialog"));
    fireEvent.change(dialog.getByLabelText("What do you need from them?"), { target: { value: "A utility bill" } });
    fireEvent.click(dialog.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(h.requestInfo.mutateAsync).toHaveBeenCalledWith({ id: "a1", message: "A utility bill" }));
  });

  it("shows what was last asked of the applicant, and why a rejection happened", () => {
    showAgent({ infoRequest: "Please add a utility bill" });
    const { unmount } = render(<AgentPage />);
    expect(screen.getByText(/You asked for more documents:/)).toBeTruthy();
    expect(screen.getByText(/Please add a utility bill/)).toBeTruthy();
    unmount();
    showAgent({ status: "REJECTED", rejectionReason: "Not a landlord" });
    render(<AgentPage />);
    expect(screen.getByText(/Not a landlord/)).toBeTruthy();
    expect(screen.getByText(/The person can apply again/)).toBeTruthy();
  });

  it("accepts a document with one click, and rejects one only with a reason", async () => {
    render(<AgentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Accept Identity" }));
    await waitFor(() =>
      expect(h.reviewDocument.mutateAsync).toHaveBeenCalledWith({
        agentId: "a1",
        documentId: "d-IDENTITY",
        decision: "ACCEPTED",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Reject Identity" }));
    const dialog = within(screen.getByRole("alertdialog"));
    expect((dialog.getByRole("button", { name: "Reject document" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(dialog.getByLabelText("What is wrong with it?"), { target: { value: "Photo is cut off" } });
    fireEvent.click(dialog.getByRole("button", { name: "Reject document" }));
    await waitFor(() =>
      expect(h.reviewDocument.mutateAsync).toHaveBeenLastCalledWith({
        agentId: "a1",
        documentId: "d-IDENTITY",
        decision: "REJECTED",
        reason: "Photo is cut off",
      })
    );
  });

  it("opens the private document through the signed-in service call", async () => {
    h.openAgentDocument.mockResolvedValue({ blob: new Blob(["x"], { type: "image/png" }), filename: "id.png" });
    Object.defineProperty(URL, "createObjectURL", { value: () => "blob:doc", configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: () => {}, configurable: true });
    render(<AgentPage />);
    fireEvent.click(screen.getByRole("button", { name: "View Identity" }));
    await waitFor(() => expect(h.openAgentDocument).toHaveBeenCalledWith("a1", "d-IDENTITY"));
    expect(await screen.findByRole("img", { name: "Identity" })).toBeTruthy();
  });

  it("offers suspend and revoke for an approved agent, restore for a suspended one", () => {
    showAgent({ status: "APPROVED" });
    const { unmount } = render(<AgentPage />);
    expect(screen.getByRole("button", { name: "Suspend" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Revoke privileges" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Approve agent" })).toBeNull();
    unmount();
    showAgent({ status: "SUSPENDED", suspensionReason: "Fake listing" });
    render(<AgentPage />);
    expect(screen.getByRole("button", { name: "Restore agent" })).toBeTruthy();
    expect(screen.getByText(/Fake listing/)).toBeTruthy();
  });

  it("suspends with a reason, and restores in one click", async () => {
    showAgent({ status: "APPROVED" });
    const { unmount } = render(<AgentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
    const dialog = within(screen.getByRole("alertdialog"));
    fireEvent.change(dialog.getByLabelText("Reason (the agent sees this)"), { target: { value: "Reported twice" } });
    fireEvent.click(dialog.getByRole("button", { name: "Suspend agent" }));
    await waitFor(() => expect(h.suspend.mutateAsync).toHaveBeenCalledWith({ id: "a1", reason: "Reported twice" }));
    unmount();
    showAgent({ status: "SUSPENDED" });
    render(<AgentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Restore agent" }));
    await waitFor(() => expect(h.restore.mutateAsync).toHaveBeenCalledWith("a1"));
  });

  it("revoking is marked as final and needs a reason", async () => {
    showAgent({ status: "APPROVED" });
    render(<AgentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Revoke privileges" }));
    const dialog = within(screen.getByRole("alertdialog"));
    expect(dialog.getByText(/cannot be undone from here/)).toBeTruthy();
    fireEvent.change(dialog.getByLabelText("Reason (the agent sees this)"), { target: { value: "Fraud" } });
    fireEvent.click(dialog.getByRole("button", { name: "Revoke privileges" }));
    await waitFor(() => expect(h.revoke.mutateAsync).toHaveBeenCalledWith({ id: "a1", reason: "Fraud" }));
  });

  it("shows the backend's explanation when a decision is refused, and leaves the page as it was", async () => {
    h.approve.mutateAsync.mockRejectedValue(new Error("An identity document is needed before approval."));
    render(<AgentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Approve agent" }));
    expect((await screen.findByRole("alert")).textContent).toContain("An identity document is needed before approval.");
  });

  it("hides every decision from an admin without the review permission, but not the facts", () => {
    h.admin = { role: "ADMIN", permissions: ["accommodation.read"] };
    render(<AgentPage />);
    expect(screen.queryByRole("button", { name: "Approve agent" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Reject/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Accept/ })).toBeNull();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^View/ })).toHaveLength(2);
  });

  it("lists the agent's earlier listings, with links to open them", () => {
    showAgent({}, page([
      {
        id: "l1",
        title: "Bright room near campus",
        agentId: "a1",
        agentName: "Obi Homes",
        moderationStatus: "APPROVED",
        publicationStatus: "ACTIVE",
        availabilityStatus: "AVAILABLE",
        submittedAt: null,
        expiresAt: null,
        createdAt: "2026-11-01T00:00:00Z",
      },
    ]));
    render(<AgentPage />);
    expect(screen.getByText("Bright room near campus")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Bright room near campus" }).getAttribute("href")).toBe(
      "/admin/accommodation/listings/l1"
    );
  });

  it("shows loading and error states, with retry", () => {
    h.useAdminAgent.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    const { unmount } = render(<AgentPage />);
    expect(screen.queryByRole("heading", { name: "Ada Obi" })).toBeNull();
    unmount();
    const refetch = vi.fn();
    h.useAdminAgent.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch });
    render(<AgentPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
