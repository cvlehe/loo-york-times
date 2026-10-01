import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type PublishedArticlePageProps = {
  params: Promise<{ id: string }>;
};

type PublishedArticle = {
  body: string;
  created_at: string;
  image_url: string | null;
  title: string;
};

async function getPublishedArticle(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("body, created_at, image_url, title")
    .eq("id", id)
    .eq("article_type", "internal")
    .maybeSingle();

  if (error || !data || !data.body) return null;
  return data as PublishedArticle;
}

export async function generateMetadata({ params }: PublishedArticlePageProps): Promise<Metadata> {
  const article = await getPublishedArticle((await params).id);
  if (!article) return { title: "Article not found" };
  return { title: article.title, description: article.body.slice(0, 160) };
}

export default async function PublishedArticlePage({ params }: PublishedArticlePageProps) {
  const article = await getPublishedArticle((await params).id);
  if (!article) notFound();
  const paragraphs = article.body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <main className="site-main article-page" id="main-content">
      <Link className="detail-back-link text-link" href="/journalism"><span aria-hidden="true">←</span> All journalism</Link>
      <article>
        <header className="article-header">
          <p className="article-section">Loo York Times reporting</p>
          <h1>{article.title}</h1>
          <div className="article-byline">
            <p>By The Loo York Times</p>
            <p><time dateTime={article.created_at}>{new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(article.created_at))}</time></p>
          </div>
        </header>
        {article.image_url ? (
          // Editorial images are linked from public hosts and intentionally browser-loaded.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="published-article-header-image" src={article.image_url} />
        ) : null}
        <div className="article-body">
          {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </article>
    </main>
  );
}
