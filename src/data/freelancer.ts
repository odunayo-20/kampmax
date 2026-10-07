// ============================================================
// FREELANCER ONBOARDING DATA STORE  (Module 22)
// ============================================================
// In-memory mock store for the freelancer onboarding flow. Seeded with a
// starter application so the onboarding entry page shows the correct state.
// Backend-authoritative — this store simulates what NestJS would persist.

import type {
  FreelancerOnboardingDraft,
  FreelancerOnboardingStepId,
  FreelancerOnboardingStatus,
} from "@/types/freelancer";
import { FREELANCER_ONBOARDING_STATUS } from "@/types/freelancer";

// ── Store ───────────────────────────────────────────────────

interface FreelancerStoreRecord {
  draft: FreelancerOnboardingDraft;
}

const store = new Map<string, FreelancerStoreRecord>();

// ── Helpers ─────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function freshId(): string {
  return `fl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneDraft(d: FreelancerOnboardingDraft): FreelancerOnboardingDraft {
  return JSON.parse(JSON.stringify(d));
}

// ── Fresh draft (inactive by default — no active freelancer yet) ──
// The entry page checks status; a fresh user sees "Become a Freelancer".

function defaultDraft(userId: string): FreelancerOnboardingDraft {
  return {
    userId,
    status: FREELANCER_ONBOARDING_STATUS.DRAFT,
    currentStep: 1 as FreelancerOnboardingStepId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    profile: { remoteAvailable: true },
    categories: [],
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    portfolio: [],
    rates: { negotiable: true },
    availability: {
      status: "available_now",
      workingDays: ["mon", "tue", "wed", "thu", "fri"],
      workingHoursStart: "09:00",
      workingHoursEnd: "17:00",
      timezone: "Africa/Lagos",
    },
    preferences: { workArrangements: [], projectTypes: [] },
  };
}

// ── Mock approved freelancer application (for demo of the active dashboard) ──
// Mirrors the Service Provider pattern: a fully-filled, backend-approved record
// backing the dashboard so an "active freelancer" can be demonstrated. A fresh
// user (any id other than the demo owner) still starts at DRAFT via
// createFreelancerApplication. Status here is authoritative — the dashboard
// only renders what the store reports and never forces activation client-side.

// Demo owner = current user (Adebayo, id "u1") so the dashboard has backing data.
const DEMO_FREELANCER_USER_ID = "u1";

function approvedSeedDraft(): FreelancerOnboardingDraft {
  return {
    userId: DEMO_FREELANCER_USER_ID,
    status: FREELANCER_ONBOARDING_STATUS.APPROVED,
    currentStep: 10 as FreelancerOnboardingStepId,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
    submittedAt: daysAgo(28),
    approvedSlug: "adebayo-dev",
    profile: {
      headline: "Full-Stack Developer",
      bio: "I build modern web and mobile apps for students and growing businesses. From landing pages to full-stack MVPs, I turn ideas into shipped products.",
      photoUrl: null,
      city: "Lagos",
      remoteAvailable: true,
    },
    categories: ["fc1", "fc2"],
    skills: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "React Native", "Flutter"],
    experience: [
      {
        id: "fl_xp_demo1",
        jobTitle: "Full-Stack Developer",
        company: "CampusLabs",
        startDate: "2024-01",
        currentlyWorking: true,
        employmentType: "full_time",
        description: "Built and shipped 8 client projects including e-commerce stores, mobile apps and admin dashboards.",
      },
      {
        id: "fl_xp_demo2",
        jobTitle: "Freelance Developer",
        company: "Self-employed",
        startDate: "2022-05",
        endDate: "2023-12",
        currentlyWorking: false,
        employmentType: "freelance",
        description: "Delivered websites and maintenance contracts for local businesses.",
      },
    ],
    education: [
      {
        id: "fl_edu_demo1",
        institution: "Federal Polytechnic RUGIPO",
        qualification: "hnd",
        fieldOfStudy: "Computer Science",
        startYear: "2019",
        endYear: "2024",
      },
    ],
    certifications: [
      {
        id: "fl_cert_demo1",
        name: "AWS Cloud Practitioner",
        issuingOrganization: "Amazon Web Services",
        issueDate: "2024-03",
      },
      {
        id: "fl_cert_demo2",
        name: "Meta Front-End Developer",
        issuingOrganization: "Meta",
        issueDate: "2023-08",
      },
    ],
    portfolio: [
      {
        id: "fl_port_demo1",
        title: "Campus Commerce Platform",
        description: "An e-commerce platform connecting campus vendors to students with real-time orders and delivery tracking.",
        skills: ["React", "Next.js", "Node.js"],
        visible: true,
        completionDate: "2024-05",
      },
      {
        id: "fl_port_demo2",
        title: "Event Booking Mobile App",
        description: "Cross-platform mobile app for booking campus events and tracking attendance.",
        skills: ["React Native", "Flutter"],
        visible: true,
        completionDate: "2024-09",
      },
    ],
    rates: { hourlyRate: 15000, projectRate: 250000, negotiable: true },
    availability: {
      status: "available_now",
      workingDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
      workingHoursStart: "08:00",
      workingHoursEnd: "18:00",
      timezone: "Africa/Lagos",
    },
    preferences: { workArrangements: ["remote", "hybrid"], projectTypes: ["short_term", "long_term"] },
  };
}

// ── Approved candidate profiles (Module 28) ─────────────────
// The employer Applications & Hiring surface reviews public candidate
// profiles. These approved, fully-filled records back those previews.
// They are keyed to real signable users so a candidate profile is never
// invented per-request — the same store a future candidate sign-in reads.

export function seedApprovedFreelancer(record: {
  userId: string;
  slug: string;
  headline: string;
  bio: string;
  city: string;
  categories: string[];
  skills: string[];
  experience: FreelancerOnboardingDraft["experience"];
  education: FreelancerOnboardingDraft["education"];
  certifications: FreelancerOnboardingDraft["certifications"];
  portfolio: FreelancerOnboardingDraft["portfolio"];
  hourlyRate?: number;
  projectRate?: number;
}): void {
  const draft: FreelancerOnboardingDraft = {
    userId: record.userId,
    status: FREELANCER_ONBOARDING_STATUS.APPROVED,
    currentStep: 10 as FreelancerOnboardingStepId,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(1),
    submittedAt: daysAgo(38),
    approvedSlug: record.slug,
    profile: {
      headline: record.headline,
      bio: record.bio,
      photoUrl: null,
      city: record.city,
      remoteAvailable: true,
    },
    categories: [...record.categories],
    skills: [...record.skills],
    experience: JSON.parse(JSON.stringify(record.experience)),
    education: JSON.parse(JSON.stringify(record.education)),
    certifications: JSON.parse(JSON.stringify(record.certifications)),
    portfolio: JSON.parse(JSON.stringify(record.portfolio)),
    rates: {
      hourlyRate: record.hourlyRate,
      projectRate: record.projectRate,
      negotiable: !record.hourlyRate && !record.projectRate,
    },
    availability: {
      status: "available_now",
      workingDays: ["mon", "tue", "wed", "thu", "fri"],
      workingHoursStart: "09:00",
      workingHoursEnd: "18:00",
      timezone: "Africa/Lagos",
    },
    preferences: {
      workArrangements: ["remote", "hybrid"],
      projectTypes: ["short_term", "long_term"],
    },
  };
  store.set(record.userId, { draft });
}

seedApprovedFreelancer({
  userId: "u2",
  slug: "chioma-video",
  headline: "Video Editor & Motion Designer",
  bio: "I cut short-form promos, brand reels and event films for student brands. From raw footage to captions and motion titles — delivered on schedule.",
  city: "Owo",
  categories: ["fc6"],
  skills: ["Video Editing", "Adobe Premiere", "Final Cut Pro", "Motion Graphics", "DaVinci Resolve"],
  experience: [
    {
      id: "fl_xp_u2_1",
      jobTitle: "Freelance Video Editor",
      company: "Self-employed",
      startDate: "2023-06",
      currentlyWorking: true,
      employmentType: "freelance",
      description: "Edited launch promos, social reels and event highlights for campus startups and local brands.",
    },
    {
      id: "fl_xp_u2_2",
      jobTitle: "Media Intern",
      company: "Campus FM",
      startDate: "2022-08",
      endDate: "2023-05",
      currentlyWorking: false,
      employmentType: "internship",
      description: "Assisted with broadcast editing, motion graphics and weekly show packaging.",
    },
  ],
  education: [
    {
      id: "fl_edu_u2_1",
      institution: "Rufus Giwa Polytechnic",
      qualification: "hnd",
      fieldOfStudy: "Mass Communication",
      startYear: "2021",
      endYear: "current",
    },
  ],
  certifications: [
    {
      id: "fl_cert_u2_1",
      name: "Premiere Pro Certification",
      issuingOrganization: "Adobe",
      issueDate: "2023-11",
    },
  ],
  portfolio: [
    {
      id: "fl_port_u2_1",
      title: "Launch promo — student tools",
      description: "30s product launch promo with kinetic titles and captions from a provided shot list.",
      skills: ["Adobe Premiere", "Motion Graphics"],
      visible: true,
      completionDate: "2025-12",
    },
  ],
  hourlyRate: 12000,
  projectRate: 180000,
});

seedApprovedFreelancer({
  userId: "u3",
  slug: "ibrahim-films",
  headline: "Video Editor & Colorist",
  bio: "Story-first editor comfortable in both Premiere and DaVinci Resolve. I handle rough cuts, grade, captions and delivery formats for social and web.",
  city: "Owo",
  categories: ["fc6"],
  skills: ["Video Editing", "Adobe Premiere", "DaVinci Resolve", "Motion Graphics", "Color Grading"],
  experience: [
    {
      id: "fl_xp_u3_1",
      jobTitle: "Editor, Campus Media Crew",
      company: "RUGIPO Media",
      startDate: "2022-02",
      currentlyWorking: true,
      employmentType: "part_time",
      description: "Edit event recaps and studio interviews; built a reusable caption and end-card template pack.",
    },
  ],
  education: [
    {
      id: "fl_edu_u3_1",
      institution: "Rufus Giwa Polytechnic",
      qualification: "nd",
      fieldOfStudy: "Electrical Engineering",
      startYear: "2022",
      endYear: "current",
    },
  ],
  certifications: [],
  portfolio: [
    {
      id: "fl_port_u3_1",
      title: "Series — Founder Stories",
      description: "5-episode interview series with motion titles, color grade and vertical re-cuts for social.",
      skills: ["DaVinci Resolve", "Adobe Premiere"],
      visible: true,
      completionDate: "2025-10",
    },
  ],
  hourlyRate: 10000,
  projectRate: 150000,
});

seedApprovedFreelancer({
  userId: "u4",
  slug: "folashade-designs",
  headline: "UI/UX Designer & Prototyper",
  bio: "Product designer focused on clean, mobile-first interfaces. I take ideas from wireframes to interactive Figma prototypes backed by simple design systems.",
  city: "Owo",
  categories: ["fc3", "fc4"],
  skills: ["UI/UX Design", "Figma", "Prototyping", "Wireframing", "Design Systems", "Adobe XD"],
  experience: [
    {
      id: "fl_xp_u4_1",
      jobTitle: "Product Design Intern",
      company: "Student Innovation Hub",
      startDate: "2024-01",
      currentlyWorking: true,
      employmentType: "internship",
      description: "Designed mobile app flows for campus services and maintained the Figma component library.",
    },
  ],
  education: [
    {
      id: "fl_edu_u4_1",
      institution: "Rufus Giwa Polytechnic",
      qualification: "hnd",
      fieldOfStudy: "Accounting",
      startYear: "2020",
      endYear: "current",
    },
  ],
  certifications: [
    {
      id: "fl_cert_u4_1",
      name: "Google UX Design",
      issuingOrganization: "Coursera / Google",
      issueDate: "2024-05",
    },
  ],
  portfolio: [
    {
      id: "fl_port_u4_1",
      title: "Student tools app — UI exploration",
      description: "Low-fi to hi-fi exploration for a student services app, including a clickable prototype and style guide.",
      skills: ["Figma", "Prototyping"],
      visible: true,
      completionDate: "2025-09",
    },
  ],
  hourlyRate: 14000,
  projectRate: 200000,
});

seedApprovedFreelancer({
  userId: "u5",
  slug: "emeka-cuts",
  headline: "Short-form Video Editor",
  bio: "I make punchy vertical content — promos, reels and ads — with tight pacing, bold captions and trend-aware editing. Fast turnarounds.",
  city: "Owo",
  categories: ["fc6"],
  skills: ["Video Editing", "Adobe Premiere", "CapCut", "Motion Graphics", "Videography"],
  experience: [
    {
      id: "fl_xp_u5_1",
      jobTitle: "Content Editor",
      company: "CampusBites",
      startDate: "2023-09",
      currentlyWorking: true,
      employmentType: "freelance",
      description: "Produce short promo reels for campus food campaigns and delivery updates.",
    },
  ],
  education: [
    {
      id: "fl_edu_u5_1",
      institution: "Rufus Giwa Polytechnic",
      qualification: "nd",
      fieldOfStudy: "Mass Communication",
      startYear: "2022",
      endYear: "current",
    },
  ],
  certifications: [],
  portfolio: [
    {
      id: "fl_port_u5_1",
      title: "Reel pack — cafe launches",
      description: "A recurring reel template system with editable captions and brand colors.",
      skills: ["CapCut", "Adobe Premiere"],
      visible: true,
      completionDate: "2025-11",
    },
  ],
  hourlyRate: 8000,
  projectRate: 120000,
});

// ── Seed the approved demo record at module load ────────────
store.set(DEMO_FREELANCER_USER_ID, { draft: approvedSeedDraft() });

// ── Store API ───────────────────────────────────────────────

export function createFreelancerApplication(userId: string): { created: boolean; draft: FreelancerOnboardingDraft } {
  const existing = store.get(userId);
  if (existing) return { created: false, draft: cloneDraft(existing.draft) };

  const draft = defaultDraft(userId);
  store.set(userId, { draft });
  return { created: true, draft: cloneDraft(draft) };
}

export function getFreelancerOnboardingDraft(userId: string): FreelancerOnboardingDraft | null {
  const rec = store.get(userId);
  return rec ? cloneDraft(rec.draft) : null;
}

export function saveFreelancerDraft(draft: FreelancerOnboardingDraft): void {
  const existing = store.get(draft.userId);
  if (existing) {
    existing.draft = { ...cloneDraft(draft), updatedAt: nowIso() };
  } else {
    store.set(draft.userId, { draft: { ...cloneDraft(draft), updatedAt: nowIso() } });
  }
}

export function getFreelancerOnboardingStatus(userId: string): FreelancerOnboardingStatus {
  const rec = store.get(userId);
  return rec ? rec.draft.status : FREELANCER_ONBOARDING_STATUS.DRAFT;
}

export function submitFreelancerApplication(
  userId: string
): { success: boolean; message: string } {
  const rec = store.get(userId);
  if (!rec) return { success: false, message: "No application found." };
  if (rec.draft.status === FREELANCER_ONBOARDING_STATUS.PENDING_REVIEW) {
    return { success: false, message: "Your profile is already under review." };
  }
  if (rec.draft.status === FREELANCER_ONBOARDING_STATUS.APPROVED) {
    return { success: false, message: "Your profile is already approved." };
  }

  rec.draft.status = FREELANCER_ONBOARDING_STATUS.PENDING_REVIEW;
  rec.draft.submittedAt = nowIso();
  rec.draft.updatedAt = nowIso();
  return { success: true, message: "Profile submitted for review." };
}

export { cloneDraft, freshId, FREELANCER_ONBOARDING_STATUS };
