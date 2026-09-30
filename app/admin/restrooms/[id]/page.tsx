import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdminListingMaintenance,
  type MaintainedListing,
  type ModeratedReview,
} from "@/app/ui/admin-listing-maintenance";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Maintain listing" };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminRestroomPage({ params }: PageProps<"/admin/restrooms/[id]">) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return (
      <main className="site-main admin-page" id="main-content">
        <section className="submissions-notice">
          <p className="kicker">Editorial desk</p>
          <h1>Administrator sign-in required</h1>
          <p>Sign in with an administrator account to maintain this listing.</p>
          <Link className="button-link" href={`/login?next=${encodeURIComponent(`/admin/restrooms/${id}`)}`}>Sign in</Link>
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
          <p>Listing maintenance is restricted to the site&apos;s server-enforced administrator roles.</p>
          <Link className="text-link" href="/">Return to the public map →</Link>
        </section>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("restrooms")
    .select(`
      id,
      name,
      address_text,
      entrance_notes,
      neighborhood,
      borough,
      latitude,
      longitude,
      hours_text,
      source_location_type,
      operator_name,
      source_status,
      source_availability,
      source_accessibility,
      restroom_type,
      changing_station_notes,
      additional_notes,
      website_url,
      reviews (id, rating, comment, updated_at)
    `)
    .eq("id", id)
    .eq("publication_status", "published")
    .maybeSingle();

  if (!error && !data) notFound();

  if (error || !data) {
    return (
      <main className="site-main admin-page" id="main-content">
        <section className="submissions-notice" role="alert">
          <h1>Listing unavailable</h1>
          <p>This published listing could not be loaded. No changes have been made.</p>
          <Link className="text-link" href="/admin#listing-maintenance">Back to listing maintenance →</Link>
        </section>
      </main>
    );
  }

  const listing = data as MaintainedListing & { reviews: ModeratedReview[] };
  const reviews = [...(listing.reviews ?? [])].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );

  return (
    <main className="site-main admin-page" id="main-content">
      <Link className="text-link detail-back-link" href="/admin#listing-maintenance">← Back to listing maintenance</Link>
      <header className="admin-listing-header">
        <div>
          <p className="kicker">Published directory</p>
          <h1>Maintain {listing.name}</h1>
          <p className="dek">Changes are public after saving. Review removal is permanent.</p>
        </div>
        <Link className="button-link" href={`/restrooms/${listing.id}`}>View public listing</Link>
      </header>
      <AdminListingMaintenance listing={listing} reviews={reviews} />
    </main>
  );
}
