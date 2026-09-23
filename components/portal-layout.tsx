"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type PortalLayoutProps = {
  title: string;
  subtitle: string;
  name: string;
  email?: string | null;
  navigation: NavItem[];
  children: React.ReactNode;
};

export default function PortalLayout({
  title,
  subtitle,
  name,
  email,
  navigation,
  children,
}: PortalLayoutProps) {
  const pathname = usePathname();

  const initial = (name || "U")
    .charAt(0)
    .toUpperCase();

  const isActive = (href: string) =>
    pathname === href ||
    pathname.startsWith(`${href}/`);

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-sidebar-inner">

          {/* ALTERSCHED BRAND */}
          <Link
            href={navigation[0]?.href || "/"}
            className="portal-logo"
          >
            <Image
              className="portal-logo-image"
              src="/altsched-logo.png"
              alt="AlterSched"
              width={48}
              height={48}
              priority
            />

            <span className="portal-logo-copy">
              <strong>AlterSched</strong>
              <small>CCTC Scheduling System</small>
            </span>
          </Link>

          {/* CCTC IDENTITY */}
          <div className="cctc-identity">
            <Image
              src="/cctc-logo.png"
              alt="Consolatrix College of Toledo City"
              width={38}
              height={38}
            />

            <span>
              <strong>Consolatrix College</strong>
              <small>of Toledo City, Inc.</small>
            </span>
          </div>

          {/* CURRENT PORTAL */}
          <div className="portal-role">
            <span className="portal-role-label">
              {subtitle}
            </span>

            <strong>{title}</strong>

            <small>
              {email || name}
            </small>
          </div>

          {/* NAVIGATION */}
          <div className="portal-nav-label">
            NAVIGATION
          </div>

          <nav className="portal-nav">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    active
                      ? "portal-nav-link portal-nav-link-active"
                      : "portal-nav-link"
                  }
                  aria-current={
                    active ? "page" : undefined
                  }
                >
                  <span className="portal-nav-indicator" />

                  <span className="portal-nav-text">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* SIDEBAR USER */}
          <div className="portal-sidebar-footer">
            <div className="portal-sidebar-user">
              <span className="portal-mini-avatar">
                {initial}
              </span>

              <span>
                <strong>{name}</strong>
                <small>{email || title}</small>
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
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="portal-main">
        <header className="portal-topbar">
          <div className="portal-topbar-copy">
            <span>{subtitle}</span>
            <h1>{title}</h1>
          </div>

          <div className="portal-person">
            <span className="portal-avatar">
              {initial}
            </span>

            <span className="portal-person-copy">
              <strong>{name}</strong>
              <small>{email}</small>
            </span>
          </div>
        </header>

        <main className="portal-content">
          {children}
        </main>
      </div>
    </div>
  );
}