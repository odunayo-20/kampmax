"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight, LogOut, Store, Package, Heart, MapPin,
  CreditCard, Wallet, Bell, Shield, HelpCircle,
  Settings, Star, ChevronDown, Pencil, Clock, Lock, ShieldCheck,
} from "lucide-react";
import { Avatar } from "@/components/atoms/Avatar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import {
  ProfileStatCard,
  ProfileMenuGrid,
  ProfileLoyaltyBadge,
} from "@/components/profile";
import { SettingsGroup, SettingsRow } from "@/components/profile/SettingsGroup";
import { getCurrentUser, getVendorByUserId } from "@/services/users";
import { getOrdersByUser } from "@/services/orders";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-context";
import { getWalletByUser } from "@/services/wallet";
import { formatNaira } from "@/lib/utils";
import { getLoyaltyProgram, getSavedAddresses, getSavedPaymentMethods } from "@/services/profile";

export default function ProfilePage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { selectedCampus } = useApp();
  const currentUser = getCurrentUser();
  const vendor = getVendorByUserId(currentUser.id);
  const orders = getOrdersByUser(currentUser.id);
  const wallet = getWalletByUser(currentUser.id);
  const loyalty = getLoyaltyProgram();
  const savedAddressesCount = getSavedAddresses().length;
  const savedPaymentMethodsCount = getSavedPaymentMethods().length;
  const [loggingOut, setLoggingOut] = useState(false);
  const [showVendorCard, setShowVendorCard] = useState(true);

  const activeOrders = orders.filter((o) =>
    ["placed", "confirmed", "preparing", "ready", "out_for_delivery"].includes(o.status)
  ).length;
  const completedOrders = orders.filter((o) => o.status === "delivered").length;

  const nextTier =
    loyalty.tier === "bronze"
      ? "silver"
      : loyalty.tier === "silver"
        ? "gold"
        : loyalty.tier === "gold"
          ? "platinum"
          : undefined;
  const nextTierThreshold =
    loyalty.tier === "bronze"
      ? 2000
      : loyalty.tier === "silver"
        ? 10000
        : loyalty.tier === "gold"
          ? 25000
          : 0;
  const progress = nextTier
    ? Math.min((loyalty.lifetimePoints / nextTierThreshold) * 100, 100)
    : 100;

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/login");
  }

  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs items={[{ label: "Profile" }]} />

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-kampmax-border overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-kampmax-navy to-kampmax-blue" />
        <div className="px-4 pb-4 -mt-8">
          <div className="flex items-end gap-3 mb-3">
            <div className="relative">
              <Avatar name={currentUser.name} size="lg" className="ring-4 ring-white" />
              <button
                onClick={() => router.push("/profile/edit")}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-kampmax-blue text-white flex items-center justify-center ring-2 ring-white"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            <div className="flex-1 pt-6">
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold text-kampmax-text">
                  {currentUser.name}
                </h1>
                {currentUser.isVerified && (
                  <span className="text-[10px] bg-kampmax-blue/10 text-kampmax-blue px-1.5 py-0.5 rounded font-medium">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-kampmax-text-secondary">
                {currentUser.department} &middot; {currentUser.level}
              </p>
              <p className="text-xs text-kampmax-text-secondary">
                {selectedCampus.name}
              </p>
            </div>
          </div>
          {currentUser.bio && (
            <p className="text-xs text-kampmax-text-secondary mb-3 line-clamp-2">
              {currentUser.bio}
            </p>
          )}
          <div className="flex items-center gap-1 text-[11px] text-kampmax-text-secondary">
            <Clock className="h-3 w-3" />
            <span>Joined {new Date(currentUser.joinedDate).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <ProfileStatCard
          icon={<Package className="h-5 w-5" />}
          label="Orders"
          value={orders.length}
          onClick={() => router.push("/orders")}
        />
        <ProfileStatCard
          icon={<Heart className="h-5 w-5" />}
          label="Wishlist"
          value={0}
          onClick={() => router.push("/profile/wishlist")}
        />
        <ProfileStatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Wallet"
          value={wallet ? formatNaira(wallet.balance) : "₦0"}
          onClick={() => router.push("/profile/wallet")}
        />
        <ProfileStatCard
          icon={<Star className="h-5 w-5" />}
          label="Points"
          value={loyalty.points.toLocaleString()}
        />
      </div>

      {/* Loyalty */}
      <ProfileLoyaltyBadge
        tier={loyalty.tier}
        points={loyalty.points}
        nextTier={nextTier}
        progress={progress}
      />

      {/* Vendor Card */}
      {vendor && showVendorCard && (
        <div
          className="bg-kampmax-navy rounded-xl p-4 cursor-pointer"
          onClick={() => router.push("/profile/vendor")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">
                {vendor.storeName}
              </h3>
              <p className="text-xs text-white/70">
                ⭐ {vendor.rating} &middot; {vendor.totalSales} sales
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowVendorCard(false);
              }}
              className="text-white/50 hover:text-white text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <ProfileMenuGrid
        columns={3}
        items={[
          {
            icon: <Package className="h-5 w-5" />,
            label: "Orders",
            onClick: () => router.push("/orders"),
          },
          {
            icon: <Heart className="h-5 w-5" />,
            label: "Wishlist",
            onClick: () => router.push("/profile/wishlist"),
          },
          {
            icon: <Wallet className="h-5 w-5" />,
            label: "Wallet",
            onClick: () => router.push("/profile/wallet"),
            badge: activeOrders > 0 ? activeOrders : undefined,
          },
          {
            icon: <MapPin className="h-5 w-5" />,
            label: "Addresses",
            onClick: () => router.push("/profile/addresses"),
          },
          {
            icon: <CreditCard className="h-5 w-5" />,
            label: "Payments",
            onClick: () => router.push("/profile/payment-methods"),
          },
          {
            icon: <Bell className="h-5 w-5" />,
            label: "Notifications",
            onClick: () => router.push("/notifications"),
          },
          {
            icon: <Shield className="h-5 w-5" />,
            label: "Security",
            onClick: () => router.push("/profile/settings/security"),
          },
          {
            icon: <HelpCircle className="h-5 w-5" />,
            label: "Help",
            onClick: () => router.push("/profile/help"),
          },
          {
            icon: <Settings className="h-5 w-5" />,
            label: "Settings",
            onClick: () => router.push("/profile/settings"),
          },
        ]}
      />

      {/* Account Menu */}
      <SettingsGroup title="Account">
        <SettingsRow
          icon={<Star className="h-5 w-5 text-amber-500" />}
          label="My Reviews & Ratings"
          description="View and manage feedback you've left"
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => router.push("/profile/reviews")}
        />
        <SettingsRow
          icon={<Pencil className="h-5 w-5" />}
          label="Edit Profile"
          description="Name, photo, bio, campus info"
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => router.push("/profile/edit")}
        />
        <SettingsRow
          icon={<MapPin className="h-5 w-5" />}
          label="Saved Addresses"
          description={`${savedAddressesCount} saved location${savedAddressesCount === 1 ? "" : "s"}`}
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => router.push("/profile/addresses")}
        />
        <SettingsRow
          icon={<CreditCard className="h-5 w-5" />}
          label="Payment Methods"
          description={`${savedPaymentMethodsCount} saved method${savedPaymentMethodsCount === 1 ? "" : "s"}`}
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => router.push("/profile/payment-methods")}
        />
        <SettingsRow
          icon={<Wallet className="h-5 w-5" />}
          label="Kampmax Wallet"
          description={wallet ? `Balance: ${formatNaira(wallet.balance)}` : "No wallet"}
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => router.push("/profile/wallet")}
        />
        <SettingsRow
          icon={<ShieldCheck className="h-5 w-5 text-kampmax-blue" />}
          label="Identity Verification (NIN & BVN)"
          description={currentUser.isVerified ? "Verified student identity" : "Verify your NIN & student credentials"}
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => router.push(vendor ? "/vendor/verification" : "/freelancer/verification")}
        />
      </SettingsGroup>

      {/* Settings Menu */}
      <SettingsGroup title="Settings">
        <SettingsRow
          icon={<Bell className="h-5 w-5" />}
          label="Notification Settings"
          description="Manage alerts and preferences"
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => router.push("/profile/settings/notifications")}
        />
        <SettingsRow
          icon={<Shield className="h-5 w-5" />}
          label="Privacy Settings"
          description="Control your visibility"
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => router.push("/profile/settings/privacy")}
        />
        <SettingsRow
          icon={<Lock className="h-5 w-5" />}
          label="Security Settings"
          description="Password, 2FA, sessions"
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => router.push("/profile/settings/security")}
        />
      </SettingsGroup>

      {/* Help */}
      <SettingsGroup>
        <SettingsRow
          icon={<HelpCircle className="h-5 w-5" />}
          label="Help & Support"
          description="FAQ, contact us, report a problem"
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => router.push("/profile/help")}
        />
      </SettingsGroup>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-kampmax-error hover:bg-kampmax-error/10 rounded-xl border border-kampmax-error/20 transition-colors disabled:opacity-50"
      >
        {loggingOut ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-kampmax-error/30 border-t-kampmax-error rounded-full animate-spin" />
            Signing out...
          </span>
        ) : (
          <>
            <LogOut className="h-4 w-4" />
            Log Out
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-kampmax-text-secondary pb-4">
        Kampmax v1.0 &middot; Campus Marketplace
      </p>
    </PageContainer>
  );
}

