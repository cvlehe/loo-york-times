import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminArticleForm } from "@/app/ui/admin-article-form";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Save an article" };

type NewArticlePageProps = {
  searchParams: Promise<{ articleId?: string | string[] }>;
};

export default async function NewArticlePage({ searchParams }: NewArticlePageProps) {
  const viewer = await getViewer();
  const requestedArticleId = (await searchParams).articleId;
  const articleId = typeof requestedArticleId === "string" ? requestedArticleId : undefined;
  const returnPath = articleId
    ? `/admin/articles/new?articleId=${encodeURIComponent(articleId)}`
    : "/admin/articles/new";

  if (!viewer.isAuthenticated) {
    return (
      <main className="site-main admin-page" id="main-content">
        <section className="submissions-notice">
          <p className="kicker">Editorial desk</p>
          <h1>Administrator sign-in required</h1>
          <p>Sign in with an administrator account to add an article.</p>
          <Link className="button-link" href={`/login?next=${encodeURIComponent(returnPath)}`}>Sign in</Link>
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

  let article: { id: string; imageUrl: string | null; title: string; url: string } | undefined;
  if (articleId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("id, image_url, title, url")
      .eq("id", articleId)
      .maybeSingle();

    if (error || !data) notFound();
    article = {
      id: data.id,
      imageUrl: data.image_url,
      title: data.title,
      url: data.url,
    };
  }

  return (
    <main className="site-main admin-article-page" id="main-content">
      <Link className="detail-back-link text-link" href="/admin">← Back to admin</Link>
      <header className="admin-article-header">
        <div>
          <p className="kicker">Journalism desk</p>
          <h1>{article ? "Edit article" : "Add an article"}</h1>
          <p className="dek">{article ? "Update this article link and its optional image." : "Publish a titled link on the journalism page, with an optional image."}</p>
        </div>
        <aside className="submission-brief" aria-label="Article entry scope">
          <p className="brief-label">Link entry only</p>
          <p>The article body stays at the URL you provide. This demo does not include an article editor.</p>
        </aside>
      </header>
      <AdminArticleForm article={article} />
    </main>
  );
}
