// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AcademicInfoStep } from "../AcademicInfoStep";
import { campuses } from "@/data/campus";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AcademicInfoStep Component", () => {
  const dummyCampus = campuses.find((c) => c.id === "oau")!;

  it("renders collapsed header by default", () => {
    render(
      <AcademicInfoStep
        selectedCampus={dummyCampus}
        faculty=""
        department=""
        level=""
        matricNumber=""
        onChangeFaculty={vi.fn()}
        onChangeDepartment={vi.fn()}
        onChangeLevel={vi.fn()}
        onChangeMatricNumber={vi.fn()}
      />
    );

    expect(screen.getByText(/Academic & Faculty Details/i)).toBeTruthy();
    expect(screen.getByText(/Optional/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Faculty \/ School/i)).toBeNull();
  });

  it("expands accordion and allows selecting faculty, level, and typing department", () => {
    const onFacultyChange = vi.fn();
    const onLevelChange = vi.fn();
    const onDeptChange = vi.fn();
    const onMatricChange = vi.fn();

    render(
      <AcademicInfoStep
        selectedCampus={dummyCampus}
        faculty=""
        department=""
        level=""
        matricNumber=""
        onChangeFaculty={onFacultyChange}
        onChangeDepartment={onDeptChange}
        onChangeLevel={onLevelChange}
        onChangeMatricNumber={onMatricChange}
      />
    );

    // Click to expand
    fireEvent.click(screen.getByText(/Academic & Faculty Details/i));

    const facultySelect = screen.getByLabelText(/Faculty \/ School/i);
    expect(facultySelect).toBeTruthy();

    fireEvent.change(facultySelect, { target: { value: "Engineering & Technology" } });
    expect(onFacultyChange).toHaveBeenCalledWith("Engineering & Technology");

    const levelSelect = screen.getByLabelText(/Current Level \(Year\)/i);
    fireEvent.change(levelSelect, { target: { value: "300L" } });
    expect(onLevelChange).toHaveBeenCalledWith("300L");

    const deptInput = screen.getByPlaceholderText(/e\.g\. Computer Science/i);
    fireEvent.change(deptInput, { target: { value: "Computer Science" } });
    expect(onDeptChange).toHaveBeenCalledWith("Computer Science");

    const matricInput = screen.getByPlaceholderText(/e\.g\. CSC\/2022\/1044/i);
    fireEvent.change(matricInput, { target: { value: "CSC/2021/045" } });
    expect(onMatricChange).toHaveBeenCalledWith("CSC/2021/045");
  });
});
