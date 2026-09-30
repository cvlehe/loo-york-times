import type { Metadata } from "next";
import Link from "next/link";

import {
  AdminSubmissionReview,
  type AdminSubmission,
  type PublishedRestroomOption,
} from "@/app/ui/admin-submission-review";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };

type MaintainedRestroom = {
  address_text: string | null;
  id: string;
  name: string;
  reviews: { id: string }[];
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return (
      <main className="site-main admin-page" id="main-content">
        <section className="submissions-notice">
          <p className="kicker">Editorial desk</p>
          <h1>Administrator sign-in required</h1>
          <p>Sign in with an administrator account to review community submissions.</p>
          <Link className="button-link" href="/login?next=%2Fadmin">Sign in</Link>
        </section>
      </main>
    );
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (role?.role !== "admin") {
    return (
      <main className="site-main admin-page" id="main-content">
        <section className="submissions-notice" role="alert">
          <p className="kicker">Editorial desk</p>
          <h1>Administrator access required</h1>
          <p>This queue is restricted to the site&apos;s server-enforced administrator roles.</p>
          <Link className="text-link" href="/">Return to the public map →</Link>
        </section>
      </main>
    );
  }

  const [{ data: submissionData, error: submissionsError }, { data: restroomData, error: restroomsError }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, name, address_text, latitude, longitude, city_ownership_explanation, hours_text, restroom_type, accessibility_notes, changing_station_notes, additional_notes, website_url, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("restrooms")
      .select("id, name, address_text, reviews(id)")
      .eq("publication_status", "published")
      .order("name"),
  ]);
  const submissions = (submissionData ?? []) as AdminSubmission[];
  const maintainedRestrooms = (restroomData ?? []) as MaintainedRestroom[];
  const publishedRestrooms = maintainedRestrooms.map(({ id, name }) => ({ id, name })) satisfies PublishedRestroomOption[];

  return (
    <main className="site-main admin-page" id="main-content">
      <header className="admin-header">
        <div>
          <p className="kicker">Editorial desk</p>
          <h1>Review queue</h1>
          <p className="dek">Correct contributor details, confirm eligibility, and publish or reject each location.</p>
        </div>
        <aside className="admin-queue-summary" aria-label="Review queue summary">
          <p className="brief-label">Awaiting review</p>
          <p><strong>{submissions.length}</strong> {submissions.length === 1 ? "submission" : "submissions"}</p>
          <p>Oldest first</p>
        </aside>
      </header>

      <nav className="admin-section-nav" aria-label="Administrator sections">
        <a href="#review-queue">Review queue</a>
        <a href="#listing-maintenance">Listing maintenance</a>
        <Link href="/admin/articles/new">Add article</Link>
      </nav>

      <section id="review-queue" aria-labelledby="review-queue-heading">
        <div className="section-heading-row admin-section-heading">
          <div>
            <p className="kicker">Contributions</p>
            <h2 id="review-queue-heading">Review queue</h2>
          </div>
        </div>

        {submissionsError ? (
          <section className="submissions-notice" role="alert">
            <h2>The review queue is temporarily unavailable</h2>
            <p>Refresh the page or try again shortly. No submissions have been changed.</p>
          </section>
        ) : submissions.length === 0 ? (
          <section className="submissions-notice">
            <p className="kicker">Desk clear</p>
            <h2>No submissions are waiting</h2>
            <p>New contributor submissions will appear here without being published to the map.</p>
          </section>
        ) : (
          <div className="admin-review-list">
            {submissions.map((submission) => (
              <AdminSubmissionReview
                key={submission.id}
                publishedRestrooms={publishedRestrooms}
                submission={submission}
              />
            ))}
          </div>
        )}
      </section>

      <section className="admin-maintenance-section" id="listing-maintenance" aria-labelledby="listing-maintenance-heading">
        <div className="section-heading-row admin-section-heading">
          <div>
            <p className="kicker">Published directory</p>
            <h2 id="listing-maintenance-heading">Listing maintenance</h2>
          </div>
          <p className="edition-note">Correct public details and moderate reader reviews</p>
        </div>

        {restroomsError ? (
          <section className="submissions-notice" role="alert">
            <h3>Published listings are temporarily unavailable</h3>
            <p>Refresh the page or try again shortly. No listings have been changed.</p>
          </section>
        ) : maintainedRestrooms.length === 0 ? (
          <section className="submissions-notice">
            <h3>No published listings</h3>
            <p>Approved and imported listings will appear here for maintenance.</p>
          </section>
        ) : (
          <ul className="admin-maintenance-list">
            {maintainedRestrooms.map((restroom) => (
              <li key={restroom.id}>
                <div>
                  <h3>{restroom.name}</h3>
                  <p>{restroom.address_text ?? "No street address"}</p>
                  <small>{restroom.reviews.length} {restroom.reviews.length === 1 ? "review" : "reviews"}</small>
                </div>
                <Link className="button-link" href={`/admin/restrooms/${restroom.id}`}>Maintain listing</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
