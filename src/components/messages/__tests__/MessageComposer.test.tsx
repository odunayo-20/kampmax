// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mutate = vi.fn();
vi.mock("@/hooks/use-messages", () => ({
  useSendMessage: () => ({ mutate, isPending: false }),
}));

import { MessageComposer } from "../MessageComposer";

const box = () => screen.getByLabelText("Message") as HTMLTextAreaElement;
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });

describe("MessageComposer keyboard", () => {
  beforeEach(() => {
    mutate.mockClear();
    render(<MessageComposer conversationId="c1" />);
  });

  it("sends on Enter", () => {
    type("hello");
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ conversationId: "c1", text: "hello" });
  });

  it("does not send on Shift+Enter, leaving the newline to the textarea", () => {
    type("hello");
    const notPrevented = fireEvent.keyDown(box(), { key: "Enter", shiftKey: true });
    expect(mutate).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true); // default (newline) not cancelled
  });

  it("does not send an empty or whitespace-only message", () => {
    type("   ");
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not send while an IME is composing", () => {
    type("にほん");
    fireEvent.keyDown(box(), { key: "Enter", isComposing: true });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("ignores other keys", () => {
    type("hello");
    fireEvent.keyDown(box(), { key: "a" });
    expect(mutate).not.toHaveBeenCalled();
  });
});
