"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { useAdminUI } from "@/lib/admin/admin-ui-context";
import { getNavForRole } from "@/lib/admin/navigation";

function NavGroups({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { admin } = useAdminSession();
  if (!admin) return null;
  const groups = getNavForRole(admin.role);

  return (
    <nav aria-label="Admin sections" className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.id}>
          {!collapsed && (
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400/80">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              // Segment-boundary match so /admin/campus doesn't also
              // highlight for /admin/campuses (and vice versa).
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                      "text-slate-300 hover:bg-white/5 hover:text-white",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue",
                      active && "bg-white/10 font-medium text-white",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-kampmax-blue",
                        active ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.2 : 2} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { admin } = useAdminSession();
  if (!admin) return null;

  return (
    <div
      className={cn(
        "border-t border-white/10 p-3",
        collapsed ? "flex justify-center" : "flex items-center gap-2.5"
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-kampmax-blue text-xs font-bold text-white">
        {admin.avatar}
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-white">{admin.name}</p>
          <p className="truncate text-[11px] text-slate-400">
            {admin.role === "SUPER_ADMIN"
              ? "Super Admin"
              : admin.role === "ADMIN"
                ? "Admin"
                : "Campus Admin"}
          </p>
        </div>
      )}
    </div>
  );
}

import { LogoIcon } from "@/components/ui/Logo";

export function AdminSidebar() {
  const { collapsed, toggleCollapsed } = useAdminUI();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col bg-kampmax-navy transition-[width] duration-150 lg:flex",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <LogoIcon size={collapsed ? 28 : 30} />
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-white">
              Kamp<span className="text-primary-400">max</span>
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Operations Console
            </p>
          </div>
        )}
      </div>

      <NavGroups collapsed={collapsed} />

      <SidebarFooter collapsed={collapsed} />

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "absolute -right-9 top-[68px] hidden h-8 w-8 items-center justify-center rounded-md border border-kampmax-border bg-white text-kampmax-text-secondary shadow-sm transition-colors hover:bg-kampmax-muted lg:flex",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}

/** Mobile drawer version of the same navigation. */
export function AdminMobileSidebar() {
  const { mobileNavOpen, setMobileNavOpen } = useAdminUI();

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileNavOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNavOpen, setMobileNavOpen]);

  if (!mobileNavOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/50"
        onClick={() => setMobileNavOpen(false)}
      />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-kampmax-navy shadow-xl">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2.5">
            <LogoIcon size={28} />
            <p className="text-sm font-bold text-white">
              Kamp<span className="text-primary-400">max</span> Admin
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close"
            className="rounded-md p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <NavGroups collapsed={false} onNavigate={() => setMobileNavOpen(false)} />

        <SidebarFooter collapsed={false} />
      </div>
    </div>
  );
}
