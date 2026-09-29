"use client";

import { useEffect, useRef, useState } from "react";

export type PublicRestroom = {
  id: string;
  name: string;
  address_text: string | null;
  borough: string | null;
  latitude: number;
  longitude: number;
  neighborhood: string | null;
};

type RestroomMapProps = {
  restrooms: PublicRestroom[];
};

const newYorkBounds: [[number, number], [number, number]] = [
  [-74.2591, 40.4774],
  [-73.7004, 40.9176],
];

function locationLabel(restroom: PublicRestroom) {
  return restroom.neighborhood ?? restroom.borough ?? "New York City";
}

export function RestroomMap({ restrooms }: RestroomMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markersRef = useRef<Map<string, import("maplibre-gl").Marker>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(restrooms[0]?.id ?? null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");

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

          const marker = new maplibregl.Marker({ element: markerElement, anchor: "bottom" })
            .setLngLat([restroom.longitude, restroom.latitude])
            .addTo(map);
          markers.set(restroom.id, marker);
        });

        mapRef.current = map;
        setMapState("ready");
      });
      map.on("error", () => {
        if (!disposed) setMapState("error");
      });
    }).catch(() => {
      if (!disposed) setMapState("error");
    });

    return () => {
      disposed = true;
      markers.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [restrooms]);

  useEffect(() => {
    const activeRestroom = restrooms.find((restroom) => restroom.id === activeId);
    if (!activeRestroom) return;

    document.querySelectorAll<HTMLButtonElement>(".restroom-marker").forEach((marker) => {
      marker.classList.remove("restroom-marker-active");
    });
    markersRef.current.get(activeRestroom.id)?.getElement().classList.add("restroom-marker-active");

    mapRef.current?.flyTo({
      center: [activeRestroom.longitude, activeRestroom.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      essential: true,
    });
  }, [activeId, restrooms]);

  function selectRestroom(restroom: PublicRestroom) {
    setActiveId(restroom.id);
    document.getElementById(`restroom-${restroom.id}`)?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="map-workspace">
      <div className="map-canvas-wrap">
        <div
          aria-label="Interactive map of published New York City restroom listings"
          className="map-canvas"
          ref={mapElement}
          role="application"
        />
        {mapState === "loading" ? <p className="map-overlay">Loading the map…</p> : null}
        {mapState === "error" ? (
          <p className="map-overlay map-overlay-error">The map could not load. Browse the complete list alongside it.</p>
        ) : null}
        <p className="map-attribution">
          <a href="https://www.maptiler.com/" rel="noreferrer" target="_blank">© MapTiler</a>{" · "}
          <a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">© OpenStreetMap contributors</a>
        </p>
      </div>

      <section aria-labelledby="listing-heading" className="listing-panel">
        <div className="listing-header">
          <div>
            <p className="brief-label">List view</p>
            <h3 id="listing-heading">{restrooms.length} published {restrooms.length === 1 ? "listing" : "listings"}</h3>
          </div>
          <span>Map-linked</span>
        </div>

        {restrooms.length === 0 ? (
          <div className="listing-empty">
            <span className="listing-number" aria-hidden="true">00</span>
            <div>
              <h4>No published listings yet</h4>
              <p>Locations appear here after editorial review confirms they meet the project’s eligibility standard.</p>
            </div>
          </div>
        ) : (
          <ul className="restroom-list">
            {restrooms.map((restroom, index) => (
              <li id={`restroom-${restroom.id}`} key={restroom.id}>
                <button
                  aria-pressed={activeId === restroom.id}
                  className={activeId === restroom.id ? "restroom-listing restroom-listing-active" : "restroom-listing"}
                  onClick={() => selectRestroom(restroom)}
                  type="button"
                >
                  <span className="listing-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{restroom.name}</strong>
                    <small>{restroom.address_text ?? locationLabel(restroom)}</small>
                    {restroom.address_text ? <small>{locationLabel(restroom)}</small> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
