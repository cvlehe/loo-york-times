import Link from "next/link";

type PlaceholderPageProps = {
  description: string;
  eyebrow: string;
  nextTask: string;
  title: string;
};

export function PlaceholderPage({ description, eyebrow, nextTask, title }: PlaceholderPageProps) {
  return (
    <main id="main-content" className="narrow-page placeholder-page">
      <p className="kicker">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="dek">{description}</p>
      <div className="coming-note">
        <p className="brief-label">In the works</p>
        <p>{nextTask}</p>
      </div>
      <Link className="text-link back-link" href="/">← Return to the map</Link>
    </main>
  );
}
