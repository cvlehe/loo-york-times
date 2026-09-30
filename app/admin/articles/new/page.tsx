import type { Metadata } from "next";
import Link from "next/link";

import { AdminArticleForm } from "@/app/ui/admin-article-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Add an article" };

export default async function NewArticlePage() {
  const viewer = await getViewer();

  if (!viewer.isAuthenticated) {
    return (
      <main className="site-main admin-page" id="main-content">
        <section className="submissions-notice">
          <p className="kicker">Editorial desk</p>
          <h1>Administrator sign-in required</h1>
          <p>Sign in with an administrator account to add an article.</p>
          <Link className="button-link" href="/login?next=%2Fadmin%2Farticles%2Fnew">Sign in</Link>
        </section>
      </main>
    );
  }

  if (!viewer.isAdmin) {
    return (
      <main className="site-main admin-page" id="main-content">
        <section className="submissions-notice" role="alert">
          <p className="kicker">Editorial desk</p>
          <h1>Administrator access required</h1>
          <p>This page is restricted to the site&apos;s server-enforced administrator roles.</p>
          <Link className="text-link" href="/journalism">Return to journalism →</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="site-main admin-article-page" id="main-content">
      <Link className="detail-back-link text-link" href="/admin">← Back to admin</Link>
      <header className="admin-article-header">
        <div>
          <p className="kicker">Journalism desk</p>
          <h1>Add an article</h1>
          <p className="dek">Publish a titled link on the journalism page, with an optional image.</p>
        </div>
        <aside className="submission-brief" aria-label="Article entry scope">
          <p className="brief-label">Link entry only</p>
          <p>The article body stays at the URL you provide. This demo does not include an article editor.</p>
        </aside>
      </header>
      <AdminArticleForm />
    </main>
  );
}
