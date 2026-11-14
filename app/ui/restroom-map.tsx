"use client";

import { trackEvent } from "@/lib/analytics";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { accessibilityCategory, hasChangingStation, isOpenAt, type AccessibilityCategory } from "@/lib/restroom-filters";

export type PublicRestroom = {
  id: string;
  name: string;
  address_text: string | null;
  borough: string | null;
  latitude: number;
  longitude: number;
  neighborhood: string | null;
  hours_text: string | null;
  source_status: string | null;
  source_availability: string | null;
  source_accessibility: string | null;
  changing_station_notes: string | null;
  average_rating: number | null;
  review_count: number;
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
    [restroom.name, restroom.address_text, restroom.neighborhood, restroom.borough]
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

function createPopupContent(restroom: PublicRestroom) {
  const content = document.createElement("div");
  content.className = "restroom-popup-content";

  const name = document.createElement("strong");
  name.textContent = restroom.name;
  content.append(name);

  if (restroom.average_rating !== null) {
    const rating = document.createElement("span");
    const reviewLabel = restroom.review_count === 1 ? "review" : "reviews";
    rating.textContent = `${restroom.average_rating.toFixed(1)} ★ · ${restroom.review_count} ${reviewLabel}`;
    content.append(rating);
  }

  const detailsLink = document.createElement("a");
  detailsLink.href = `/restrooms/${restroom.id}`;
  detailsLink.textContent = "View details";
  detailsLink.setAttribute("aria-label", `View details for ${restroom.name}`);
  content.append(detailsLink);

  return content;
}

export function RestroomMap({ restrooms }: RestroomMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<Map<string, import("maplibre-gl").Marker>>(new Map());
  const popupRef = useRef<import("maplibre-gl").Popup | null>(null);
  const popupRestroomIdRef = useRef<string | null>(null);
  const userMarkerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const [activeId, setActiveId] = useState<string | null>(restrooms[0]?.id ?? null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [accessibility, setAccessibility] = useState<AccessibilityCategory | "any">("any");
  const [changingOnly, setChangingOnly] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const matchingRestrooms = useMemo(() => findMatches(restrooms, query).filter((restroom) =>
    (!openOnly || (now !== null && isOpenAt(restroom, now))) &&
    (accessibility === "any" || accessibilityCategory(restroom.source_accessibility) === accessibility) &&
    (!changingOnly || hasChangingStation(restroom.changing_station_notes)),
  ), [accessibility, changingOnly, now, openOnly, query, restrooms]);
  const selectedId = matchingRestrooms.some((restroom) => restroom.id === activeId)
    ? activeId
    : matchingRestrooms[0]?.id ?? null;
  const filtersActive = openOnly || accessibility !== "any" || changingOnly;

  const previousSearch = useRef("");
  const previousFilters = useRef("false:any:false");
  useEffect(() => {
    if (mapState !== "loading") trackEvent("map_status", { status: mapState });
  }, [mapState]);
  useEffect(() => {
    if (locationState !== "idle" && locationState !== "locating") {
      trackEvent("location_result", { status: locationState });
    }
  }, [locationState]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query !== previousSearch.current) {
        previousSearch.current = query;
        trackEvent("directory_searched", { has_query: Boolean(query.trim()), result_count: matchingRestrooms.length });
      }
      const filters = `${openOnly}:${accessibility}:${changingOnly}`;
      if (filters !== previousFilters.current) {
        previousFilters.current = filters;
        trackEvent("directory_filtered", { open_only: openOnly, accessibility, changing_only: changingOnly, result_count: matchingRestrooms.length });
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [query, openOnly, accessibility, changingOnly, matchingRestrooms.length]);

  useEffect(() => {
    if (!openOnly) return;
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [openOnly]);

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
      popupRef.current = new maplibregl.Popup({
        className: "restroom-popup",
        closeOnClick: false,
        focusAfterOpen: false,
        maxWidth: "15rem",
        offset: 18,
      });
      map.on("load", () => {
        if (disposed) return;
        restrooms.forEach((restroom) => {
          const markerElement = document.createElement("button");
          markerElement.className = "restroom-marker";
          markerElement.type = "button";
          markerElement.setAttribute("aria-label", `Select ${restroom.name}`);
          markerElement.addEventListener("click", () => selectRestroom(restroom, true));
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
      popupRef.current?.remove();
      popupRef.current = null;
      popupRestroomIdRef.current = null;
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
      markerElement.classList.toggle("restroom-marker-active", id === selectedId && visibleIds.has(id));
    });
    if (popupRestroomIdRef.current && !visibleIds.has(popupRestroomIdRef.current)) {
      popupRef.current?.remove();
      popupRestroomIdRef.current = null;
    }
  }, [mapState, matchingRestrooms, selectedId]);

  useEffect(() => {
    const activeRestroom = restrooms.find((restroom) => restroom.id === selectedId);
    if (!activeRestroom) return;
    mapRef.current?.flyTo({ center: [activeRestroom.longitude, activeRestroom.latitude], zoom: Math.max(mapRef.current.getZoom(), 14), essential: true });
  }, [restrooms, selectedId]);

  function selectRestroom(restroom: PublicRestroom, scrollListItem = false) {
    trackEvent("restroom_selected", { source: scrollListItem ? "map" : "list" });
    setActiveId(restroom.id);
    const map = mapRef.current;
    const popup = popupRef.current;

    if (map && popup) {
      popup
        .setDOMContent(createPopupContent(restroom))
        .setLngLat([restroom.longitude, restroom.latitude])
        .addTo(map);
      popupRestroomIdRef.current = restroom.id;
      map.flyTo({
        center: [restroom.longitude, restroom.latitude],
        zoom: Math.max(map.getZoom(), 14),
        essential: true,
      });
    }

    if (scrollListItem && window.matchMedia("(min-width: 1000px)").matches) {
      requestAnimationFrame(() => {
        const listItem = document.getElementById(`restroom-${restroom.id}`);
        const list = listItem?.closest(".restroom-list");
        if (list && listItem) {
          list.scrollTo({
            top: list.scrollTop + listItem.getBoundingClientRect().top - list.getBoundingClientRect().top,
            behavior: "smooth",
          });
        }
      });
    }
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
  }

  function locateUser() {
    trackEvent("location_requested", {});
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

  const listHeading = query.trim() || filtersActive
    ? `${matchingRestrooms.length} ${matchingRestrooms.length === 1 ? "match" : "matches"}`
    : `${restrooms.length} published ${restrooms.length === 1 ? "listing" : "listings"}`;

  return (
    <div className="map-workspace">
      <div className="map-toolbar">
        <label htmlFor="restroom-search">Search by your location or an address, neighborhood, or borough</label>
        <div className="search-controls">
          <input id="restroom-search" onChange={(event) => updateQuery(event.target.value)} placeholder="Try an address, Astoria, or Queens" type="search" value={query} />
          {query ? <button className="clear-search" onClick={() => updateQuery("")} type="button">Clear</button> : null}
        </div>
        <fieldset className="map-filters">
          <legend>Filter restrooms</legend>
          <div className="map-filter-controls">
            <label className="map-filter-check"><input checked={openOnly} onChange={(event) => { setOpenOnly(event.target.checked); setNow(new Date()); }} type="checkbox" />Currently open</label>
            <label className="map-filter-select" htmlFor="accessibility-filter">Accessibility
              <select id="accessibility-filter" onChange={(event) => setAccessibility(event.target.value as AccessibilityCategory | "any")} value={accessibility}>
                <option value="any">Any</option>
                <option value="fully">Fully accessible</option>
                <option value="partially">Partially accessible</option>
                <option value="not">Not accessible</option>
              </select>
            </label>
            <label className="map-filter-check"><input checked={changingOnly} onChange={(event) => setChangingOnly(event.target.checked)} type="checkbox" />Changing stations</label>
            {filtersActive ? <button className="clear-filters" onClick={() => { setOpenOnly(false); setAccessibility("any"); setChangingOnly(false); }} type="button">Clear filters</button> : null}
          </div>
          {openOnly ? <p className="map-filter-note">Based on listed New York hours. Seasonal listings and unclear schedules are omitted; hours may change.</p> : null}
        </fieldset>
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
          : matchingRestrooms.length === 0 ? <div className="listing-empty"><span className="listing-number" aria-hidden="true">00</span><div><h4>No matching listings</h4><p>Try another search or change the filters to browse more published locations.</p></div></div>
            : <ul className="restroom-list">{matchingRestrooms.map((restroom, index) => <li id={`restroom-${restroom.id}`} key={restroom.id}><div className="listing-row"><button aria-pressed={selectedId === restroom.id} className={selectedId === restroom.id ? "restroom-listing restroom-listing-active" : "restroom-listing"} onClick={() => selectRestroom(restroom)} type="button"><span className="listing-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span><strong>{restroom.name}</strong><small>{restroom.address_text ?? locationLabel(restroom)}</small>{restroom.address_text ? <small>{locationLabel(restroom)}</small> : null}</span></button><div className="listing-actions"><Link aria-label={`View details for ${restroom.name}`} href={`/restrooms/${restroom.id}`}>Details</Link><a aria-label={`Get directions to ${restroom.name} in Google Maps (opens in a new tab)`} href={directionsUrl(restroom)} rel="noreferrer" target="_blank">Directions <span aria-hidden="true">↗</span></a></div></div></li>)}</ul>}
      </section>
    </div>
  );
}
