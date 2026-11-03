// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import type { FreelancerService } from "@/types/freelancer-services";

const mutate = vi.fn();
vi.mock("@/hooks/use-messages", () => ({ useSendMessage: () => ({ mutate, isPending: false }) }));
vi.mock("@/components/ui/FallbackImage", () => ({ FallbackImage: () => null }));

import { MessageComposer } from "../MessageComposer";

const ID = "4e65979b-5e0e-444c-b477-249269bfc8b6";
const service = {
  id: ID,
  slug: "backend-development",
  userId: "profile-1",
  title: "Backend development",
  pricing: "fixed",
  price: 50000,
  deliveryUnit: "days",
  status: "published",
} as unknown as FreelancerService;

const box = () => screen.getByLabelText("Message") as HTMLTextAreaElement;
const sendButton = () => screen.getByRole("button", { name: /send message/i }) as HTMLButtonElement;

describe("MessageComposer with a staged service", () => {
  afterEach(cleanup);
  beforeEach(() => mutate.mockReset());

  it("shows the service and sends the text together with the marker", () => {
    const onClear = vi.fn();
    mutate.mockImplementation((_input: unknown, callbacks?: { onSuccess?: () => void }) =>
      callbacks?.onSuccess?.()
    );
    render(<MessageComposer conversationId="c1" stagedService={service} onClearService={onClear} />);

    expect(screen.getByText("Backend development")).toBeTruthy();
    fireEvent.change(box(), { target: { value: "Can you start Monday?" } });
    fireEvent.click(sendButton());

    expect(mutate.mock.calls[0][0]).toEqual({
      conversationId: "c1",
      text: `Can you start Monday?\n\nService: /freelancers/services/${ID}`,
    });
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("lets the buyer send the service on its own", () => {
    render(<MessageComposer conversationId="c1" stagedService={service} onClearService={vi.fn()} />);
    expect(sendButton().disabled).toBe(false);
    fireEvent.click(sendButton());
    expect(mutate.mock.calls[0][0].text).toBe(`Service: /freelancers/services/${ID}`);
  });

  it("drops the service when the buyer removes it, and then needs text again", () => {
    const onClear = vi.fn();
    const { rerender } = render(<MessageComposer conversationId="c1" stagedService={service} onClearService={onClear} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove service from message" }));
    expect(onClear).toHaveBeenCalled();

    rerender(<MessageComposer conversationId="c1" stagedService={null} onClearService={onClear} />);
    expect(sendButton().disabled).toBe(true);
  });

  it("keeps the staged service when sending fails, so nothing is lost", () => {
    const onClear = vi.fn();
    mutate.mockImplementation((_input: unknown, callbacks?: { onError?: (e: unknown) => void }) =>
      callbacks?.onError?.(new Error("offline"))
    );
    render(<MessageComposer conversationId="c1" stagedService={service} onClearService={onClear} />);
    fireEvent.change(box(), { target: { value: "hello there" } });
    fireEvent.click(sendButton());

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").textContent).toContain("Your draft is still here");
    expect(onClear).not.toHaveBeenCalled();
    expect(box().value).toBe("hello there");
    expect(screen.getByText("Backend development")).toBeTruthy();
  });
});
