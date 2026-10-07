import {
  ManagedNotification,
  ManagedNotificationAudience,
  ManagedNotificationStatus,
  ManagedNotificationType,
  NotificationDeliveryType,
} from "@/types/admin";
import { mockCampuses } from "./campuses";
import { daysAgoIso, intBetween, pick, seededRandom } from "@/lib/admin/api";

// ------------------------------------------------------------
// MOCK DATASET FOR THE /admin/notifications MODULE
//
// Broadcast history + scheduled/draft rows covering every
// notification type, audience segment and delivery channel.
// Deterministic (seeded PRNG): identical output every reload.
// ------------------------------------------------------------

/** Index-bucketed: sent x9, scheduled x3, draft x3. */
const NOTIF_STATUS_PATTERN = [
  "sent", "sent", "scheduled", "sent", "draft",
  "sent", "scheduled", "sent", "draft", "sent",
  "scheduled", "sent", "draft", "sent",
] as const;

const AUDIENCE_CYCLE: ManagedNotificationAudience[] = [
  "all_users", "customers", "vendors", "campus_admins", "all_users",
  "vendors", "customers", "campus_admins", "all_users", "customers",
  "vendors", "all_users", "campus_admins", "customers",
];

const DELIVERY_CYCLE: NotificationDeliveryType[][] = [
  ["in_app"],
  ["in_app", "push"],
  ["push", "email"],
  ["in_app", "email"],
  ["email", "sms"],
  ["in_app", "push", "email"],
];

const SEEDS: {
  type: ManagedNotificationType;
  title: string;
  message: string;
}[] = [
  {
    type: "promotion",
    title: "Mid-Semester Sale Week is Live",
    message: "Discounts up to 40% are running across all campus vendors until Sunday. Open the deals tab in the app to browse them.",
  },
  {
    type: "system",
    title: "Scheduled maintenance this weekend",
    message: "Orders pause briefly on Saturday between 1am and 3am while we upgrade the payment service. Wallet balances are not affected.",
  },
  {
    type: "campus",
    title: "New pickup station at South Gate Lodge",
    message: "Collections and returns for RUGIPO can now be done at the new South Gate station beside the bookshop.",
  },
  {
    type: "order",
    title: "Exam-season delivery slots open",
    message: "Book hostel delivery slots early - capacity is limited during exam weeks and slots close 24 hours ahead.",
  },
  {
    type: "security",
    title: "Enable two-factor authentication",
    message: "Protect your payouts: turn on 2FA from Settings > Security before the end of the month.",
  },
  {
    type: "payment",
    title: "Wallet cashback promo returns",
    message: "Fund your wallet with N5,000 or more and get 2% cashback credited instantly, valid until month end.",
  },
  {
    type: "marketplace",
    title: "Vendor verification deadline approaching",
    message: "Stores without completed BVN verification will be paused after August 31. Upload documents from the vendor console.",
  },
  {
    type: "campus",
    title: "FUTA campus rep applications open",
    message: "We are recruiting campus ambassadors for the new session - stipends and free merch included.",
  },
  {
    type: "system",
    title: "App update v2.4 rolling out",
    message: "Faster search, saved carts and live order tracking are rolling out to all users this week.",
  },
  {
    type: "promotion",
    title: "Referral bonus doubled for one week",
    message: "Earn N1,000 wallet credit per verified referral until Friday midnight. No cap on referrals.",
  },
  {
    type: "order",
    title: "Twice-daily payout schedule starts Monday",
    message: "Vendor withdrawals will now process at 9am and 3pm WAT daily instead of once per day.",
  },
  {
    type: "security",
    title: "Suspicious login attempts blocked",
    message: "We blocked several login attempts from unknown devices this week. Review your active sessions in Settings.",
  },
  {
    type: "marketplace",
    title: "Draft: flash sale enrollment announcement",
    message: "Vendors can enroll December flash-sale listings from the promotions tab. Slots close Friday - needs a final review before sending.",
  },
  {
    type: "payment",
    title: "Draft: payout delay explanation",
    message: "Explains the 24-hour delay affecting last Tuesday's payout batch and the compensation plan. Pending legal sign-off.",
  },
];

const SENDERS = [
  "Adebayo Ogundimu",
  "Chiamaka Eze",
  "Fatima Yusuf",
  "Platform Admin",
];

function daysFromNowIso(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export interface NotificationManagementDataset {
  notifications: ManagedNotification[];
}

export function buildNotificationDataset(): NotificationManagementDataset {
  const rand = seededRandom(8123);
  const activeCampuses = mockCampuses.filter((c) => c.status === "active");

  const notifications: ManagedNotification[] = SEEDS.map((seed, i) => {
    const status = NOTIF_STATUS_PATTERN[i] as ManagedNotificationStatus;
    const audience = AUDIENCE_CYCLE[i];
    // Campus scope applies to some (not all) broadcasts.
    const scopedCampus =
      i % 3 === 2 ? pick(rand, activeCampuses).id : null;

    let deliverAt: string;
    switch (status) {
      case "scheduled":
        deliverAt = daysFromNowIso(intBetween(rand, 1, 9));
        break;
      case "draft":
        deliverAt = "";
        break;
      default:
        deliverAt = daysAgoIso(rand, intBetween(rand, 0, 30));
    }

    return {
      id: `mnt-${String(i + 1).padStart(3, "0")}`,
      type: seed.type,
      title: seed.title,
      message: seed.message,
      audience,
      campusId: scopedCampus,
      deliveryTypes: [...pick(rand, DELIVERY_CYCLE)],
      sentBy: pick(rand, SENDERS),
      deliverAt,
      recipients:
        status === "sent"
          ? estimateRecipients(audience, scopedCampus)
          : 0,
      openRate:
        status === "sent" ? Math.round(28 + rand() * 44) : 0,
      status,
      createdAt: daysAgoIso(rand, intBetween(rand, 1, 40)),
    };
  });

  return { notifications };
}

/**
 * Deterministic recipient estimate per audience/campus combo so the
 * composer preview matches what history rows show.
 */
export function estimateRecipients(
  audience: ManagedNotificationAudience,
  campusId: string | null
): number {
  const base: Record<ManagedNotificationAudience, number> = {
    all_users: 19_800,
    customers: 16_400,
    vendors: 620,
    campus_admins: 38,
  };
  if (!campusId) return base[audience];
  const share = 0.03 + ((campusId.length * 7) % 11) / 60;
  return Math.max(12, Math.round(base[audience] * share));
}

export const notificationDataset: NotificationManagementDataset =
  buildNotificationDataset();
