import {
  Armchair,
  Bike,
  BookOpen,
  Camera,
  Cookie,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  Headphones,
  Lamp,
  Laptop,
  Music,
  Package,
  Printer,
  Shirt,
  ShoppingBasket,
  Smartphone,
  TabletSmartphone,
  type LucideIcon,
  Flower2,
} from "lucide-react";
import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type { ManagedCategoryStatus } from "@/types/admin";

/** lucide icon-name key -> component (fallback: Package). */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  "tablet-smartphone": TabletSmartphone,
  headphones: Headphones,
  "book-open": BookOpen,
  "graduation-cap": GraduationCap,
  shirt: Shirt,
  "shopping-basket": ShoppingBasket,
  "flower-2": Flower2,
  // Categories saved earlier may still carry the previous icon name.
  sparkles: Flower2,
  lamp: Lamp,
  printer: Printer,
  dumbbell: Dumbbell,
  "gamepad-2": Gamepad2,
  cookie: Cookie,
  package: Package,
  laptop: Laptop,
  camera: Camera,
  bicycle: Bike,
  music: Music,
  armchair: Armchair,
};

export function categoryIcon(key: string): LucideIcon {
  return CATEGORY_ICONS[key] ?? Package;
}

export const ICON_PICKER_KEYS: string[] = [
  "package",
  "smartphone",
  "tablet-smartphone",
  "laptop",
  "headphones",
  "gamepad-2",
  "camera",
  "book-open",
  "graduation-cap",
  "shirt",
  "shopping-basket",
  "cookie",
  "flower-2",
  "lamp",
  "armchair",
  "bicycle",
  "music",
  "printer",
  "dumbbell",
];

export const CATEGORY_STATUS_LABELS: Record<ManagedCategoryStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export function categoryStatusLabel(status: ManagedCategoryStatus): string {
  return CATEGORY_STATUS_LABELS[status] ?? status;
}

export function categoryStatusBadgeVariant(
  status: ManagedCategoryStatus
): BadgeVariant {
  return status === "active" ? "success" : "neutral";
}
