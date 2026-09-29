import type { Metadata } from "next";
import Link from "next/link";

import { SubmissionForm } from "@/app/ui/submission-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Submit a restroom" };

export default async function NewSubmissionPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  return (
    <main className="site-main submission-page" id="main-content">
      <Link className="text-link detail-back-link" href="/">← Back to the map</Link>

      <header className="submission-header">
        <div>
          <p className="kicker">Contributor desk</p>
          <h1>Submit a restroom</h1>
          <p className="dek">
            Know a public restroom we missed? Send the location and explain its city connection.
            Every submission is checked before publication.
          </p>
        </div>
        <aside aria-label="Submission requirements" className="submission-brief">
          <p className="brief-label">What qualifies</p>
          <p>The restroom must be city-operated or located inside a city-owned building.</p>
        </aside>
      </header>

      {isAuthenticated ? (
        <SubmissionForm />
      ) : (
        <section className="submission-sign-in" aria-labelledby="submission-sign-in-heading">
          <p className="kicker">Sign-in required</p>
          <h2 id="submission-sign-in-heading">Join the contributor desk</h2>
          <p>Sign in by email so the editorial team can attach this submission to your account.</p>
          <Link className="button-link" href="/login?next=%2Fsubmissions%2Fnew">Sign in to submit</Link>
        </section>
      )}
    </main>
  );
}
