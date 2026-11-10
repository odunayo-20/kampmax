import { apiClient, type ApiError } from "@/lib/api-client";
import { getApiBaseUrl } from "@/lib/api-config";
import { getAccessToken } from "@/lib/auth-storage";
import { uploadFileDirect } from "@/services/media";
import type {
  AccommodationAgentProfile,
  AccommodationAmenityOption,
  AccommodationCategoryOption,
  AccommodationEnquiry,
  AccommodationInspection,
  AccommodationListing,
  AccommodationPage,
  AccommodationPackage,
  AccommodationPaymentStart,
  AccommodationPayment,
  AccommodationProperty,
  AccommodationSubscription,
  AccommodationUnit,
  PublicAccommodationListing,
  PublicAccommodationListingDetail,
  SavedAccommodationListing,
  ReportReason,
} from "@/types/accommodation";
import type {
  AccommodationAgentStatus,
  AgentDocumentType,
} from "@/types/accommodation";

type RequestResult<T> = Promise<{ data: T; error: ApiError | null }>;

async function unwrap<T>(request: RequestResult<T>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `?${search}` : "";
}

export interface AccommodationSearchQuery {
  q?: string;
  campusId?: string;
  state?: string;
  city?: string;
  neighbourhood?: string;
  category?: string;
  minRent?: number;
  maxRent?: number;
  paymentFrequency?: string;
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: string;
  amenities?: string[];
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "distance";
  page?: number;
  limit?: number;
}

export interface CreateAgentApplication {
  fullName: string;
  phone: string;
  email: string;
  operatingLocation: string;
  agencyName?: string;
  businessAddress?: string;
  photoUrl?: string;
  acceptAgreement: true;
}

export interface CreateAccommodationUnit {
  unitName: string;
  unitType: string;
  bedrooms?: number;
  bathrooms?: number;
  occupancyCapacity?: number;
  furnishingStatus?: AccommodationUnit["furnishingStatus"];
  availabilityStatus?: AccommodationUnit["availabilityStatus"];
}

export interface CreateAccommodationProperty {
  title: string;
  description?: string;
  categoryId: string;
  state: string;
  city: string;
  neighbourhood?: string;
  address: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  campusId?: string;
  units?: CreateAccommodationUnit[];
}

export type UpdateAccommodationProperty = Partial<
  Omit<CreateAccommodationProperty, "units">
>;

export interface CreateAccommodationListing {
  propertyId: string;
  unitId: string;
  title: string;
  description?: string;
  rentAmount?: number;
  paymentFrequency?: "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL";
  cautionFee?: number;
  agencyFee?: number;
  agreementFee?: number;
  otherCharges?: number;
  media?: { mediaId: string; caption?: string }[];
  amenityIds?: string[];
}

export type UpdateAccommodationListing = Partial<
  Omit<CreateAccommodationListing, "propertyId" | "unitId">
>;

export interface CreateAccommodationEnquiry {
  message: string;
  preferredContactMethod?: "IN_APP" | "PHONE" | "EMAIL";
  preferredInspectionDate?: string;
}

export const accommodationApi = {
  agentStatus() {
    return unwrap(
      apiClient.get<{ applied: boolean; status: AccommodationAgentStatus | null }>(
        "/accommodation/agents/status"
      )
    );
  },

  agentProfile() {
    return unwrap(apiClient.get<AccommodationAgentProfile>("/accommodation/agents/me"));
  },

  applyAsAgent(input: CreateAgentApplication) {
    return unwrap(
      apiClient.post<CreateAgentApplication, AccommodationAgentProfile>(
        "/accommodation/agents/apply",
        input
      )
    );
  },

  updateAgent(input: Partial<Omit<CreateAgentApplication, "acceptAgreement">>) {
    return unwrap(
      apiClient.patch<typeof input, AccommodationAgentProfile>(
        "/accommodation/agents/me",
        input
      )
    );
  },

  async uploadAgentDocument(file: File, documentType: AgentDocumentType) {
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);

    const token = getAccessToken();
    const response = await fetch(
      new URL("/api/v1/accommodation/agents/documents", getApiBaseUrl()).toString(),
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }
    );
    const text = await response.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        response.ok
          ? "The server returned an unreadable document-upload response."
          : `Document upload failed (${response.status}).`
      );
    }

    if (!response.ok) {
      const body =
        typeof payload === "object" && payload !== null
          ? (payload as { message?: unknown })
          : null;
      const message = Array.isArray(body?.message)
        ? body.message.join(", ")
        : typeof body?.message === "string"
          ? body.message
          : `Document upload failed (${response.status}).`;
      throw Object.assign(new Error(message), { status: response.status });
    }

    const result =
      typeof payload === "object" && payload !== null && "data" in payload
        ? payload.data
        : payload;
    if (
      typeof result !== "object" ||
      result === null ||
      !("id" in result) ||
      typeof result.id !== "string"
    ) {
      throw new Error("The server returned an invalid document-upload response.");
    }
    return result as AccommodationAgentProfile["documents"][number];
  },

  removeAgentDocument(id: string) {
    return unwrap(apiClient.delete<void>(`/accommodation/agents/documents/${encodeURIComponent(id)}`));
  },

  categories() {
    return unwrap(apiClient.get<AccommodationCategoryOption[]>("/accommodation/categories"));
  },

  amenities() {
    return unwrap(apiClient.get<AccommodationAmenityOption[]>("/accommodation/amenities"));
  },

  packages() {
    return unwrap(apiClient.get<AccommodationPackage[]>("/accommodation/packages"));
  },

  properties(page = 1, limit = 20) {
    return unwrap(
      apiClient.get<AccommodationPage<AccommodationProperty>>(
        `/accommodation/properties/mine${queryString({ page, limit })}`
      )
    );
  },

  createProperty(input: CreateAccommodationProperty) {
    return unwrap(
      apiClient.post<CreateAccommodationProperty, AccommodationProperty>(
        "/accommodation/properties",
        input
      )
    );
  },

  addUnit(propertyId: string, input: CreateAccommodationUnit) {
    return unwrap(
      apiClient.post<CreateAccommodationUnit, AccommodationUnit>(
        `/accommodation/properties/${encodeURIComponent(propertyId)}/units`,
        input
      )
    );
  },

  updateProperty(id: string, input: UpdateAccommodationProperty) {
    return unwrap(
      apiClient.patch<UpdateAccommodationProperty, AccommodationProperty>(
        `/accommodation/properties/${encodeURIComponent(id)}`,
        input
      )
    );
  },

  archiveProperty(id: string) {
    return unwrap(
      apiClient.delete<{ archived: true }>(`/accommodation/properties/${encodeURIComponent(id)}`)
    );
  },

  updateUnit(propertyId: string, unitId: string, input: Partial<CreateAccommodationUnit>) {
    return unwrap(
      apiClient.patch<Partial<CreateAccommodationUnit>, AccommodationUnit>(
        `/accommodation/properties/${encodeURIComponent(propertyId)}/units/${encodeURIComponent(unitId)}`,
        input
      )
    );
  },

  archiveUnit(propertyId: string, unitId: string) {
    return unwrap(
      apiClient.delete<{ archived: true }>(
        `/accommodation/properties/${encodeURIComponent(propertyId)}/units/${encodeURIComponent(unitId)}`
      )
    );
  },

  listings(page = 1, limit = 20) {
    return unwrap(
      apiClient.get<AccommodationPage<AccommodationListing>>(
        `/accommodation/listings/mine${queryString({ page, limit })}`
      )
    );
  },

  createListing(input: CreateAccommodationListing) {
    return unwrap(
      apiClient.post<CreateAccommodationListing, AccommodationListing>(
        "/accommodation/listings",
        input
      )
    );
  },

  listingMine(id: string) {
    return unwrap(
      apiClient.get<AccommodationListing>(
        `/accommodation/listings/mine/${encodeURIComponent(id)}`
      )
    );
  },

  updateListing(id: string, input: UpdateAccommodationListing) {
    return unwrap(
      apiClient.patch<UpdateAccommodationListing, AccommodationListing>(
        `/accommodation/listings/${encodeURIComponent(id)}`,
        input
      )
    );
  },

  archiveListing(id: string) {
    return unwrap(
      apiClient.delete<{ archived: true }>(`/accommodation/listings/${encodeURIComponent(id)}`)
    );
  },

  confirmAvailability(id: string, availabilityStatus?: AccommodationUnit["availabilityStatus"]) {
    return unwrap(
      apiClient.post<{ availabilityStatus?: AccommodationUnit["availabilityStatus"] }, AccommodationListing>(
        `/accommodation/listings/${encodeURIComponent(id)}/availability`,
        availabilityStatus ? { availabilityStatus } : {}
      )
    );
  },

  async uploadListingImage(file: File) {
    const { data, error } = await uploadFileDirect(file, "product");
    if (error) throw error;
    if (!data) throw new Error("The image upload did not return a media record.");
    return data;
  },

  submitListing(id: string) {
    return unwrap(
      apiClient.post<Record<string, never>, AccommodationListing>(
        `/accommodation/listings/${encodeURIComponent(id)}/submit`,
        {}
      )
    );
  },

  subscribeListing(
    id: string,
    input: { acceptBillingTerms: true; autoRenew?: boolean; packageId?: string; callbackUrl?: string }
  ) {
    return unwrap(
      apiClient.post<typeof input, AccommodationPaymentStart>(
        `/accommodation/listings/${encodeURIComponent(id)}/subscribe`,
        input
      )
    );
  },

  search(query: AccommodationSearchQuery, signal?: AbortSignal) {
    const { amenities, ...filters } = query;
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && String(value).trim() !== "") {
        search.set(key, String(value));
      }
    }
    if (amenities?.length) search.set("amenities", amenities.join(","));
    return unwrap(
      apiClient.get<AccommodationPage<PublicAccommodationListing>>(
        `/accommodation/listings${search.size ? `?${search.toString()}` : ""}`,
        { signal }
      )
    );
  },

  featured(campusId?: string) {
    return unwrap(
      apiClient.get<PublicAccommodationListing[]>(
        `/accommodation/listings/featured${queryString({ campusId })}`
      )
    );
  },

  listing(id: string) {
    return unwrap(
      apiClient.get<PublicAccommodationListingDetail>(
        `/accommodation/listings/${encodeURIComponent(id)}`
      )
    );
  },

  saveListing(id: string) {
    return unwrap(
      apiClient.post<undefined, { saved: true }>(
        `/accommodation/listings/${encodeURIComponent(id)}/save`
      )
    );
  },

  unsaveListing(id: string) {
    return unwrap(
      apiClient.delete<{ saved: false }>(
        `/accommodation/listings/${encodeURIComponent(id)}/save`
      )
    );
  },

  savedListings(page = 1, limit = 20) {
    return unwrap(
      apiClient.get<AccommodationPage<SavedAccommodationListing>>(
        `/accommodation/saved${queryString({ page, limit })}`
      )
    );
  },

  reportListing(id: string, input: { reason: ReportReason; description?: string }) {
    return unwrap(
      apiClient.post<typeof input, { id: string; status: string }>(
        `/accommodation/listings/${encodeURIComponent(id)}/report`,
        input
      )
    );
  },

  createEnquiry(listingId: string, input: CreateAccommodationEnquiry) {
    return unwrap(
      apiClient.post<CreateAccommodationEnquiry, AccommodationEnquiry>(
        `/accommodation/listings/${encodeURIComponent(listingId)}/enquiries`,
        input
      )
    );
  },

  myEnquiries(page = 1, limit = 20) {
    return unwrap(
      apiClient.get<AccommodationPage<AccommodationEnquiry>>(
        `/accommodation/enquiries/mine${queryString({ page, limit })}`
      )
    );
  },

  agentEnquiries(page = 1, limit = 20) {
    return unwrap(
      apiClient.get<AccommodationPage<AccommodationEnquiry>>(
        `/accommodation/agent/enquiries${queryString({ page, limit })}`
      )
    );
  },

  enquiry(id: string) {
    return unwrap(
      apiClient.get<AccommodationEnquiry>(
        `/accommodation/enquiries/${encodeURIComponent(id)}`
      )
    );
  },

  replyToEnquiry(id: string, body: string) {
    return unwrap(
      apiClient.post<{ body: string }, AccommodationEnquiry>(
        `/accommodation/enquiries/${encodeURIComponent(id)}/messages`,
        { body }
      )
    );
  },

  setEnquiryStatus(id: string, status: AccommodationEnquiry["status"]) {
    return unwrap(
      apiClient.patch<{ status: AccommodationEnquiry["status"] }, AccommodationEnquiry>(
        `/accommodation/enquiries/${encodeURIComponent(id)}/status`,
        { status }
      )
    );
  },

  requestInspection(id: string, requestedDate: string, notes?: string) {
    return unwrap(
      apiClient.post<{ requestedDate: string; notes?: string }, AccommodationInspection>(
        `/accommodation/enquiries/${encodeURIComponent(id)}/inspection`,
        { requestedDate, ...(notes?.trim() ? { notes: notes.trim() } : {}) }
      )
    );
  },

  respondToInspection(
    id: string,
    input: { action: "CONFIRM" | "REJECT" | "PROPOSE"; date?: string; note?: string }
  ) {
    return unwrap(
      apiClient.patch<typeof input, AccommodationInspection>(
        `/accommodation/inspections/${encodeURIComponent(id)}/respond`,
        input
      )
    );
  },

  answerInspection(id: string, action: "ACCEPT" | "DECLINE") {
    return unwrap(
      apiClient.patch<{ action: "ACCEPT" | "DECLINE" }, AccommodationInspection>(
        `/accommodation/inspections/${encodeURIComponent(id)}/answer`,
        { action }
      )
    );
  },

  cancelInspection(id: string) {
    return unwrap(
      apiClient.patch<Record<string, never>, AccommodationInspection>(
        `/accommodation/inspections/${encodeURIComponent(id)}/cancel`,
        {}
      )
    );
  },

  completeInspection(id: string) {
    return unwrap(
      apiClient.patch<Record<string, never>, AccommodationInspection>(
        `/accommodation/inspections/${encodeURIComponent(id)}/complete`,
        {}
      )
    );
  },

  subscriptions(page = 1, limit = 20) {
    return unwrap(
      apiClient.get<AccommodationPage<AccommodationSubscription>>(
        `/accommodation/subscriptions${queryString({ page, limit })}`
      )
    );
  },

  cancelRenewal(id: string) {
    return unwrap(
      apiClient.patch<Record<string, never>, AccommodationSubscription>(
        `/accommodation/subscriptions/${encodeURIComponent(id)}/cancel`,
        {}
      )
    );
  },

  renewSubscription(
    id: string,
    input: { acceptBillingTerms: true; autoRenew?: boolean; callbackUrl?: string }
  ) {
    return unwrap(
      apiClient.post<typeof input, AccommodationPaymentStart>(
        `/accommodation/subscriptions/${encodeURIComponent(id)}/renew`,
        input
      )
    );
  },

  enableRenewal(id: string) {
    return unwrap(
      apiClient.patch<{ acceptAutoRenew: true }, AccommodationSubscription>(
        `/accommodation/subscriptions/${encodeURIComponent(id)}/enable-renewal`,
        { acceptAutoRenew: true }
      )
    );
  },

  paymentHistory(page = 1, limit = 20) {
    return unwrap(
      apiClient.get<AccommodationPage<AccommodationPayment>>(
        `/accommodation/payments/history${queryString({ page, limit })}`
      )
    );
  },
};
