import Image from "next/image";

export default function Home() {
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
          <a className="text-link" href="#restroom-map">
            Explore the restroom map <span aria-hidden="true">↓</span>
          </a>
        </div>

        <aside className="hero-brief" aria-label="About this project">
          <Image
            alt="A pigeon reading The Loo York Times on a toilet"
            className="hero-mark"
            height={144}
            priority
            src="/logo.png"
            width={144}
          />
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
          <p className="edition-note">Map and live listings arrive in Task 07</p>
        </div>

        <div className="map-workspace">
          <div className="map-toolbar" aria-label="Map controls preview">
            <label htmlFor="restroom-search">Search by name or neighborhood</label>
            <div className="search-preview">
              <input
                disabled
                id="restroom-search"
                placeholder="Try Bryant Park or Flushing"
                type="search"
              />
              <button disabled type="button">Search</button>
            </div>
            <p className="control-note">
              Search and location lookup will be enabled with the interactive map.
            </p>
          </div>

          <div className="map-preview" aria-label="Map preview">
            <div className="map-grid" aria-hidden="true" />
            <p className="map-status">
              <span className="status-dot" aria-hidden="true" />
              Map preparation in progress
            </p>
            <div className="map-buttons" aria-label="Map zoom controls preview">
              <button aria-label="Zoom in (available with the map)" disabled type="button">+</button>
              <button aria-label="Zoom out (available with the map)" disabled type="button">−</button>
            </div>
          </div>

          <div className="listing-preview" aria-label="Restroom list preview">
            <div className="listing-header">
              <p className="brief-label">List view</p>
              <span>Preview</span>
            </div>
            <div className="listing-empty">
              <span className="listing-number" aria-hidden="true">00</span>
              <div>
                <h3>Published listings will appear here</h3>
                <p>Only restrooms cleared through editorial review will be shown.</p>
              </div>
            </div>
          </div>
        </div>
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
        <a className="button-link" href="/journalism">Read the journalism</a>
      </section>
    </main>
  );
}
