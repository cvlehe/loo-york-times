import type { Metadata } from "next";
import Link from "next/link";

import { AdminArticleActions } from "@/app/ui/admin-article-actions";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Journalism",
  description: "Editorial article links from The Loo York Times.",
};

type EditorialArticle = {
  article_type: "external" | "internal";
  created_at: string;
  id: string;
  image_url: string | null;
  title: string;
  url: string | null;
};

export default async function JournalismPage() {
  const supabase = await createClient();
  const [{ data, error }, viewer] = await Promise.all([
    supabase
      .from("articles")
      .select("id, article_type, title, url, image_url, created_at")
      .order("created_at", { ascending: false }),
    getViewer(),
  ]);
  const editorialArticles = (data ?? []) as EditorialArticle[];

  return (
    <main id="main-content" className="site-main journalism-page">
      <header className="journalism-header">
        <div>
          <p className="kicker">The journalism desk</p>
          <h1>Reporting from the restroom beat</h1>
          <p className="dek">Reporting published by and selected by the editorial desk.</p>
        </div>
      </header>

      <section className="editorial-articles" aria-labelledby="editorial-articles-heading">
        <div className="article-index-heading">
          <h2 id="editorial-articles-heading">From the editorial desk</h2>
          <p>Original reporting and selected links</p>
        </div>
        {error ? (
          <p className="data-error" role="status">Article links are temporarily unavailable. Please try again shortly.</p>
        ) : editorialArticles.length === 0 ? (
          <p className="editorial-articles-empty">No articles have been added yet.</p>
        ) : (
          <ul className="editorial-article-list">
            {editorialArticles.map((article) => (
              <li key={article.id}>
                <article className={`editorial-article-card${article.image_url ? " editorial-article-card-image" : ""}`}>
                  {article.image_url ? (
                    // Administrators may link images from arbitrary public hosts, so this stays browser-loaded.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" loading="lazy" referrerPolicy="no-referrer" src={article.image_url} />
                  ) : null}
                  <div>
                    <p className="article-section">{article.article_type === "internal" ? "Loo York Times reporting" : "Editorial selection"}</p>
                    <h3>
                      {article.article_type === "internal" ? (
                        <Link href={`/journalism/published/${article.id}`}>{article.title}</Link>
                      ) : (
                        <a href={article.url ?? "#"} rel="noreferrer">{article.title}</a>
                      )}
                    </h3>
                    {article.article_type === "internal" ? (
                      <Link className="article-read-link" href={`/journalism/published/${article.id}`}>Read article <span aria-hidden="true">→</span></Link>
                    ) : (
                      <a className="article-read-link" href={article.url ?? "#"} rel="noreferrer">Open article <span aria-hidden="true">↗</span></a>
                    )}
                    {viewer.isAdmin ? <AdminArticleActions articleId={article.id} /> : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
