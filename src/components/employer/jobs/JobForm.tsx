"use client";

import { useMemo, useState } from "react";
import { Plus, X, Eye, PencilLine, Send, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import type {
  Opportunity,
  OpportunityBudgetType,
  OpportunityDuration,
  OpportunityInput,
  OpportunityScreeningQuestion,
  OpportunityWorkArrangement,
} from "@/types/opportunity";
import {
  JOB_DESCRIPTION_MAX_CHARS,
  JOB_DEADLINE_MIN_DAYS,
  JOB_QUESTION_MAX_CHARS,
  JOB_REQUIREMENTS_MAX_CHARS,
  JOB_SCREENING_QUESTIONS_MAX,
  JOB_SKILL_MAX_COUNT,
  JOB_SUMMARY_MAX_CHARS,
  JOB_TITLE_MAX_CHARS,
} from "@/config/jobs";
import {
  DURATION_LABEL,
  JOB_CATEGORIES,
  JOB_EXPERIENCE_LEVELS,
  JOB_WORK_ARRANGEMENT_OPTIONS,
} from "@/config/opportunity";
import { Button, Input, Select } from "@/components/ui";
import { AttachmentPicker } from "@/components/uploads/AttachmentPicker";
import { getCampuses } from "@/services/campus";
import { JobPreview } from "./JobPreview";

const fieldClass =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-error-600">{message}</p>;
}

/**
 * Builds blank values for the create job form. Sensible defaults for
 * backend-required enums so "save draft" always produces valid input.
 */
export function emptyJobFormValues(): OpportunityInput {
  return {
    title: "",
    categoryId: "",
    summary: "",
    description: "",
    requirements: "",
    skills: [],
    workArrangement: "remote",
    location: { city: "", state: "", campusId: "", remote: true },
    budget: { type: "project", min: undefined, max: undefined, currency: "NGN" },
    duration: "few_weeks",
    experienceLevel: "intermediate",
    deadline: "",
    screeningQuestions: [],
    attachments: [],
  };
}

/** Converts an existing job record back into editable form values. */
export function opportunityToInput(o: Opportunity): OpportunityInput {
  return {
    title: o.title,
    categoryId: o.categoryId,
    summary: o.summary,
    description: o.description,
    requirements: o.requirements,
    skills: [...o.skills],
    workArrangement: o.workArrangement,
    location: { ...o.location },
    budget: { ...o.budget },
    duration: o.duration,
    experienceLevel: o.experienceLevel,
    deadline: o.deadline.slice(0, 10),
    screeningQuestions: o.screeningQuestions.map((q) => ({ ...q })),
    attachments: o.attachments.map((a) => ({ ...a })),
  };
}

/** Client-side mirror of the backend `validateJobInput` DTO checks. */
export function validateJobFormValues(values: OpportunityInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.title.trim()) errors.title = "A job title is required.";
  else if (values.title.trim().length > JOB_TITLE_MAX_CHARS)
    errors.title = `Job title must be ${JOB_TITLE_MAX_CHARS} characters or fewer.`;
  if (!values.categoryId) errors.categoryId = "Choose a category.";
  if (!values.summary.trim()) errors.summary = "A short summary is required.";
  else if (values.summary.trim().length > JOB_SUMMARY_MAX_CHARS)
    errors.summary = `Summary must be ${JOB_SUMMARY_MAX_CHARS} characters or fewer.`;
  if (!values.description.trim()) errors.description = "A full description is required.";
  else if (values.description.trim().length > JOB_DESCRIPTION_MAX_CHARS)
    errors.description = `Description must be ${JOB_DESCRIPTION_MAX_CHARS} characters or fewer.`;
  if (!values.requirements.trim()) errors.requirements = "Job requirements are required.";
  else if (values.requirements.trim().length > JOB_REQUIREMENTS_MAX_CHARS)
    errors.requirements = `Requirements must be ${JOB_REQUIREMENTS_MAX_CHARS} characters or fewer.`;
  if (values.skills.length === 0) errors.skills = "Add at least one skill.";
  else if (values.skills.length > JOB_SKILL_MAX_COUNT)
    errors.skills = `Jobs can have at most ${JOB_SKILL_MAX_COUNT} skills.`;
  if (values.budget.min !== undefined && values.budget.max !== undefined && values.budget.max < values.budget.min)
    errors.budget = "Maximum budget can't be lower than the minimum.";
  const deadline = new Date(`${values.deadline}T23:59:59`);
  if (!values.deadline || Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now())
    errors.deadline = "Pick a deadline in the future.";
  for (const q of values.screeningQuestions) {
    if (!q.question.trim()) {
      errors.screening = "Every screening question needs text.";
      break;
    }
    if (q.question.trim().length > JOB_QUESTION_MAX_CHARS) {
      errors.screening = `Screening questions must be ${JOB_QUESTION_MAX_CHARS} characters or fewer.`;
      break;
    }
  }
  return errors;
}

interface JobFormProps {
  mode: "create" | "edit";
  initialValues: OpportunityInput;
  employerName?: string;
  isSaving?: boolean;
  isPublishing?: boolean;
  error?: string | null;
  onSaveDraft: (values: OpportunityInput) => void;
  onPublish: (values: OpportunityInput) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function JobForm({
  mode,
  initialValues,
  employerName,
  isSaving,
  isPublishing,
  error,
  onSaveDraft,
  onPublish,
}: JobFormProps) {
  const [values, setValues] = useState<OpportunityInput>(() =>
    JSON.parse(JSON.stringify(initialValues))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [skillDraft, setSkillDraft] = useState("");

  const campuses = useMemo(() => getCampuses(), []);

  const set = <K extends keyof OpportunityInput>(key: K, value: OpportunityInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
  };

  const setLocation = (patch: Partial<OpportunityInput["location"]>) => {
    setValues((v) => ({ ...v, location: { ...v.location, ...patch } }));
  };

  const setBudget = (patch: Partial<OpportunityInput["budget"]>) => {
    setValues((v) => ({ ...v, budget: { ...v.budget, ...patch } }));
  };

  const addSkill = () => {
    const skill = skillDraft.trim();
    if (!skill) return;
    if (values.skills.includes(skill) || values.skills.length >= JOB_SKILL_MAX_COUNT) {
      setSkillDraft("");
      return;
    }
    set("skills", [...values.skills, skill]);
    setSkillDraft("");
  };

  const removeSkill = (skill: string) => {
    set("skills", values.skills.filter((s) => s !== skill));
  };

  const addQuestion = () => {
    if (values.screeningQuestions.length >= JOB_SCREENING_QUESTIONS_MAX) return;
    const question: OpportunityScreeningQuestion = {
      id: `sq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      question: "",
      optional: true,
    };
    set("screeningQuestions", [...values.screeningQuestions, question]);
  };

  const updateQuestion = (
    id: string,
    patch: Partial<OpportunityScreeningQuestion>
  ) => {
    set(
      "screeningQuestions",
      values.screeningQuestions.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  };

  const removeQuestion = (id: string) => {
    set(
      "screeningQuestions",
      values.screeningQuestions.filter((q) => q.id !== id)
    );
  };

  const submit = (action: "save" | "publish") => {
    const validation = validateJobFormValues(values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setFormError("Please fix the highlighted fields before continuing.");
      setPreview(false);
      return;
    }
    setFormError(null);
    const payload: OpportunityInput = {
      ...values,
      skills: values.skills.map((s) => s.trim()).filter(Boolean),
      deadline: new Date(`${values.deadline}T23:59:59`).toISOString(),
    };
    if (action === "save") onSaveDraft(payload);
    else onPublish(payload);
  };

  if (preview) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-neutral-900">Preview your job</h1>
          <Button variant="outline" size="sm" onClick={() => setPreview(false)}>
            <PencilLine className="mr-1.5 h-4 w-4" aria-hidden /> Back to edit
          </Button>
        </div>
        <JobPreview values={values} employerName={employerName} />
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-200 pt-4">
          <Button
            variant="outline"
            disabled={isSaving || isPublishing}
            onClick={() => submit("save")}
          >
            <Save className="mr-1.5 h-4 w-4" aria-hidden />
            {isSaving ? "Saving…" : "Save draft"}
          </Button>
          <Button disabled={isSaving || isPublishing} onClick={() => submit("publish")}>
            <Send className="mr-1.5 h-4 w-4" aria-hidden />
            {isPublishing ? "Publishing…" : mode === "edit" ? "Save & publish" : "Publish"}
          </Button>
        </div>
        {formError && (
          <p role="alert" className="text-xs text-error-600">
            {formError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            {mode === "create" ? "Create a job" : "Edit job draft"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Build a clear job post so campus talent can find and apply for it.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setPreview(true)} disabled={isSaving || isPublishing}>
          <Eye className="mr-1.5 h-4 w-4" aria-hidden /> Preview
        </Button>
      </div>

      {(error || formError) && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-error-100 bg-error-50 p-3 text-sm text-error-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error ?? formError}
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-warning-100 bg-warning-50 p-3 text-sm text-warning-700">
          <span>Review the highlighted fields below.</span>
        </div>
      )}

      <Section title="Job details">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-title">
              Title *
            </label>
            <Input
              id="job-title"
              value={values.title}
              maxLength={JOB_TITLE_MAX_CHARS}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Build a campus e-commerce storefront"
            />
            <FieldError message={errors.title} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-category">
              Category *
            </label>
            <Select
              id="job-category"
              value={values.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              placeholder="Choose a category"
            >
              {JOB_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <FieldError message={errors.categoryId} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-summary">
              Short summary *
            </label>
            <textarea
              id="job-summary"
              value={values.summary}
              maxLength={JOB_SUMMARY_MAX_CHARS}
              onChange={(e) => set("summary", e.target.value)}
              rows={2}
              placeholder="One or two sentences about the work."
              className={fieldClass}
            />
            <div className="flex items-start justify-between">
              <FieldError message={errors.summary} />
              <span className="ml-auto text-[10px] text-neutral-400">
                {values.summary.length}/{JOB_SUMMARY_MAX_CHARS}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-description">
              Description *
            </label>
            <textarea
              id="job-description"
              value={values.description}
              maxLength={JOB_DESCRIPTION_MAX_CHARS}
              onChange={(e) => set("description", e.target.value)}
              rows={6}
              placeholder="What's the work? What will success look like?"
              className={fieldClass}
            />
            <FieldError message={errors.description} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-requirements">
              Requirements *
            </label>
            <textarea
              id="job-requirements"
              value={values.requirements}
              maxLength={JOB_REQUIREMENTS_MAX_CHARS}
              onChange={(e) => set("requirements", e.target.value)}
              rows={5}
              placeholder="Skills, experience and anything candidates should have."
              className={fieldClass}
            />
            <FieldError message={errors.requirements} />
          </div>
        </div>
      </Section>

      <Section title="Work &amp; budget">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-arrangement">
              Work arrangement *
            </label>
            <Select
              id="job-arrangement"
              value={values.workArrangement}
              onChange={(e) =>
                set("workArrangement", e.target.value as OpportunityWorkArrangement)
              }
            >
              {JOB_WORK_ARRANGEMENT_OPTIONS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-city">
                City
              </label>
              <Input
                id="job-city"
                value={values.location.city ?? ""}
                onChange={(e) => setLocation({ city: e.target.value })}
                placeholder="e.g. Owo"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-state">
                State
              </label>
              <Input
                id="job-state"
                value={values.location.state ?? ""}
                onChange={(e) => setLocation({ state: e.target.value })}
                placeholder="e.g. Ondo"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-campus">
              Campus
            </label>
            <Select
              id="job-campus"
              value={values.location.campusId ?? ""}
              onChange={(e) => setLocation({ campusId: e.target.value || undefined })}
              placeholder="No campus"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          {values.workArrangement !== "on_site" && (
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={values.location.remote ?? false}
                onChange={(e) => setLocation({ remote: e.target.checked })}
                className="h-4 w-4 rounded border-neutral-300 accent-primary-600"
              />
              Remote-friendly
            </label>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-budget-type">
                Budget type *
              </label>
              <Select
                id="job-budget-type"
                value={values.budget.type}
                onChange={(e) =>
                  setBudget({ type: e.target.value as OpportunityBudgetType })
                }
              >
                <option value="hourly">Hourly</option>
                <option value="project">Fixed project</option>
                <option value="contract">Contract</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-budget-min">
                Min (₦)
              </label>
              <Input
                id="job-budget-min"
                type="number"
                min={0}
                value={values.budget.min ?? ""}
                onChange={(e) =>
                  setBudget({ min: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                placeholder="150000"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-budget-max">
                Max (₦)
              </label>
              <Input
                id="job-budget-max"
                type="number"
                min={0}
                value={values.budget.max ?? ""}
                onChange={(e) =>
                  setBudget({ max: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                placeholder="400000"
              />
            </div>
          </div>
          <FieldError message={errors.budget} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-duration">
                Duration *
              </label>
              <Select
                id="job-duration"
                value={values.duration}
                onChange={(e) => set("duration", e.target.value as OpportunityDuration)}
              >
                {(Object.keys(DURATION_LABEL) as OpportunityDuration[]).map((d) => (
                  <option key={d} value={d}>
                    {DURATION_LABEL[d]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-experience">
                Experience level *
              </label>
              <Select
                id="job-experience"
                value={values.experienceLevel}
                onChange={(e) => set("experienceLevel", e.target.value)}
              >
                {JOB_EXPERIENCE_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
              <FieldError message={errors.experienceLevel} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Skills">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-skills">
            Required skills *
          </label>
          <div className="flex gap-2">
            <input
              id="job-skills"
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Type a skill and press Enter"
              className={fieldClass}
            />
            <Button type="button" variant="outline" onClick={addSkill} aria-label="Add skill">
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <FieldError message={errors.skills} />
          {values.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {values.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                    className="text-neutral-400 hover:text-neutral-700"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-neutral-400">
            Up to {JOB_SKILL_MAX_COUNT} skills. Candidates are matched against these.
          </p>
        </div>
      </Section>

      <Section title="Deadline">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="job-deadline">
            Application deadline *
          </label>
          <Input
            id="job-deadline"
            type="date"
            min={new Date(Date.now() + JOB_DEADLINE_MIN_DAYS * 86_400_000)
              .toISOString()
              .slice(0, 10)}
            value={values.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
          <FieldError message={errors.deadline} />
        </div>
      </Section>

      <Section title="Screening questions">
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Optional questions candidates answer when they apply. Up to{" "}
            {JOB_SCREENING_QUESTIONS_MAX}.
          </p>
          <FieldError message={errors.screening} />
          {values.screeningQuestions.map((q) => (
            <div key={q.id} className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3">
              <textarea
                value={q.question}
                maxLength={JOB_QUESTION_MAX_CHARS}
                onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                rows={2}
                placeholder="What do you want to ask candidates?"
                className={fieldClass}
              />
              <div className="flex flex-col items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-500">
                  <input
                    type="checkbox"
                    checked={q.optional}
                    onChange={(e) => updateQuestion(q.id, { optional: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-neutral-300 accent-primary-600"
                  />
                  Optional
                </label>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  aria-label="Remove question"
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQuestion}
            disabled={values.screeningQuestions.length >= JOB_SCREENING_QUESTIONS_MAX}
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add a question
          </Button>
        </div>
      </Section>

      <Section title="Documents">
        <p className="mb-3 text-xs text-neutral-500">
          Optional briefs or specs for candidates (PDF, DOC/DOCX, PNG or JPG · up to 5MB each).
        </p>
        <AttachmentPicker
          category="jobAttachment"
          value={values.attachments ?? []}
          onChange={(next) => set("attachments", next)}
          disabled={isSaving || isPublishing}
        />
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-200 pt-4">
        <Button
          variant="outline"
          disabled={isSaving || isPublishing}
          onClick={() => submit("save")}
        >
          <Save className="mr-1.5 h-4 w-4" aria-hidden />
          {isSaving ? "Saving…" : "Save draft"}
        </Button>
        <Button disabled={isSaving || isPublishing} onClick={() => submit("publish")}>
          <Send className="mr-1.5 h-4 w-4" aria-hidden />
          {isPublishing ? "Publishing…" : mode === "edit" ? "Save & publish" : "Publish"}
        </Button>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-neutral-400">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        Publishing makes the job visible to freelancers right away. Drafts stay private, and you can
        edit a job only while it is a draft.
      </p>
    </div>
  );
}