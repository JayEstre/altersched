"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown, Bell, BookOpen, BriefcaseBusiness, Building2, CalendarCheck, CalendarDays, CalendarRange,
  CircleUserRound, Clock3, GitPullRequest, LayoutDashboard, Library, ListChecks, QrCode, Settings, UserCheck, Users
} from "lucide-react";
import type { NavigationItem } from "@/lib/navigation";

type PortalLayoutProps = {
  title: string;
  subtitle: string;
  name: string;
  email?: string | null;
  navigation: NavigationItem[];
  children: React.ReactNode;
};

function isGroup(item: NavigationItem): item is Extract<NavigationItem, { type: "group" }> {
  return item.type === "group";
}

function isNavigationLink(item: NavigationItem): item is Extract<NavigationItem, { href: string }> {
  return "href" in item;
}

const NAV_ICONS = {
  "layout-dashboard": LayoutDashboard, "user-check": UserCheck, users: Users, "book-open": BookOpen, library: Library,
  "building-2": Building2, "calendar-days": CalendarDays, "arrow-up-down": ArrowUpDown, settings: Settings,
  "calendar-range": CalendarRange, "calendar-check": CalendarCheck, "list-checks": ListChecks,
  "briefcase-business": BriefcaseBusiness, "clock-3": Clock3, "git-pull-request": GitPullRequest, bell: Bell,
  "circle-user-round": CircleUserRound, "qr-code": QrCode,
} as const;

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7H20M4 12H20M4 17H20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 17L15 12L10 7M15 12H3M14 4H19C20.1 4 21 4.9 21 6V18C21 19.1 20.1 20 19 20H14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PortalLayout({
  title,
  subtitle,
  name,
  email,
  navigation,
  children,
}: PortalLayoutProps) {
  const pathname = usePathname();
  const initials = useMemo(() => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AS", [name]);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const firstLink =
    navigation.find(isNavigationLink);

  const homeHref =
    firstLink?.href || "/";

  const isActive = (href: string) => {
    if (pathname === href) {
      return true;
    }

    return pathname.startsWith(
      `${href}/`
    );
  };

  /*
   * Prevent the page behind the sidebar
   * from scrolling while the mobile menu
   * is open.
   */
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="portal-shell">
      {/* ============================================
          MOBILE OVERLAY
      ============================================= */}

      {sidebarOpen && (
        <button
          type="button"
          className="portal-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* ============================================
          SIDEBAR
      ============================================= */}

      <aside
        id="portal-sidebar"
        aria-label={`${title} navigation`}
        data-open={sidebarOpen ? "true" : "false"}
        className={
          sidebarOpen
            ? "portal-sidebar portal-sidebar-open"
            : "portal-sidebar"
        }
      >
        <div className="portal-sidebar-inner">
          {/* ========================================
              BRAND
          ========================================= */}

          <div className="portal-sidebar-header">
            <Link
              href={homeHref}
              className="portal-logo"
            >
              <Image
                className="portal-logo-image"
                src="/altsched-logo.png"
                alt="AlterSched"
                width={42}
                height={42}
                priority
              />

              <span className="portal-logo-copy">
                <strong>
                  AlterSched
                </strong>

                <small>
                  Scheduling System
                </small>
              </span>
            </Link>

            <button
              type="button"
              className="portal-sidebar-close"
              aria-label="Close navigation"
              onClick={() =>
                setSidebarOpen(false)
              }
            >
              <CloseIcon />
            </button>
          </div>

          {/* ========================================
              SCHOOL
          ========================================= */}

          <div className="cctc-identity">
            <Image
              className="cctc-identity-logo"
              src="/cctc-logo.png"
              alt="Consolatrix College of Toledo City"
              width={36}
              height={36}
            />

            <span className="cctc-identity-copy">
              <strong>
                Consolatrix College
              </strong>

              <small>
                of Toledo City, Inc.
              </small>
            </span>
          </div>

          {/* ========================================
              PORTAL INFORMATION
          ========================================= */}

          <div className="portal-role">
            <span className="portal-role-label">
              WORKSPACE
            </span>

            <strong className="portal-role-title">
              {title}
            </strong>

            <span className="portal-role-subtitle">
              {subtitle}
            </span>
          </div>

          {/* ========================================
              NAVIGATION
          ========================================= */}

          <nav
            id="portal-sidebar-nav"
            className="portal-nav"
            aria-label={`${title} navigation`}
          >
            {navigation.map(
              (item, index) => {
                if (isGroup(item)) {
                  return (
                    <div
                      key={`group-${item.label}-${index}`}
                      className="portal-nav-label"
                    >
                      {item.label}
                    </div>
                  );
                }

                if (
                  !isNavigationLink(item)
                ) {
                  return null;
                }

                const active =
                  isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={
                      active
                        ? "portal-nav-link portal-nav-link-active"
                        : "portal-nav-link"
                    }
                    aria-current={
                      active
                        ? "page"
                        : undefined
                    }
                  >
                    {(() => {
                      const Icon = item.icon ? NAV_ICONS[item.icon as keyof typeof NAV_ICONS] : undefined;
                      return Icon ? <Icon className="portal-nav-icon" size={17} strokeWidth={1.8} aria-hidden="true" /> : <span className="portal-nav-indicator" aria-hidden="true" />;
                    })()}

                    <span className="portal-nav-text">{item.label}</span>

                    <span
                      className="portal-nav-arrow"
                      aria-hidden="true"
                    >
                      <ArrowIcon />
                    </span>
                  </Link>
                );
              }
            )}
          </nav>

          {/* ========================================
              SIDEBAR FOOTER
          ========================================= */}

          <div className="portal-sidebar-footer">
            <div className="portal-sidebar-user">
              <span className="portal-mini-avatar" aria-hidden="true">{initials}</span>
              <span>
                <strong>{name}</strong>
                <small>{email || subtitle}</small>
              </span>
            </div>
            <form
              action="/auth/signout"
              method="post"
            >
              <button
                type="submit"
                className="portal-logout"
              >
                <LogoutIcon />

                <span>
                  Sign out
                </span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ============================================
          MAIN WORKSPACE
      ============================================= */}

      <div className="portal-main">
        {/* ========================================
            TOP BAR
        ========================================= */}

        <header className="portal-topbar">
          <div className="portal-topbar-left">
            <button
              type="button"
              className="portal-menu-button"
              aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
              aria-controls="portal-sidebar"
              aria-expanded={sidebarOpen}
              onClick={() =>
                setSidebarOpen((previous) => !previous)
              }
            >
              <MenuIcon />
            </button>

            <div className="portal-topbar-copy">
              <span className="portal-topbar-eyebrow">
                {subtitle}
              </span>

              <h1>
                {title}
              </h1>
            </div>
          </div>

          <div className="portal-person" aria-label="Signed in account">
            <span className="portal-avatar" aria-hidden="true">{initials}</span>
            <span className="portal-person-copy">
              <strong>{name}</strong>
              <small>{email || subtitle}</small>
            </span>
          </div>
        </header>

        {/* ========================================
            PAGE CONTENT
        ========================================= */}

        <main className="portal-content">
          <div className="portal-content-inner">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}