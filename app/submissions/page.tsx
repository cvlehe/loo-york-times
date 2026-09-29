import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My submissions" };

type SubmissionStatus = "approved" | "pending" | "rejected";

type Submission = {
  address_text: string | null;
  created_at: string;
  duplicate_restroom_id: string | null;
  id: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  published_restroom_id: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  status: SubmissionStatus;
  updated_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "America/New_York",
});

const statusLabels: Record<SubmissionStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
};

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function SubmissionDecision({ submission }: { submission: Submission }) {
  if (submission.status === "approved") {
    return (
      <div className="submission-decision submission-decision-approved">
        <p><strong>Approved for publication.</strong> This location has joined the public restroom directory.</p>
        {submission.published_restroom_id ? (
          <Link className="text-link" href={`/restrooms/${submission.published_restroom_id}`}>
            View the published listing →
          </Link>
        ) : null}
      </div>
    );
  }

  if (submission.status === "rejected") {
    return (
      <div className="submission-decision submission-decision-rejected">
        <p className="submission-decision-label">Editorial decision</p>
        <p>{submission.rejection_reason ?? "This location was not approved for publication."}</p>
        {submission.duplicate_restroom_id ? (
          <Link className="text-link" href={`/restrooms/${submission.duplicate_restroom_id}`}>
            View the existing listing →
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="submission-decision submission-decision-pending">
      <p><strong>Awaiting editorial review.</strong> This submission is saved, but it is not published on the map.</p>
    </div>
  );
}

function SubmissionCard({ submission }: { submission: Submission }) {
  const location = submission.address_text
    ?? (submission.latitude !== null && submission.longitude !== null
      ? `${submission.latitude}, ${submission.longitude}`
      : "Location supplied to the editorial team");

  return (
    <li>
      <article className="submission-card">
        <header className="submission-card-header">
          <div>
            <p className="submission-card-label">Submitted location</p>
            <h2>{submission.name}</h2>
          </div>
          <p className={`submission-status submission-status-${submission.status}`}>
            {statusLabels[submission.status]}
          </p>
        </header>

        <dl className="submission-card-facts">
          <div>
            <dt>Location</dt>
            <dd>{location}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd><time dateTime={submission.created_at}>{formatDate(submission.created_at)}</time></dd>
          </div>
          <div>
            <dt>{submission.reviewed_at ? "Decided" : "Last updated"}</dt>
            <dd>
              <time dateTime={submission.reviewed_at ?? submission.updated_at}>
                {formatDate(submission.reviewed_at ?? submission.updated_at)}
              </time>
            </dd>
          </div>
        </dl>

        <SubmissionDecision submission={submission} />
      </article>
    </li>
  );
}

export default async function SubmissionsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const contributorId = claimsData?.claims?.sub;

  if (!contributorId) {
    return (
      <main className="site-main submissions-page" id="main-content">
        <header className="submissions-header">
          <div>
            <p className="kicker">Contributor desk</p>
            <h1>My submissions</h1>
            <p className="dek">Follow locations you send to the editorial team from review through a decision.</p>
          </div>
        </header>

        <section className="submission-sign-in" aria-labelledby="submissions-sign-in-heading">
          <p className="kicker">Sign-in required</p>
          <h2 id="submissions-sign-in-heading">Open your submission history</h2>
          <p>Sign in with the email address you used to submit a restroom. Only you can see your history.</p>
          <Link className="button-link" href="/login?next=%2Fsubmissions">Sign in to view submissions</Link>
        </section>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("submissions")
    .select("id, name, address_text, latitude, longitude, status, rejection_reason, duplicate_restroom_id, published_restroom_id, reviewed_at, created_at, updated_at")
    .eq("contributor_id", contributorId)
    .order("created_at", { ascending: false });
  const submissions = (data ?? []) as Submission[];

  return (
    <main className="site-main submissions-page" id="main-content">
      <header className="submissions-header">
        <div>
          <p className="kicker">Contributor desk</p>
          <h1>My submissions</h1>
          <p className="dek">
            Follow every location you have sent to the editorial team. Decisions appear here; no status emails are sent.
          </p>
        </div>
        <aside aria-label="Submission privacy" className="submissions-privacy">
          <p className="brief-label">Private to your account</p>
          <p>Your submission history is visible only to you and the editorial team.</p>
        </aside>
      </header>

      <div className="submissions-toolbar">
        <div>
          <p className="submissions-count">
            <strong>{submissions.length}</strong> {submissions.length === 1 ? "submission" : "submissions"}
          </p>
          <p className="submissions-count-note">Newest first</p>
        </div>
        <Link className="button-link" href="/submissions/new">Submit a restroom</Link>
      </div>

      {error ? (
        <section className="submissions-notice" role="alert">
          <h2>Submission history is temporarily unavailable</h2>
          <p>Please refresh the page or try again shortly. Your saved submissions have not been changed.</p>
        </section>
      ) : submissions.length === 0 ? (
        <section className="submissions-notice">
          <p className="kicker">Nothing here yet</p>
          <h2>Send the newsroom a location</h2>
          <p>Once you submit a restroom, its review status and editorial decision will appear on this page.</p>
          <Link className="text-link" href="/submissions/new">Start a submission →</Link>
        </section>
      ) : (
        <ol className="submission-history">
          {submissions.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} />
          ))}
        </ol>
      )}
    </main>
  );
}
