"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, MapPin, Plus, Pencil, Trash2, Check, Star, X,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SettingsGroup } from "@/components/profile/SettingsGroup";
import { SavedAddress } from "@/types";
import { getSavedAddresses, addAddress, deleteAddress, updateAddress } from "@/services/profile";
import { useApp } from "@/lib/app-context";
import { getCampuses } from "@/services/campus";

export default function AddressesPage() {
  const router = useRouter();
  const { selectedCampus } = useApp();
  const [addresses, setAddresses] = useState<SavedAddress[]>(getSavedAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formLabel, setFormLabel] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCampusId, setFormCampusId] = useState(selectedCampus.id);
  const [formContactName, setFormContactName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);

  function resetForm() {
    setFormLabel("");
    setFormAddress("");
    setFormCampusId(selectedCampus.id);
    setFormContactName("");
    setFormContactPhone("");
    setFormNotes("");
    setFormIsDefault(false);
    setEditingId(null);
  }

  function openAdd() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(addr: SavedAddress) {
    setFormLabel(addr.label);
    setFormAddress(addr.address);
    setFormCampusId(addr.campusId);
    setFormContactName(addr.contactName);
    setFormContactPhone(addr.contactPhone);
    setFormNotes(addr.notes || "");
    setFormIsDefault(addr.isDefault);
    setEditingId(addr.id);
    setShowForm(true);
  }

  function handleSave() {
    if (!formLabel.trim() || !formAddress.trim()) return;
    if (editingId) {
      updateAddress(editingId, {
        label: formLabel,
        address: formAddress,
        campusId: formCampusId,
        contactName: formContactName,
        contactPhone: formContactPhone,
        notes: formNotes || undefined,
        isDefault: formIsDefault,
      });
    } else {
      addAddress({
        label: formLabel,
        address: formAddress,
        campusId: formCampusId,
        contactName: formContactName,
        contactPhone: formContactPhone,
        notes: formNotes || undefined,
        isDefault: formIsDefault,
      });
    }
    setAddresses(getSavedAddresses());
    setShowForm(false);
    resetForm();
  }

  function handleDelete(id: string) {
    deleteAddress(id);
    setAddresses(getSavedAddresses());
    setDeletingId(null);
  }

  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Profile", href: "/profile" },
          { label: "Saved Addresses" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 text-kampmax-text" />
          </button>
          <h1 className="text-lg font-bold text-kampmax-text">Saved Addresses</h1>
        </div>
        <button
          onClick={openAdd}
          className="w-9 h-9 rounded-lg bg-kampmax-blue text-white flex items-center justify-center"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Address List */}
      {addresses.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-kampmax-border p-8 text-center">
          <MapPin className="h-10 w-10 text-kampmax-text-secondary mx-auto mb-3" />
          <p className="text-sm font-medium text-kampmax-text">No saved addresses</p>
          <p className="text-xs text-kampmax-text-secondary mt-1">
            Add a delivery address for faster checkout
          </p>
          <button
            onClick={openAdd}
            className="mt-4 px-4 py-2 bg-kampmax-blue text-white text-sm font-medium rounded-lg"
          >
            Add Address
          </button>
        </div>
      ) : (
        <SettingsGroup>
          {addresses.map((addr) => (
            <div key={addr.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  addr.isDefault ? "bg-kampmax-blue/10 text-kampmax-blue" : "bg-kampmax-muted text-kampmax-text-secondary"
                }`}>
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-kampmax-text">
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="text-[10px] bg-kampmax-blue/10 text-kampmax-blue px-1.5 py-0.5 rounded font-medium">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-kampmax-text leading-relaxed">
                    {addr.address}
                  </p>
                  <p className="text-xs text-kampmax-text-secondary mt-1">
                    {addr.contactName} &middot; {addr.contactPhone}
                  </p>
                  {addr.notes && (
                    <p className="text-[11px] text-kampmax-text-secondary mt-1 italic">
                      {addr.notes}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 ml-12">
                <button
                  onClick={() => openEdit(addr)}
                  className="text-xs text-kampmax-blue font-medium flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                {!addr.isDefault && (
                  <button
                    onClick={() => {
                      updateAddress(addr.id, { isDefault: true });
                      setAddresses(getSavedAddresses());
                    }}
                    className="text-xs text-kampmax-text-secondary font-medium flex items-center gap-1"
                  >
                    <Star className="h-3 w-3" /> Set Default
                  </button>
                )}
                {deletingId === addr.id ? (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-kampmax-error">Delete?</span>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="text-xs text-kampmax-error font-medium"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="text-xs text-kampmax-text-secondary"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(addr.id)}
                    className="text-xs text-kampmax-error font-medium flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </SettingsGroup>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl max-h-[85vh] flex flex-col">
            <div className="shrink-0 bg-white border-b border-kampmax-border px-4 py-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-kampmax-text">
                {editingId ? "Edit Address" : "Add Address"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-kampmax-text-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
                  Label
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g. Hostel, Home, Lecture Hall"
                  className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
                  Full Address
                </label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  rows={2}
                  placeholder="e.g. Block C, Room 12, RUGIPO Student Village, Owo"
                  className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text resize-none focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
                  Campus
                </label>
                <select
                  value={formCampusId}
                  onChange={(e) => setFormCampusId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text bg-white focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
                >
                  {getCampuses().map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    placeholder="Who to call"
                    className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formContactPhone}
                    onChange={(e) => setFormContactPhone(e.target.value)}
                    placeholder="+234..."
                    className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
                  Delivery Notes (optional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Ask security to call me"
                  className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-kampmax-border text-kampmax-blue focus:ring-kampmax-blue/20"
                />
                <span className="text-sm text-kampmax-text">Set as default address</span>
              </label>
            </div>
            <div className="shrink-0 bg-white border-t border-kampmax-border px-4 py-3">
              <button
                onClick={handleSave}
                disabled={!formLabel.trim() || !formAddress.trim()}
                className="w-full py-3 rounded-xl bg-kampmax-blue text-white text-sm font-semibold disabled:opacity-40"
              >
                {editingId ? "Update Address" : "Save Address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
