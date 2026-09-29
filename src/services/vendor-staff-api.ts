import { apiClient } from "@/lib/api-client";

export interface VendorStaffMember {
  id: string;
  vendorId: string;
  userId: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  user?: {
    id: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AddVendorStaffInput {
  userId: string;
  role?: string;
  permissions?: string[];
}

export interface UpdateVendorStaffInput {
  role?: string;
  permissions?: string[];
  isActive?: boolean;
}

export async function fetchVendorStaffApi(): Promise<VendorStaffMember[]> {
  const { data, error } = await apiClient.get<VendorStaffMember[]>("/vendors/me/staff");
  if (error || !data) {
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function addVendorStaffApi(input: AddVendorStaffInput): Promise<{ member: VendorStaffMember | null; error: string | null }> {
  const { data, error } = await apiClient.post<AddVendorStaffInput, VendorStaffMember>("/vendors/me/staff", input);
  if (error) {
    return { member: null, error: error.message || "Failed to add staff member" };
  }
  return { member: data, error: null };
}

export async function updateVendorStaffApi(
  staffId: string,
  input: UpdateVendorStaffInput
): Promise<{ member: VendorStaffMember | null; error: string | null }> {
  const { data, error } = await apiClient.patch<UpdateVendorStaffInput, VendorStaffMember>(
    `/vendors/me/staff/${staffId}`,
    input
  );
  if (error) {
    return { member: null, error: error.message || "Failed to update staff member" };
  }
  return { member: data, error: null };
}

export async function deleteVendorStaffApi(staffId: string): Promise<{ success: boolean; error: string | null }> {
  const { error } = await apiClient.delete(`/vendors/me/staff/${staffId}`);
  if (error) {
    return { success: false, error: error.message || "Failed to remove staff member" };
  }
  return { success: true, error: null };
}
