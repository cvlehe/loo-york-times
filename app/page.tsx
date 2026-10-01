import Link from "next/link";

import { RestroomMap, type PublicRestroom } from "@/app/ui/restroom-map";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  let restrooms: PublicRestroom[] = [];
  let listingsError = false;

  try {
    const supabase = await createClient();
    const pageSize = 1_000;
    const records = [];

    for (let start = 0; ; start += pageSize) {
      const { data, error } = await supabase
        .from("restrooms")
        .select("id, name, address_text, borough, latitude, longitude, neighborhood, reviews (rating)")
        .eq("publication_status", "published")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("name")
        .range(start, start + pageSize - 1);

      if (error) throw error;
      records.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }

    restrooms = records.map((restroom) => {
      const { reviews, ...listing } = restroom;
      const ratings = reviews ?? [];

      return {
        ...listing,
        latitude: Number(restroom.latitude),
        longitude: Number(restroom.longitude),
        average_rating: ratings.length
          ? ratings.reduce((total, review) => total + review.rating, 0) / ratings.length
          : null,
        review_count: ratings.length,
      };
    });
  } catch {
    listingsError = true;
  }

  return (
    <main id="main-content" className="site-main">
      <section className="hero-grid" aria-labelledby="home-heading">
        <div className="hero-copy">
          <p className="kicker">A public-service guide to New York City</p>
          <h1 id="home-heading">When nature calls, know where to go.</h1>
          <p className="dek">
            A clearer way to find eligible public restrooms across the five
            boroughs - with practical details and reporting that holds the city
            to account.
          </p>
          <div className="hero-actions">
            <Link className="button-link hero-submit-button" href="/submissions/new">
              Submit a restroom <span aria-hidden="true">→</span>
            </Link>
            <Link className="button-link hero-map-button" href="#restroom-map">
              View map <span aria-hidden="true">↓</span>
            </Link>
          </div>
        </div>

        <aside className="hero-brief" aria-label="About this project">
          <div>
            <p className="brief-label">The brief</p>
            <p>
              Reliable information for a basic city need. Listings are reviewed
              before they appear here.
            </p>
          </div>
        </aside>
      </section>

      <section className="map-section" id="restroom-map" aria-labelledby="map-heading">
        <div className="section-heading-row">
          <div>
            <p className="kicker">The restroom desk</p>
            <h2 id="map-heading">Find a restroom</h2>
          </div>
          <p className="edition-note">Published locations only</p>
        </div>

        {listingsError ? (
          <p className="data-error" role="status">Published listings are temporarily unavailable. Please try again shortly.</p>
        ) : <RestroomMap restrooms={restrooms} />}
      </section>

      <section className="news-strip" aria-labelledby="news-heading">
        <div>
          <p className="kicker">From the newsroom</p>
          <h2 id="news-heading">The city&apos;s most necessary beat.</h2>
        </div>
        <p>
          Follow reporting on access, maintenance, and the long road to a more
          comfortable New York.
        </p>
        <Link className="button-link" href="/journalism">Read the journalism</Link>
      </section>
    </main>
  );
}
