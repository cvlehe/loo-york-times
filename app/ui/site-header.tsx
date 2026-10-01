import Image from "next/image";
import Link from "next/link";

import { signOut } from "@/app/actions";
import type { Viewer } from "@/lib/auth";

const publicLinks = [
  { href: "/", label: "Map" },
  { href: "/journalism", label: "Journalism" },
  { href: "/city-progress", label: "City progress" },
];

function NavigationItems({ viewer }: { viewer: Viewer }) {
  return (
    <>
      {publicLinks.map((link) => (
        <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
      ))}
      {viewer.isAuthenticated ? (
        <li><Link href="/submissions">My submissions</Link></li>
      ) : null}
      {viewer.isAdmin ? <li><Link href="/admin">Admin</Link></li> : null}
    </>
  );
}

function AccountControl({ viewer }: { viewer: Viewer }) {
  if (!viewer.isAuthenticated) {
    return <Link className="account-link" href="/login">Sign in</Link>;
  }

  return (
    <form action={signOut}>
      <button className="account-link" type="submit">Log out</button>
    </form>
  );
}

export function SiteHeader({ viewer }: { viewer: Viewer }) {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <div className="utility-bar page-width">
        <p>New York City</p>
        <p>Public restrooms · Public record</p>
      </div>

      <div className="masthead page-width">
        <Link className="brand" href="/" aria-label="The Loo York Times home">
          <Image alt="" className="brand-mark" height={68} priority src="/loo-york-times-logo-transparent.png" width={68} />
          <span>The Loo York Times</span>
        </Link>
        <p className="tagline">All the news that&apos;s fit to sit</p>
      </div>

      <nav className="desktop-nav" aria-label="Primary navigation">
        <div className="page-width nav-inner">
          <ul><NavigationItems viewer={viewer} /></ul>
          <AccountControl viewer={viewer} />
        </div>
      </nav>

      <details className="mobile-nav">
        <summary aria-label="Open navigation menu">
          <span>Menu</span>
          <span className="menu-icon" aria-hidden="true" />
        </summary>
        <nav aria-label="Mobile navigation">
          <ul><NavigationItems viewer={viewer} /></ul>
          <AccountControl viewer={viewer} />
        </nav>
      </details>
    </header>
  );
}
