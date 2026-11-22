// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}));

let auth: { user: { id: string } | null; status: string } = { user: { id: "me" }, status: "authenticated" };
vi.mock("@/lib/auth-context", () => ({ useAuth: () => auth }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/marketplace/p1" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { InboxQuestionCard } from "../InboxQuestionCard";
import { ProductQuestions } from "../ProductQuestions";
import type { InboxQuestion, Question } from "@/services/product-questions";

const ok = <T,>(data: T) => Promise.resolve({ data, error: null });
const fail = (message: string) => Promise.resolve({ data: null, error: new Error(message) });
const page = (items: Question[]) => ok({ items, meta: { total: items.length, page: 1, limit: 3, totalPages: 1 } });

const answered: Question = {
  id: "q1",
  question: "Is the battery original?",
  answer: "Yes, original and sealed.",
  askedAt: new Date().toISOString(),
  answeredAt: new Date().toISOString(),
  asker: "Ada O.",
  mine: false,
};
const waiting: Question = { ...answered, id: "q2", question: "Does it come with a charger?", answer: null, answeredAt: null, mine: true };

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("questions on a product page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth = { user: { id: "me" }, status: "authenticated" };
  });
  afterEach(cleanup);

  it("shows answered questions with the seller's answer, and your own waiting one", async () => {
    get.mockReturnValue(page([waiting, answered]));
    wrap(<ProductQuestions productId="p1" />);

    expect(await screen.findByText("Is the battery original?")).toBeTruthy();
    expect(screen.getByText("Yes, original and sealed.")).toBeTruthy();
    expect(screen.getByText("Waiting for the seller to answer")).toBeTruthy();
    expect(screen.getByText(/Ada O\./)).toBeTruthy();
  });

  it("says so when nobody has asked yet", async () => {
    get.mockReturnValue(page([]));
    wrap(<ProductQuestions productId="p1" />);
    expect(await screen.findByText(/No questions yet/)).toBeTruthy();
  });

  it("sends a signed-in shopper's question, tidied by the server, and confirms it", async () => {
    get.mockReturnValue(page([]));
    post.mockReturnValue(ok(waiting));
    wrap(<ProductQuestions productId="p1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Ask a question" }));
    const send = screen.getByRole("button", { name: "Send question" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "Can I pick it up today?" } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);

    await waitFor(() => expect(post).toHaveBeenCalledWith("/products/p1/questions", { question: "Can I pick it up today?" }));
    expect(await screen.findByText(/We will tell you when the seller answers/)).toBeTruthy();
  });

  it("shows the server's reason when a question is refused", async () => {
    get.mockReturnValue(page([]));
    post.mockReturnValue(fail("You can ask up to 5 questions a day. Try again tomorrow."));
    wrap(<ProductQuestions productId="p1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Ask a question" }));
    fireEvent.change(screen.getByLabelText("Your question"), { target: { value: "Can I pick it up today?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    expect((await screen.findByRole("alert")).textContent).toContain("up to 5 questions");
  });

  it("sends a signed-out visitor to sign in, coming back to this product", async () => {
    auth = { user: null, status: "unauthenticated" };
    get.mockReturnValue(page([]));
    wrap(<ProductQuestions productId="p1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Ask a question" }));
    expect(push).toHaveBeenCalledWith("/login?returnTo=%2Fmarketplace%2Fp1");
  });

  it("lets the asker take back a waiting question", async () => {
    get.mockReturnValue(page([waiting]));
    del.mockReturnValue(ok(null));
    wrap(<ProductQuestions productId="p1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Remove your question" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/product-questions/q2"));
  });
});

describe("the seller's inbox card", () => {
  const inbox: InboxQuestion = { ...waiting, mine: false, product: { id: "p1", name: "Red Sneakers", image: null } };

  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("answers a waiting question", async () => {
    patch.mockReturnValue(ok({ ...inbox, answer: "Yes, one charger." }));
    wrap(
      <ul>
        <InboxQuestionCard q={inbox} />
      </ul>
    );

    expect(screen.getByText("Red Sneakers")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Answer" }));
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "Yes, one charger." } });
    fireEvent.click(screen.getByRole("button", { name: "Post answer" }));

    await waitFor(() => expect(patch).toHaveBeenCalledWith("/product-questions/q2/answer", { answer: "Yes, one charger." }));
  });

  it("removes a question only after the seller confirms", async () => {
    post.mockReturnValue(ok(null));
    const confirm = vi.spyOn(window, "confirm");
    wrap(
      <ul>
        <InboxQuestionCard q={inbox} />
      </ul>
    );

    confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole("button", { name: "Remove this question" }));
    expect(post).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove this question" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/product-questions/q2/hide", {}));
  });
});
