"use client";

import { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  ChevronDown,
  Layers,
  Hash,
  School,
} from "lucide-react";
import { Campus } from "@/types";
import { cn } from "@/lib/utils";

export const NIGERIAN_FACULTIES = [
  "Sciences / Physical & Life Sciences",
  "Engineering & Technology",
  "Computing & Information Technology",
  "Arts & Humanities",
  "Social Sciences",
  "Management & Business Administration",
  "Clinical Sciences / Medicine & Surgery",
  "Pharmacy",
  "Law",
  "Environmental Studies / Architecture",
  "Agriculture & Forestry",
  "Education",
];

export const ACADEMIC_LEVELS = [
  { value: "100L", label: "100 Level (Freshman)" },
  { value: "200L", label: "200 Level (Sophomore)" },
  { value: "300L", label: "300 Level (Junior)" },
  { value: "400L", label: "400 Level (Senior / Finalist)" },
  { value: "500L", label: "500 Level (Engineering / 5-Yr Finalist)" },
  { value: "Postgraduate", label: "Postgraduate (PGD / Masters / PhD)" },
];

interface AcademicInfoStepProps {
  selectedCampus: Campus | null;
  faculty: string;
  department: string;
  level: string;
  matricNumber: string;
  onChangeFaculty: (val: string) => void;
  onChangeDepartment: (val: string) => void;
  onChangeLevel: (val: string) => void;
  onChangeMatricNumber: (val: string) => void;
  className?: string;
}

export function AcademicInfoStep({
  selectedCampus,
  faculty,
  department,
  level,
  matricNumber,
  onChangeFaculty,
  onChangeDepartment,
  onChangeLevel,
  onChangeMatricNumber,
  className,
}: AcademicInfoStepProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasAnyInfo = Boolean(faculty || department || level || matricNumber);
  const campusDepartments = selectedCampus?.departments || [];

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        isExpanded || hasAnyInfo
          ? "border-kampmax-blue/30 bg-blue-50/20 shadow-xs"
          : "border-kampmax-border bg-white hover:border-kampmax-border/80",
        className
      )}
    >
      {/* Header Accordion Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-3.5 text-left transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              hasAnyInfo
                ? "bg-kampmax-blue text-white"
                : "bg-kampmax-muted text-kampmax-text-secondary"
            )}
          >
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-kampmax-text">
                Academic & Faculty Details
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                Optional
              </span>
              {hasAnyInfo && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                  Added
                </span>
              )}
            </div>
            <p className="text-[11px] text-kampmax-text-secondary truncate mt-0.5">
              Connect with classmates, course past questions, and departmental books
            </p>
          </div>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 text-kampmax-text-secondary transition-transform duration-200 shrink-0",
            isExpanded ? "rotate-180 text-kampmax-blue" : ""
          )}
        />
      </button>

      {/* Expanded Fields */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 space-y-3.5 border-t border-kampmax-border/60 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1 text-[11px] text-kampmax-blue font-medium bg-kampmax-blue/5 p-2 rounded-lg border border-kampmax-blue/10">
            <span>
              Helps peers identify you in department study groups & textbook exchanges.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Faculty Dropdown */}
            <div>
              <label
                htmlFor="academic-faculty"
                className="block text-xs font-medium text-kampmax-text mb-1 flex items-center gap-1"
              >
                <School className="h-3 w-3 text-kampmax-text-secondary" />
                Faculty / School
              </label>
              <select
                id="academic-faculty"
                value={faculty}
                onChange={(e) => onChangeFaculty(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue"
              >
                <option value="">Select your faculty...</option>
                {NIGERIAN_FACULTIES.map((fac) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
            </div>

            {/* Level (Year) Selector */}
            <div>
              <label
                htmlFor="academic-level"
                className="block text-xs font-medium text-kampmax-text mb-1 flex items-center gap-1"
              >
                <Layers className="h-3 w-3 text-kampmax-text-secondary" />
                Current Level (Year)
              </label>
              <select
                id="academic-level"
                value={level}
                onChange={(e) => onChangeLevel(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue"
              >
                <option value="">Select level / year...</option>
                {ACADEMIC_LEVELS.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Department */}
            <div>
              <label
                htmlFor="academic-department"
                className="block text-xs font-medium text-kampmax-text mb-1 flex items-center gap-1"
              >
                <BookOpen className="h-3 w-3 text-kampmax-text-secondary" />
                Department / Course of Study
              </label>
              <input
                id="academic-department"
                type="text"
                list="campus-departments-list"
                value={department}
                onChange={(e) => onChangeDepartment(e.target.value)}
                placeholder="e.g. Computer Science, Accounting..."
                className="w-full h-10 px-3 text-xs bg-white border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue placeholder:text-kampmax-text-muted"
              />
              {campusDepartments.length > 0 && (
                <datalist id="campus-departments-list">
                  {campusDepartments.map((dept) => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
              )}
            </div>

            {/* Matric / Student ID (Optional) */}
            <div>
              <label
                htmlFor="academic-matric"
                className="block text-xs font-medium text-kampmax-text mb-1 flex items-center gap-1"
              >
                <Hash className="h-3 w-3 text-kampmax-text-secondary" />
                Matriculation / Student ID
              </label>
              <input
                id="academic-matric"
                type="text"
                value={matricNumber}
                onChange={(e) => onChangeMatricNumber(e.target.value)}
                placeholder="e.g. CSC/2022/1044 (optional)"
                className="w-full h-10 px-3 text-xs bg-white border border-kampmax-border rounded-lg focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue placeholder:text-kampmax-text-muted"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
