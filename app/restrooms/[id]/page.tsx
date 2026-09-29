import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  updated_at: string;
};

type RestroomDetail = {
  id: string;
  name: string;
  address_text: string | null;
  entrance_notes: string | null;
  neighborhood: string | null;
  borough: string | null;
  latitude: number | string;
  longitude: number | string;
  hours_text: string | null;
  source_location_type: string | null;
  operator_name: string | null;
  source_status: string | null;
  source_availability: string | null;
  source_accessibility: string | null;
  restroom_type: string | null;
  changing_station_notes: string | null;
  additional_notes: string | null;
  website_url: string | null;
  reviews: Review[];
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function directionsUrl(restroom: RestroomDetail) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${restroom.latitude},${restroom.longitude}`)}`;
}

function locationLine(restroom: RestroomDetail) {
  return [restroom.neighborhood, restroom.borough].filter(Boolean).join(", ") || "New York City";
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" role="img" aria-label={`${rating} out of 5 stars`}>
      <span aria-hidden="true">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>
    </span>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function RestroomDetailPage({ params }: PageProps<"/restrooms/[id]">) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  let restroom: RestroomDetail | null = null;
  let loadError = false;

  try {
    const supabase = await createClient();
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

    if (error) throw error;
    restroom = data as RestroomDetail | null;
  } catch {
    loadError = true;
  }

  if (!loadError && !restroom) notFound();

  if (loadError || !restroom) {
    return (
      <main id="main-content" className="narrow-page">
        <p className="kicker">The restroom desk</p>
        <h1>Details unavailable</h1>
        <p className="dek">This restroom listing could not be loaded. Please try again shortly.</p>
        <Link className="text-link back-link" href="/#restroom-map">Back to the map</Link>
      </main>
    );
  }

  const reviews = [...(restroom.reviews ?? [])].sort(
    (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviewCount
    : null;
  const facilityFacts = [
    ["Facility type", restroom.source_location_type],
    ["Restroom type", restroom.restroom_type],
    ["Accessibility", restroom.source_accessibility],
    ["Changing stations", restroom.changing_station_notes],
    ["Operator", restroom.operator_name],
    ["Operating status", restroom.source_status],
    ["Availability", restroom.source_availability],
  ].filter((fact): fact is [string, string] => Boolean(fact[1]));

  return (
    <main id="main-content" className="site-main detail-page">
      <Link className="text-link detail-back-link" href="/#restroom-map">← Back to the map and list</Link>

      <header className="detail-header">
        <div>
          <p className="kicker">Restroom directory</p>
          <h1>{restroom.name}</h1>
          <p className="detail-location">
            {restroom.address_text ?? locationLine(restroom)}
            {restroom.address_text ? <><br />{locationLine(restroom)}</> : null}
          </p>
          {restroom.entrance_notes ? <p className="detail-entrance"><strong>Entrance:</strong> {restroom.entrance_notes}</p> : null}
        </div>

        <aside className="rating-summary" aria-label="Rating summary">
          <p className="brief-label">Reader rating</p>
          {averageRating === null ? (
            <>
              <p className="unrated">Not yet rated</p>
              <p>0 reviews</p>
            </>
          ) : (
            <>
              <p className="average-rating"><strong>{averageRating.toFixed(1)}</strong> out of 5</p>
              <p><span aria-hidden="true">{"★".repeat(Math.round(averageRating))}{"☆".repeat(5 - Math.round(averageRating))}</span></p>
              <p>{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</p>
            </>
          )}
        </aside>
      </header>

      <div className="detail-actions">
        <a className="button-link" href={directionsUrl(restroom)} rel="noreferrer" target="_blank">
          Get directions <span aria-hidden="true">↗</span><span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        {restroom.website_url ? <a className="text-link" href={restroom.website_url} rel="noreferrer" target="_blank">Official website <span aria-hidden="true">↗</span><span className="visually-hidden"> (opens in a new tab)</span></a> : null}
      </div>

      <div className="detail-grid">
        <section className="detail-section" aria-labelledby="visit-heading">
          <p className="kicker">Plan your visit</p>
          <h2 id="visit-heading">Hours and facilities</h2>
          <dl className="detail-facts">
            <DetailFact label="Hours" value={restroom.hours_text ?? "Unknown hours"} />
            {facilityFacts.map(([label, value]) => <DetailFact key={label} label={label} value={value} />)}
          </dl>
          {restroom.additional_notes ? <div className="detail-notes"><h3>Additional information</h3><p>{restroom.additional_notes}</p></div> : null}
        </section>

        <section className="detail-section reviews-section" aria-labelledby="reviews-heading">
          <p className="kicker">Reader reports</p>
          <h2 id="reviews-heading">Reviews</h2>
          {reviews.length === 0 ? (
            <p className="empty-reviews">No reviews yet.</p>
          ) : (
            <ol className="review-list">
              {reviews.map((review) => (
                <li key={review.id}>
                  <div className="review-heading">
                    <Stars rating={review.rating} />
                    <time dateTime={review.updated_at}>Updated {formatReviewDate(review.updated_at)}</time>
                  </div>
                  {review.comment ? <p>{review.comment}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
