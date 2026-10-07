import type { ServiceProviderOnboardingDraft, ServiceProviderOnboardingDocument, ServiceProviderProfile, ServiceProviderAvailabilityDay } from "@/types/service-provider";
import {
  SERVICE_PROVIDER_ONBOARDING_STATUS,
  SERVICE_PROVIDER_DOCUMENT_STATUS,
  SERVICE_PROVIDER_VERIFICATION_STATUS,
  SERVICE_PROVIDER_SERVICE_STATUS,
  SERVICE_PROVIDER_TYPE,
  SERVICE_PROVIDER_LOCATION_TYPE,
  SERVICE_PROVIDER_PRICING_MODEL,
  SERVICE_PROVIDER_BOOKING_PREFERENCE,
  SERVICE_PROVIDER_VERIFICATION_TYPE,
} from "@/types/service-provider";

// ============================================================
// SERVICE PROVIDER SEED DATA
// ============================================================
//
// This models the backend contract for the authenticated service provider's
// onboarding and profile. Ownership is resolved from the authenticated identity,
// never from a client-supplied providerId.

// ── Document requirements (backend-configured) ──────────────

export const spDocumentRequirements: ServiceProviderOnboardingDocument[] = [
  {
    documentType: "government_id",
    label: "Government ID",
    required: true,
    acceptedFormats: ["pdf", "jpg", "jpeg", "png"],
    maxSizeMb: 5,
    status: SERVICE_PROVIDER_DOCUMENT_STATUS.NOT_UPLOADED,
  },
  {
    documentType: "professional_certificate",
    label: "Professional Certificate / License",
    required: false,
    acceptedFormats: ["pdf", "jpg", "jpeg", "png"],
    maxSizeMb: 5,
    status: SERVICE_PROVIDER_DOCUMENT_STATUS.NOT_UPLOADED,
  },
  {
    documentType: "business_registration",
    label: "Business Registration (CAC)",
    required: false,
    acceptedFormats: ["pdf", "jpg", "jpeg", "png"],
    maxSizeMb: 5,
    status: SERVICE_PROVIDER_DOCUMENT_STATUS.NOT_UPLOADED,
  },
  {
    documentType: "portfolio_sample",
    label: "Portfolio Sample",
    required: false,
    acceptedFormats: ["jpg", "jpeg", "png", "webp"],
    maxSizeMb: 10,
    status: SERVICE_PROVIDER_DOCUMENT_STATUS.NOT_UPLOADED,
  },
];

// ── Default availability days ───────────────────────────────

const defaultAvailabilityDays: ServiceProviderAvailabilityDay[] = [
  { dayIndex: 0, label: "Monday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
  { dayIndex: 1, label: "Tuesday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
  { dayIndex: 2, label: "Wednesday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
  { dayIndex: 3, label: "Thursday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
  { dayIndex: 4, label: "Friday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
  { dayIndex: 5, label: "Saturday", isAvailable: true, openTime: "10:00", closeTime: "16:00" },
  { dayIndex: 6, label: "Sunday", isAvailable: false },
];

// ── Initial draft (empty application) ───────────────────────

export const initialSpDraft: ServiceProviderOnboardingDraft = {
  applicationId: undefined,
  userId: "u1", // Default to Adebayo for demo
  status: SERVICE_PROVIDER_ONBOARDING_STATUS.DRAFT,
  currentStep: 1,
  createdAt: "",
  updatedAt: "",
  provider: {
    type: SERVICE_PROVIDER_TYPE.INDIVIDUAL,
    contactPreferences: {
      allowCalls: true,
      allowMessages: true,
      allowEmail: false,
    },
  },
  profile: {
    logo: null,
    coverImage: null,
  },
  category: {
    secondaryCategoryIds: [],
  },
  services: [],
  location: {
    type: SERVICE_PROVIDER_LOCATION_TYPE.BOTH,
    additionalCampusIds: [],
    serviceCities: [],
    serviceRadiusKm: 10,
  },
  availability: {
    days: defaultAvailabilityDays,
    appointmentBufferMinutes: 15,
    minAdvanceNoticeHours: 2,
    maxAdvanceBookingDays: 30,
    bookingPreference: SERVICE_PROVIDER_BOOKING_PREFERENCE.REQUEST_APPROVAL,
  },
  pricing: {
    travelFee: 0,
    emergencyFee: 0,
    weekendFee: 0,
    minimumBookingQuantity: 1,
  },
  portfolio: [],
  verification: {
    status: SERVICE_PROVIDER_VERIFICATION_STATUS.NOT_REQUIRED,
  },
  documents: spDocumentRequirements.map((d) => ({
    ...d,
    id: `doc_${d.documentType}`,
    status: SERVICE_PROVIDER_DOCUMENT_STATUS.NOT_UPLOADED,
  })),
};

// ── Mock approved service provider profile (for demo) ────────

export const mockServiceProviderProfile: ServiceProviderProfile = {
  id: "sp1",
  userId: "u1",
  slug: "adebayo-tech-services",
  displayName: "Adebayo Tech Services",
  tagline: "Your campus tech expert",
  description:
    "Professional phone repair, laptop troubleshooting, and software installation services. Fast turnaround, student-friendly prices. Operating from my workshop at Engineering Block, RUGIPO.",
  logo: null,
  coverImage: null,
  type: SERVICE_PROVIDER_TYPE.INDIVIDUAL,
  primaryCategoryId: "cat8", // Services
  secondaryCategoryIds: ["cat2"], // Electronics
  services: [
    {
      id: "svc1",
      name: "Phone Screen Replacement",
      description: "Professional screen replacement for iPhone and Android devices. Includes 30-day warranty on parts.",
      categoryId: "cat8",
      pricingModel: SERVICE_PROVIDER_PRICING_MODEL.STARTING_FROM,
      price: 5000,
      durationMinutes: 60,
      locationType: SERVICE_PROVIDER_LOCATION_TYPE.PROVIDER_LOCATION,
      status: SERVICE_PROVIDER_SERVICE_STATUS.ACTIVE,
    },
    {
      id: "svc2",
      name: "Laptop Diagnostics & Repair",
      description: "Hardware and software diagnostics, virus removal, OS installation, and hardware upgrades.",
      categoryId: "cat8",
      pricingModel: SERVICE_PROVIDER_PRICING_MODEL.FIXED,
      price: 3000,
      durationMinutes: 90,
      locationType: SERVICE_PROVIDER_LOCATION_TYPE.BOTH,
      status: SERVICE_PROVIDER_SERVICE_STATUS.ACTIVE,
    },
    {
      id: "svc3",
      name: "Software Installation & Setup",
      description: "Install and configure development environments, productivity software, and security tools.",
      categoryId: "cat8",
      pricingModel: SERVICE_PROVIDER_PRICING_MODEL.FIXED,
      price: 2000,
      durationMinutes: 45,
      locationType: SERVICE_PROVIDER_LOCATION_TYPE.ONLINE,
      status: SERVICE_PROVIDER_SERVICE_STATUS.ACTIVE,
    },
    {
      id: "svc4",
      name: "Data Recovery",
      description: "Recover lost data from damaged hard drives, USB drives, and memory cards. No data, no fee.",
      categoryId: "cat8",
      pricingModel: SERVICE_PROVIDER_PRICING_MODEL.QUOTE,
      price: 0,
      durationMinutes: 120,
      locationType: SERVICE_PROVIDER_LOCATION_TYPE.PROVIDER_LOCATION,
      status: SERVICE_PROVIDER_SERVICE_STATUS.ACTIVE,
    },
  ],
  location: {
    type: SERVICE_PROVIDER_LOCATION_TYPE.BOTH,
    primaryCampusId: "rugipo",
    additionalCampusIds: ["oau", "ui"],
    serviceCities: ["Owo", "Akure"],
    serviceRadiusKm: 15,
  },
  availability: {
    days: [
      { dayIndex: 0, label: "Monday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
      { dayIndex: 1, label: "Tuesday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
      { dayIndex: 2, label: "Wednesday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
      { dayIndex: 3, label: "Thursday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
      { dayIndex: 4, label: "Friday", isAvailable: true, openTime: "09:00", closeTime: "18:00" },
      { dayIndex: 5, label: "Saturday", isAvailable: true, openTime: "10:00", closeTime: "16:00" },
      { dayIndex: 6, label: "Sunday", isAvailable: false },
    ],
    appointmentBufferMinutes: 15,
    minAdvanceNoticeHours: 2,
    maxAdvanceBookingDays: 30,
    bookingPreference: SERVICE_PROVIDER_BOOKING_PREFERENCE.REQUEST_APPROVAL,
  },
  pricing: {
    travelFee: 1000,
    emergencyFee: 2000,
    weekendFee: 500,
    minimumBookingQuantity: 1,
  },
  portfolio: [
    {
      id: "port1",
      image: "https://picsum.photos/seed/sp1-port1/600/400",
      title: "iPhone 13 Screen Replacement",
      description: "Completed in 45 minutes with OEM-quality screen. Customer picked up same day.",
      categoryId: "cat8",
    },
    {
      id: "port2",
      image: "https://picsum.photos/seed/sp1-port2/600/400",
      title: "Laptop Motherboard Repair",
      description: "Diagnosed and fixed liquid damage on MacBook Pro. Data preserved, full functionality restored.",
      categoryId: "cat8",
    },
    {
      id: "port3",
      image: "https://picsum.photos/seed/sp1-port3/600/400",
      title: "Custom PC Build",
      description: "Assembled gaming rig for student. Cable management, stress testing, and driver setup included.",
      categoryId: "cat8",
    },
  ],
  verification: {
    type: SERVICE_PROVIDER_VERIFICATION_TYPE.IDENTITY,
    status: SERVICE_PROVIDER_VERIFICATION_STATUS.APPROVED,
  },
  rating: 4.9,
  totalBookings: 47,
  verified: true,
  campusId: "rugipo",
  specialties: ["Phone Repair", "Laptop Repair", "Software Setup", "Data Recovery"],
  responseTime: "Within 2 hours",
  joinDate: "2026-01-15T09:00:00Z",
};

// ── Owner store (prototype) ──────────────────────────────────

// In-memory store keyed by owner userId
export const spOnboardingStore = {
  draft: { ...initialSpDraft },
} as { draft: ServiceProviderOnboardingDraft };

// ── Public profile store ────────────────────────────────────

export const serviceProviderProfiles: ServiceProviderProfile[] = [
  mockServiceProviderProfile,
];