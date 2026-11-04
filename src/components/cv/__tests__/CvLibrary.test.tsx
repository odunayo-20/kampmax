// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Cv } from "@/services/job-applications";

const state = {
  cvs: [] as Cv[],
  loading: false,
  loadError: false,
};
const mutations = {
  upload: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
};
const downloadCv = vi.fn();
const getCvLink = vi.fn();

vi.mock("@/hooks/use-job-applications", () => ({
  useCvs: () => ({
    data: state.loading || state.loadError ? undefined : state.cvs,
    isPending: state.loading,
    isError: state.loadError,
    error: new Error("down"),
    refetch: vi.fn(),
  }),
  useUploadCv: () => ({ mutate: mutations.upload, isPending: false }),
  useRenameCv: () => ({ mutate: mutations.rename, isPending: false }),
  useDeleteCv: () => ({ mutate: mutations.remove, isPending: false }),
}));
vi.mock("@/services/job-applications", () => ({
  downloadCv: (...a: unknown[]) => downloadCv(...a),
  getCvLink: (...a: unknown[]) => getCvLink(...a),
}));

import { CvLibrary, deleteCvBody } from "../CvLibrary";
import { CvUploadForm } from "../CvUploadForm";

afterEach(cleanup);
beforeEach(() => {
  state.cvs = [];
  state.loading = false;
  state.loadError = false;
  for (const m of Object.values(mutations)) m.mockReset();
  downloadCv.mockReset().mockResolvedValue({ error: null });
  getCvLink.mockReset();
});

const cv = (overrides: Partial<Cv> = {}): Cv => ({
  id: "cv-1",
  label: "Design CV",
  filename: "ada-design.pdf",
  sizeBytes: 120_000,
  mimeType: "application/pdf",
  createdAt: "2026-11-01T00:00:00.000Z",
  applicationCount: 0,
  ...overrides,
});

describe("deleteCvBody", () => {
  it("says the file is deleted when nothing uses it", () => {
    expect(deleteCvBody({ label: "Design CV", applicationCount: 0 })).toBe(
      '"Design CV" will be removed from your CVs. The file is deleted.'
    );
  });

  it("says one employer keeps seeing it while an application uses it", () => {
    expect(deleteCvBody({ label: "Design CV", applicationCount: 1 })).toContain(
      "An application you sent still uses this file, so that employer keeps seeing it"
    );
  });

  it("says several employers keep seeing it", () => {
    expect(deleteCvBody({ label: "Design CV", applicationCount: 3 })).toContain(
      "3 applications you sent still use this file, so those employers keep seeing it"
    );
  });
});

describe("CvLibrary", () => {
  it("explains the library and that CVs are private", () => {
    render(<CvLibrary />);
    expect(screen.getByText(/Keep up to 3 CVs here/)).toBeTruthy();
    expect(screen.getByText(/Your CVs are private/)).toBeTruthy();
    expect(screen.getByText(/Kampmax staff can open one to review a report/)).toBeTruthy();
  });

  it("shows a loading state, then an empty one with the upload form", () => {
    state.loading = true;
    const { rerender } = render(<CvLibrary />);
    expect(screen.getByRole("status", { name: "Loading your CVs" })).toBeTruthy();

    state.loading = false;
    rerender(<CvLibrary />);
    expect(screen.getByText(/haven't added a CV yet/)).toBeTruthy();
    expect(screen.getByLabelText("Add a CV")).toBeTruthy();
  });

  it("offers a retry when the CVs cannot be loaded", () => {
    state.loadError = true;
    render(<CvLibrary />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("lists each CV with its file, size and how many applications use it", () => {
    state.cvs = [cv(), cv({ id: "cv-2", label: "General", filename: "general.docx", applicationCount: 2 })];
    render(<CvLibrary />);

    expect(screen.getByText("Design CV")).toBeTruthy();
    expect(screen.getByText(/ada-design\.pdf · 117 KB/)).toBeTruthy();
    expect(screen.getByText("Used in 2 applications")).toBeTruthy();
    expect(screen.queryByText("Used in 0 applications")).toBeNull();
  });

  it("stops offering uploads once three CVs are saved", () => {
    state.cvs = [cv({ id: "a" }), cv({ id: "b" }), cv({ id: "c" })];
    render(<CvLibrary />);
    expect(screen.queryByLabelText("Add a CV")).toBeNull();
    expect(screen.getByText(/which is the most you can keep/)).toBeTruthy();
  });

  it("downloads a CV through a fresh link", async () => {
    state.cvs = [cv()];
    render(<CvLibrary />);

    fireEvent.click(screen.getByRole("button", { name: /Download/ }));

    await waitFor(() => expect(downloadCv).toHaveBeenCalledTimes(1));
    // The link is asked for at the click, not before.
    const getLink = downloadCv.mock.calls[0][0] as () => unknown;
    getLink();
    expect(getCvLink).toHaveBeenCalledWith("cv-1");
  });

  it("says so when a CV cannot be opened", async () => {
    state.cvs = [cv()];
    downloadCv.mockResolvedValue({ error: { message: "Server error", status: 500 } });
    render(<CvLibrary />);

    fireEvent.click(screen.getByRole("button", { name: /Download/ }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/went wrong/i);
  });

  it("renames a CV", () => {
    state.cvs = [cv()];
    render(<CvLibrary />);

    fireEvent.click(screen.getByRole("button", { name: "Rename Design CV" }));
    fireEvent.change(screen.getByLabelText("CV name"), { target: { value: "  Marketing CV " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mutations.rename).toHaveBeenCalledWith(
      { id: "cv-1", label: "Marketing CV" },
      expect.any(Object)
    );
  });

  it("does not call the server to 'rename' a CV to the same name", () => {
    state.cvs = [cv()];
    render(<CvLibrary />);
    fireEvent.click(screen.getByRole("button", { name: "Rename Design CV" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(mutations.rename).not.toHaveBeenCalled();
  });

  it("asks before deleting, and spells out what happens to the file", () => {
    state.cvs = [cv({ applicationCount: 1 })];
    render(<CvLibrary />);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText(/that employer keeps seeing it/)).toBeTruthy();
    expect(mutations.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete CV" }));
    expect(mutations.remove).toHaveBeenCalledWith("cv-1", expect.any(Object));
  });

  it("can be cancelled out of deleting", () => {
    state.cvs = [cv()];
    render(<CvLibrary />);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mutations.remove).not.toHaveBeenCalled();
    expect(screen.queryByText(/The file is deleted/)).toBeNull();
  });
});

describe("CvUploadForm", () => {
  const pdf = (name = "ada.pdf", size = 1000) => new File([new Uint8Array(size)], name, { type: "application/pdf" });
  const pick = (file: File) =>
    fireEvent.change(screen.getByLabelText("Add a CV"), { target: { files: [file] } });

  it("refuses a file that is not a PDF or Word document, before sending anything", () => {
    render(<CvUploadForm count={0} />);
    pick(new File(["x"], "ada.png", { type: "image/png" }));
    expect(screen.getByRole("alert").textContent).toBe("A CV must be a PDF or a Word (.docx) file.");
    expect(screen.queryByLabelText("Name (optional)")).toBeNull();
    expect((screen.getByRole("button", { name: "Save CV" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("refuses a file over 3 MB", () => {
    render(<CvUploadForm count={0} />);
    pick(pdf("big.pdf", 3 * 1024 * 1024 + 1));
    expect(screen.getByRole("alert").textContent).toMatch(/A CV can be up to 3\.0 MB/);
  });

  it("offers a name once a good file is chosen, defaulting to the file name", () => {
    render(<CvUploadForm count={0} />);
    pick(pdf("Ada Lovelace CV.pdf"));
    const name = screen.getByLabelText("Name (optional)") as HTMLInputElement;
    expect(name.placeholder).toBe("Ada Lovelace CV");
    expect((screen.getByRole("button", { name: "Save CV" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("uploads the file with the chosen name", () => {
    render(<CvUploadForm count={1} />);
    const file = pdf();
    pick(file);
    fireEvent.change(screen.getByLabelText("Name (optional)"), { target: { value: "  Design CV " } });
    fireEvent.click(screen.getByRole("button", { name: "Save CV" }));
    expect(mutations.upload).toHaveBeenCalledWith({ file, label: "Design CV" }, expect.any(Object));
  });

  it("sends no name when none is typed", () => {
    render(<CvUploadForm count={0} />);
    const file = pdf();
    pick(file);
    fireEvent.click(screen.getByRole("button", { name: "Save CV" }));
    expect(mutations.upload).toHaveBeenCalledWith({ file, label: undefined }, expect.any(Object));
  });

  it("shows the server's reason when it refuses a file, and tells the page when one is saved", () => {
    const onUploaded = vi.fn();
    render(<CvUploadForm count={0} onUploaded={onUploaded} />);

    pick(pdf());
    mutations.upload.mockImplementation((_vars, opts) =>
      opts.onError(
        Object.assign(new Error("This file is not a real PDF or Word (.docx) document"), { status: 400 })
      )
    );
    fireEvent.click(screen.getByRole("button", { name: "Save CV" }));
    expect(screen.getByRole("alert").textContent).toBe("This file is not a real PDF or Word (.docx) document");

    mutations.upload.mockImplementation((_vars, opts) => opts.onSuccess({ id: "cv-new" }));
    fireEvent.click(screen.getByRole("button", { name: "Save CV" }));
    expect(onUploaded).toHaveBeenCalledWith({ id: "cv-new" });
  });

  it("says the library is full, with no way to upload", () => {
    render(<CvUploadForm count={3} />);
    expect(screen.getByText(/You have 3 CVs/)).toBeTruthy();
    expect(screen.queryByLabelText("Add a CV")).toBeNull();
  });
});
