import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSampleArticle, sampleArticles } from "@/lib/journalism";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return sampleArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getSampleArticle(slug);

  if (!article) {
    return { title: "Sample article not found" };
  }

  return {
    title: `Sample: ${article.title}`,
    description: `${article.dek} Demonstration material, not published reporting.`,
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getSampleArticle(slug);

  if (!article) notFound();

  return (
    <main id="main-content" className="site-main article-page">
      <Link className="detail-back-link text-link" href="/journalism">
        <span aria-hidden="true">←</span> All sample stories
      </Link>

      <article>
        <header className="article-header">
          <p className="article-section">{article.section} · Demonstration sample</p>
          <h1>{article.title}</h1>
          <p className="article-dek">{article.dek}</p>
          <div className="article-byline">
            <p>By {article.byline}</p>
            <p>
              <time dateTime={article.date}>{article.displayDate}</time>
              <span aria-hidden="true"> · </span>{article.readingTime}
            </p>
          </div>
        </header>

        <aside className="article-demo-banner" aria-label="Demonstration content notice">
          <strong>Demonstration material - not published reporting.</strong>
          <span>
            This static sample exists only to show article layout and navigation.
          </span>
        </aside>

        <div className="article-body">
          {article.paragraphs.map((paragraph, index) => (
            <div key={paragraph}>
              <p>{paragraph}</p>
              {index === 1 && article.pullQuote ? (
                <blockquote>{article.pullQuote}</blockquote>
              ) : null}
            </div>
          ))}
        </div>

        <footer className="article-footer">
          <p className="sample-disclosure-label">End of demonstration article</p>
          <p>No article editor or publishing workflow is included in this demo.</p>
          <Link className="text-link" href="/journalism">Return to sample journalism</Link>
        </footer>
      </article>
    </main>
  );
}
