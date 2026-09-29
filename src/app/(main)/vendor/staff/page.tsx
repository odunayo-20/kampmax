"use client";

import { useEffect, useState } from "react";
import {
  UsersRound,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Lock,
  UserCheck,
  Search,
} from "lucide-react";
import {
  fetchVendorStaffApi,
  addVendorStaffApi,
  updateVendorStaffApi,
  deleteVendorStaffApi,
  type VendorStaffMember,
} from "@/services/vendor-staff-api";
import { formatDate } from "@/lib/utils";

const ALL_PERMISSIONS = [
  { key: "products.read", label: "View Products", category: "Catalog" },
  { key: "products.write", label: "Manage Products", category: "Catalog" },
  { key: "orders.read", label: "View Orders", category: "Orders" },
  { key: "orders.manage", label: "Fulfill Orders", category: "Orders" },
  { key: "analytics.read", label: "View Analytics", category: "Insights" },
  { key: "settings.manage", label: "Store Settings", category: "Management" },
  { key: "payouts.read", label: "View Payouts", category: "Financials" },
];

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<VendorStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<VendorStaffMember | null>(null);

  // Form State
  const [userIdInput, setUserIdInput] = useState("");
  const [roleInput, setRoleInput] = useState("Store Associate");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    "products.read",
    "orders.read",
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadStaff() {
    setLoading(true);
    const data = await fetchVendorStaffApi();
    setStaff(data);
    setLoading(false);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  function togglePermission(perm: string) {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!userIdInput.trim()) {
      setErrorMsg("Please enter a valid user ID.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await addVendorStaffApi({
      userId: userIdInput.trim(),
      role: roleInput.trim(),
      permissions: selectedPermissions,
    });

    setIsSubmitting(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setAddModalOpen(false);
      setUserIdInput("");
      setRoleInput("Store Associate");
      setSelectedPermissions(["products.read", "orders.read"]);
      loadStaff();
    }
  }

  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await updateVendorStaffApi(editingStaff.id, {
      role: roleInput.trim(),
      permissions: selectedPermissions,
      isActive: editingStaff.isActive,
    });

    setIsSubmitting(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setEditingStaff(null);
      loadStaff();
    }
  }

  async function handleToggleActive(member: VendorStaffMember) {
    await updateVendorStaffApi(member.id, {
      isActive: !member.isActive,
    });
    loadStaff();
  }

  async function handleDeleteStaff(staffId: string) {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    await deleteVendorStaffApi(staffId);
    loadStaff();
  }

  const filteredStaff = staff.filter((s) => {
    const q = search.toLowerCase();
    const name = s.user?.fullName || `${s.user?.firstName || ""} ${s.user?.lastName || ""}`.trim();
    const email = s.user?.email || "";
    const role = s.role || "";
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || role.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-kampmax-text">Staff & Team Management</h1>
          <p className="mt-0.5 text-sm text-kampmax-text-secondary">
            Manage teammates, delegate operations, and control access permissions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setUserIdInput("");
            setRoleInput("Store Associate");
            setSelectedPermissions(["products.read", "orders.read"]);
            setAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" /> Add Team Member
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-kampmax-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <UsersRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-kampmax-text-secondary">Total Staff</p>
              <p className="text-xl font-bold text-kampmax-text">{staff.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-kampmax-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-kampmax-text-secondary">Active Members</p>
              <p className="text-xl font-bold text-kampmax-text">
                {staff.filter((s) => s.isActive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-kampmax-border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-kampmax-text-secondary">Access Scopes</p>
              <p className="text-xl font-bold text-kampmax-text">Role-Based</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Table Section */}
      <div className="rounded-xl border border-kampmax-border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-kampmax-border p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-kampmax-text-secondary" />
            <input
              type="text"
              placeholder="Search staff by name, email or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-kampmax-border bg-neutral-50/50 pl-9 pr-3 py-1.5 text-sm focus:border-primary-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <UsersRound className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-kampmax-text">No staff members found</h3>
            <p className="mt-1 text-xs text-kampmax-text-secondary max-w-xs">
              {search
                ? "Try matching another search term."
                : "Add store associates or managers to delegate order fulfillment and catalog updates."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50/75 border-b border-kampmax-border text-xs font-semibold text-kampmax-text-secondary">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Permissions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kampmax-border">
                {filteredStaff.map((member) => {
                  const name =
                    member.user?.fullName ||
                    `${member.user?.firstName || ""} ${member.user?.lastName || ""}`.trim() ||
                    `User ${member.userId.slice(0, 8)}…`;
                  const email = member.user?.email || "No email";

                  return (
                    <tr key={member.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 font-bold text-primary-700 text-xs">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-kampmax-text">{name}</p>
                            <p className="text-xs text-kampmax-text-secondary">{email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 border border-neutral-200">
                          {member.role || "Staff"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {member.permissions?.slice(0, 3).map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                            >
                              {p}
                            </span>
                          ))}
                          {member.permissions && member.permissions.length > 3 && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-600">
                              +{member.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(member)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
                            member.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-100"
                              : "bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-500/20 hover:bg-neutral-200"
                          }`}
                        >
                          {member.isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" /> Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-kampmax-text-secondary">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setErrorMsg(null);
                              setEditingStaff(member);
                              setRoleInput(member.role || "Store Associate");
                              setSelectedPermissions(member.permissions || []);
                            }}
                            className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-kampmax-text transition-colors"
                            title="Edit Permissions"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(member.id)}
                            className="p-1.5 rounded-md text-neutral-500 hover:bg-error-50 hover:text-error-600 transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-kampmax-text">Add Staff Member</h2>
            <p className="mt-1 text-xs text-kampmax-text-secondary">
              Grant permissions to a registered Kampmax user to help manage your store.
            </p>

            {errorMsg && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-error-50 p-3 text-xs text-error-700 border border-error-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddStaff} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-kampmax-text">User UUID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11111111-1111-1111-1111-111111111111"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-kampmax-text">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Store Manager, Inventory Clerk"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-kampmax-text mb-2">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-kampmax-border rounded-lg">
                  {ALL_PERMISSIONS.map((p) => {
                    const checked = selectedPermissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                          checked
                            ? "bg-primary-50 border-primary-300 text-primary-900"
                            : "bg-white border-kampmax-border hover:bg-neutral-50 text-kampmax-text"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(p.key)}
                          className="rounded border-kampmax-border text-primary-600 focus:ring-primary-500"
                        />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-kampmax-border">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-lg border border-kampmax-border px-4 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-kampmax-text">Edit Staff Member</h2>
            <p className="mt-1 text-xs text-kampmax-text-secondary">
              Update role and permission scopes for this team member.
            </p>

            {errorMsg && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-error-50 p-3 text-xs text-error-700 border border-error-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStaff} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-kampmax-text">Role Title</label>
                <input
                  type="text"
                  required
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-kampmax-text mb-2">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-kampmax-border rounded-lg">
                  {ALL_PERMISSIONS.map((p) => {
                    const checked = selectedPermissions.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                          checked
                            ? "bg-primary-50 border-primary-300 text-primary-900"
                            : "bg-white border-kampmax-border hover:bg-neutral-50 text-kampmax-text"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(p.key)}
                          className="rounded border-kampmax-border text-primary-600 focus:ring-primary-500"
                        />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-kampmax-border">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="rounded-lg border border-kampmax-border px-4 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}