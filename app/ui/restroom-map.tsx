"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PublicRestroom = {
  id: string;
  name: string;
  address_text: string | null;
  borough: string | null;
  latitude: number;
  longitude: number;
  neighborhood: string | null;
};

type RestroomMapProps = { restrooms: PublicRestroom[] };
type LocationState =
  | "idle"
  | "locating"
  | "located"
  | "denied"
  | "timed-out"
  | "unavailable";

const newYorkBounds: [[number, number], [number, number]] = [[-74.2591, 40.4774], [-73.7004, 40.9176]];

function locationLabel(restroom: PublicRestroom) {
  return restroom.neighborhood ?? restroom.borough ?? "New York City";
}

function directionsUrl(restroom: PublicRestroom) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${restroom.latitude},${restroom.longitude}`)}`;
}

function findMatches(restrooms: PublicRestroom[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return restrooms;
  return restrooms.filter((restroom) =>
    [restroom.name, restroom.neighborhood]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
  );
}

function locationMessage(locationState: LocationState) {
  switch (locationState) {
    case "located":
      return "Your approximate location is shown on the map.";
    case "denied":
      return "Location permission was denied. You can still browse or search every listing.";
    case "timed-out":
      return "Location lookup timed out. Try again, or browse every listing without sharing your location.";
    case "unavailable":
      return "Your location is unavailable. You can still browse or search every listing.";
    default:
      return "";
  }
}

export function RestroomMap({ restrooms }: RestroomMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<Map<string, import("maplibre-gl").Marker>>(new Map());
  const userMarkerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const [activeId, setActiveId] = useState<string | null>(restrooms[0]?.id ?? null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [query, setQuery] = useState("");

  const matchingRestrooms = useMemo(() => findMatches(restrooms, query), [query, restrooms]);

  useEffect(() => {
    const element = mapElement.current;
    const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!element || !mapTilerKey) {
      setMapState("error");
      return;
    }

    let disposed = false;
    const markers = markersRef.current;
    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !mapElement.current) return;
      // Turbopack does not currently preserve MapLibre's module-worker URL in development.
      maplibregl.setWorkerUrl("https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl-worker.mjs");
      const map = new maplibregl.Map({
        container: mapElement.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`,
        bounds: newYorkBounds,
        fitBoundsOptions: { padding: 30 },
        attributionControl: false,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", () => {
        if (disposed) return;
        restrooms.forEach((restroom) => {
          const markerElement = document.createElement("button");
          markerElement.className = "restroom-marker";
          markerElement.type = "button";
          markerElement.setAttribute("aria-label", `Select ${restroom.name}`);
          markerElement.addEventListener("click", () => setActiveId(restroom.id));
          markers.set(restroom.id, new maplibregl.Marker({ element: markerElement, anchor: "bottom" })
            .setLngLat([restroom.longitude, restroom.latitude]).addTo(map));
        });
        mapRef.current = map;
        setMapState("ready");
      });
      map.on("error", () => { if (!disposed) setMapState("error"); });
    }).catch(() => { if (!disposed) setMapState("error"); });

    return () => {
      disposed = true;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      markers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [restrooms]);

  useEffect(() => {
    const visibleIds = new Set(matchingRestrooms.map((restroom) => restroom.id));
    markersRef.current.forEach((marker, id) => {
      const markerElement = marker.getElement();
      markerElement.hidden = !visibleIds.has(id);
      markerElement.classList.toggle("restroom-marker-active", id === activeId && visibleIds.has(id));
    });
  }, [activeId, mapState, matchingRestrooms]);

  useEffect(() => {
    const activeRestroom = matchingRestrooms.find((restroom) => restroom.id === activeId);
    if (!activeRestroom) return;
    mapRef.current?.flyTo({ center: [activeRestroom.longitude, activeRestroom.latitude], zoom: Math.max(mapRef.current.getZoom(), 14), essential: true });
  }, [activeId, matchingRestrooms]);

  function selectRestroom(restroom: PublicRestroom) {
    setActiveId(restroom.id);
    document.getElementById(`restroom-${restroom.id}`)?.scrollIntoView({ block: "nearest" });
  }

  function updateQuery(nextQuery: string) {
    const matches = findMatches(restrooms, nextQuery);
    if (!activeId || !matches.some((restroom) => restroom.id === activeId)) {
      setActiveId(matches[0]?.id ?? null);
    }
    setQuery(nextQuery);
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      return;
    }
    setLocationState("locating");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (!mapRef.current) {
          setLocationState("unavailable");
          return;
        }
        userMarkerRef.current?.remove();
        const markerElement = document.createElement("div");
        markerElement.className = "user-location-marker";
        markerElement.setAttribute("aria-label", "Your approximate location");
        userMarkerRef.current = new maplibregl.Marker({ element: markerElement })
          .setLngLat([coords.longitude, coords.latitude]).addTo(mapRef.current);
        mapRef.current.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14, essential: true });
        setLocationState("located");
      } catch {
        setLocationState("unavailable");
      }
    }, (error) => {
      if (error.code === error.PERMISSION_DENIED) setLocationState("denied");
      else if (error.code === error.TIMEOUT) setLocationState("timed-out");
      else setLocationState("unavailable");
    }, { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 });
  }

  const listHeading = query.trim()
    ? `${matchingRestrooms.length} ${matchingRestrooms.length === 1 ? "match" : "matches"}`
    : `${restrooms.length} published ${restrooms.length === 1 ? "listing" : "listings"}`;

  return (
    <div className="map-workspace">
      <div className="map-toolbar">
        <label htmlFor="restroom-search">Search by restroom name or neighborhood</label>
        <div className="search-controls">
          <input id="restroom-search" onChange={(event) => updateQuery(event.target.value)} placeholder="Try Bryant Park or Flushing" type="search" value={query} />
          {query ? <button className="clear-search" onClick={() => updateQuery("")} type="button">Clear</button> : null}
        </div>
        <div className="location-controls">
          <button disabled={mapState !== "ready" || locationState === "locating"} onClick={locateUser} type="button">
            {locationState === "locating" ? "Locating…" : mapState === "loading" ? "Location available when map loads" : "Use my location"}
          </button>
          <p aria-live="polite">{locationMessage(locationState)}</p>
        </div>
      </div>
      <div className="map-canvas-wrap">
        <div aria-label="Interactive map of published New York City restroom listings" className="map-canvas" ref={mapElement} role="application" />
        {mapState === "loading" ? <p className="map-overlay">Loading the map…</p> : null}
        {mapState === "error" ? <p className="map-overlay map-overlay-error">The map could not load. Browse the complete list alongside it.</p> : null}
        <p className="map-attribution"><a href="https://www.maptiler.com/" rel="noreferrer" target="_blank">© MapTiler</a>{" · "}<a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">© OpenStreetMap contributors</a></p>
      </div>
      <section aria-labelledby="listing-heading" className="listing-panel">
        <div className="listing-header"><div><p className="brief-label">List view</p><h3 aria-live="polite" id="listing-heading">{listHeading}</h3></div><span>Map-linked</span></div>
        {restrooms.length === 0 ? <div className="listing-empty"><span className="listing-number" aria-hidden="true">00</span><div><h4>No published listings yet</h4><p>Locations appear here after editorial review confirms they meet the project’s eligibility standard.</p></div></div>
          : matchingRestrooms.length === 0 ? <div className="listing-empty"><span className="listing-number" aria-hidden="true">00</span><div><h4>No matching listings</h4><p>Try another restroom name or neighborhood, or clear the search to browse every published location.</p></div></div>
            : <ul className="restroom-list">{matchingRestrooms.map((restroom, index) => <li id={`restroom-${restroom.id}`} key={restroom.id}><div className="listing-row"><button aria-pressed={activeId === restroom.id} className={activeId === restroom.id ? "restroom-listing restroom-listing-active" : "restroom-listing"} onClick={() => selectRestroom(restroom)} type="button"><span className="listing-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span><strong>{restroom.name}</strong><small>{restroom.address_text ?? locationLabel(restroom)}</small>{restroom.address_text ? <small>{locationLabel(restroom)}</small> : null}</span></button><a aria-label={`Get directions to ${restroom.name} in Google Maps (opens in a new tab)`} className="directions-link" href={directionsUrl(restroom)} rel="noreferrer" target="_blank">Directions <span aria-hidden="true">↗</span></a></div></li>)}</ul>}
      </section>
    </div>
  );
}
