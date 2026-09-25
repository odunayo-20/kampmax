"use client";

import { useEffect, useRef, useState } from "react";
import {
  MoreVertical,
  Pencil,
  PlusCircle,
  Power,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CategoryReorderDirection,
  ManagedCategory,
} from "@/types/admin";

export interface CategoryRowActions {
  onEdit: (category: ManagedCategory) => void;
  onCreateSub: (category: ManagedCategory) => void;
  onToggleStatus: (category: ManagedCategory) => void;
  onDelete: (category: ManagedCategory) => void;
  onReorder: (category: ManagedCategory, direction: CategoryReorderDirection) => void;
  /** View-only operators: hide reorder controls and the actions menu. */
  readOnly?: boolean;
}

// ------------------------------------------------------------
// Row kebab menu (fixed-position so table overflow can't clip it)
// ------------------------------------------------------------

const MENU_WIDTH = 210;

export function CategoryRowMenu({
  category,
  deletable,
  onEdit,
  onCreateSub,
  onToggleStatus,
  onDelete,
}: {
  category: ManagedCategory;
  deletable: boolean;
} & Pick<CategoryRowActions, "onEdit" | "onCreateSub" | "onToggleStatus" | "onDelete">) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const left = Math.max(
        8,
        Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)
      );
      // Menu is at most ~260px tall; flip above when near the bottom edge.
      const below = rect.bottom + 6;
      const top =
        below + 260 > window.innerHeight && rect.top - 270 > 0 ? rect.top - 270 : below;
      setCoords({ top, left });
    }
    setOpen((o) => !o);
  }

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`Actions for ${category.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-kampmax-text-secondary transition-colors hover:border-kampmax-border hover:bg-white hover:text-kampmax-text group-hover:border-kampmax-border"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && coords && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${category.name}`}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: MENU_WIDTH }}
          className="z-50 overflow-hidden rounded-lg border border-kampmax-border bg-white py-1 shadow-xl animate-[kampmax-fade-in_.12s_ease-out]"
        >
          <MenuItem icon={Pencil} label="Edit category" onClick={run(() => onEdit(category))} />
          <MenuItem
            icon={PlusCircle}
            label="Create subcategory"
            onClick={run(() => onCreateSub(category))}
          />
          <MenuItem
            icon={category.status === "active" ? Power : RotateCcw}
            label={category.status === "active" ? "Deactivate" : "Activate"}
            onClick={run(() => onToggleStatus(category))}
          />
          <div className="my-1 border-t border-kampmax-border/70" />
          <MenuItem
            icon={Trash2}
            label={
              deletable
                ? "Delete category"
                : `Deletion blocked (${category.subcategoryCount > 0 ? "has subcategories" : "products assigned"})`
            }
            danger
            disabled={!deletable}
            onClick={run(() => onDelete(category))}
          />
        </div>
      )}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: typeof Pencil;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      title={disabled ? label : undefined}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors",
        disabled
          ? "cursor-not-allowed text-kampmax-text-secondary/50"
          : danger
            ? "text-kampmax-error hover:bg-kampmax-error/5"
            : "text-kampmax-text hover:bg-kampmax-muted/60"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}