import type { Metadata } from "next";

import { AdminArticleActions } from "@/app/ui/admin-article-actions";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Journalism",
  description: "Editorial article links from The Loo York Times.",
};

type EditorialArticle = {
  created_at: string;
  id: string;
  image_url: string | null;
  title: string;
  url: string;
};

export default async function JournalismPage() {
  const supabase = await createClient();
  const [{ data, error }, viewer] = await Promise.all([
    supabase
      .from("articles")
      .select("id, title, url, image_url, created_at")
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
          <p className="dek">
            Article links selected by the editorial desk.
          </p>
        </div>
      </header>

      <section className="editorial-articles" aria-labelledby="editorial-articles-heading">
        <div className="article-index-heading">
          <h2 id="editorial-articles-heading">From the editorial desk</h2>
          <p>Links open the referenced article</p>
        </div>
        {error ? (
          <p className="data-error" role="status">Article links are temporarily unavailable. Please try again shortly.</p>
        ) : editorialArticles.length === 0 ? (
          <p className="editorial-articles-empty">No article links have been added yet.</p>
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
                    <p className="article-section">Editorial selection</p>
                    <h3><a href={article.url} rel="noreferrer">{article.title}</a></h3>
                    <a className="article-read-link" href={article.url} rel="noreferrer">
                      Open article <span aria-hidden="true">↗</span>
                    </a>
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
