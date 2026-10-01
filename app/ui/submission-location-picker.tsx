"use client";

import { useEffect, useRef, useState } from "react";

type GeocodingFeature = {
  center?: [number, number];
  geometry?: { coordinates?: [number, number] };
  id?: string;
  place_name?: string;
  text?: string;
};

type Suggestion = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

const newYorkBounds: [[number, number], [number, number]] = [
  [-74.2591, 40.4774],
  [-73.7004, 40.9176],
];

const newYorkBbox = newYorkBounds.flat().join(",");

function coordinateValue(value: number) {
  return value.toFixed(6);
}

function parseSuggestion(feature: GeocodingFeature, index: number): Suggestion | null {
  const coordinates = feature.center ?? feature.geometry?.coordinates;
  const label = feature.place_name ?? feature.text;
  if (!coordinates || !label || !Number.isFinite(coordinates[0]) || !Number.isFinite(coordinates[1])) {
    return null;
  }

  return {
    id: feature.id ?? `${coordinates.join("-")}-${index}`,
    label,
    longitude: coordinates[0],
    latitude: coordinates[1],
  };
}

export function SubmissionLocationPicker() {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);
  const [address, setAddress] = useState("");
  const [hasChosenAddress, setHasChosenAddress] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");

  function setPin(nextLongitude: number, nextLatitude: number, flyTo = true) {
    setLongitude(coordinateValue(nextLongitude));
    setLatitude(coordinateValue(nextLatitude));

    const map = mapRef.current;
    if (!map) return;

    if (!markerRef.current) {
      const markerElement = document.createElement("div");
      markerElement.className = "submission-location-marker";
      markerElement.setAttribute("aria-label", "Selected restroom location");

      void import("maplibre-gl").then((maplibregl) => {
        if (!mapRef.current || markerRef.current) return;
        const marker = new maplibregl.Marker({
          anchor: "bottom",
          draggable: true,
          element: markerElement,
        })
          .setLngLat([nextLongitude, nextLatitude])
          .addTo(mapRef.current);

        marker.on("dragend", () => {
          const position = marker.getLngLat();
          setLongitude(coordinateValue(position.lng));
          setLatitude(coordinateValue(position.lat));
        });
        markerRef.current = marker;
      });
    } else {
      markerRef.current.setLngLat([nextLongitude, nextLatitude]);
    }

    if (flyTo) map.flyTo({ center: [nextLongitude, nextLatitude], zoom: 16, essential: true });
  }

  useEffect(() => {
    const element = mapElement.current;
    const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!element || !mapTilerKey) {
      setMapState("error");
      return;
    }

    let disposed = false;
    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !mapElement.current) return;
      maplibregl.setWorkerUrl("https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl-worker.mjs");
      const map = new maplibregl.Map({
        attributionControl: false,
        bounds: newYorkBounds,
        container: mapElement.current,
        fitBoundsOptions: { padding: 28 },
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("load", () => {
        if (disposed) return;
        mapRef.current = map;
        setMapState("ready");
      });
      map.on("click", ({ lngLat }) => setPin(lngLat.lng, lngLat.lat, false));
      map.on("error", () => {
        if (!disposed) setMapState("error");
      });
    }).catch(() => {
      if (!disposed) setMapState("error");
    });

    return () => {
      disposed = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const query = address.trim();
    const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!mapTilerKey || query.length < 3 || hasChosenAddress) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchState("loading");
      try {
        const parameters = new URLSearchParams({
          autocomplete: "true",
          bbox: newYorkBbox,
          country: "us",
          key: mapTilerKey,
          language: "en",
          limit: "6",
        });
        const response = await fetch(
          `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?${parameters}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Geocoding request failed");

        const result = await response.json() as { features?: GeocodingFeature[] };
        const nextSuggestions = (result.features ?? [])
          .map(parseSuggestion)
          .filter((suggestion): suggestion is Suggestion => suggestion !== null);
        setSuggestions(nextSuggestions);
        setActiveSuggestion(nextSuggestions.length ? 0 : -1);
        setSearchState("idle");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSuggestions([]);
        setSearchState("error");
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [address, hasChosenAddress]);

  function chooseSuggestion(suggestion: Suggestion) {
    setHasChosenAddress(true);
    setAddress(suggestion.label);
    setSuggestions([]);
    setActiveSuggestion(-1);
    setSearchState("idle");
    setPin(suggestion.longitude, suggestion.latitude);
  }

  function updateAddress(nextAddress: string) {
    setSuggestions([]);
    setActiveSuggestion(-1);
    setSearchState(
      nextAddress.trim().length >= 3
        ? process.env.NEXT_PUBLIC_MAPTILER_KEY ? "loading" : "error"
        : "idle",
    );
    if (hasChosenAddress && nextAddress !== address) {
      setHasChosenAddress(false);
      setLatitude("");
      setLongitude("");
      markerRef.current?.remove();
      markerRef.current = null;
    }
    setAddress(nextAddress);
  }

  function handleAddressKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveSuggestion(-1);
    }
  }

  function updateCoordinate(kind: "latitude" | "longitude", value: string) {
    const nextLatitude = kind === "latitude" ? value : latitude;
    const nextLongitude = kind === "longitude" ? value : longitude;
    if (kind === "latitude") setLatitude(value);
    else setLongitude(value);

    const parsedLatitude = Number(nextLatitude);
    const parsedLongitude = Number(nextLongitude);
    if (
      nextLatitude &&
      nextLongitude &&
      Number.isFinite(parsedLatitude) &&
      Number.isFinite(parsedLongitude) &&
      parsedLatitude >= -90 &&
      parsedLatitude <= 90 &&
      parsedLongitude >= -180 &&
      parsedLongitude <= 180
    ) {
      setPin(parsedLongitude, parsedLatitude);
    }
  }

  const suggestionStatus = searchState === "loading"
    ? "Searching addresses…"
    : searchState === "error"
      ? "Address suggestions are unavailable. You can still type the address and place the pin manually."
      : address.trim().length >= 3 && !suggestions.length && !hasChosenAddress
        ? "No address suggestions found."
        : "";

  return (
    <div className="submission-location-picker">
      <label htmlFor="submission-address">Street address</label>
      <div className="address-autocomplete">
        <input
          aria-activedescendant={activeSuggestion >= 0 ? `address-suggestion-${activeSuggestion}` : undefined}
          aria-autocomplete="list"
          aria-controls="address-suggestions"
          aria-expanded={suggestions.length > 0}
          autoComplete="off"
          id="submission-address"
          maxLength={500}
          name="address"
          onBlur={() => {
            setSuggestions([]);
            setActiveSuggestion(-1);
          }}
          onChange={(event) => updateAddress(event.target.value)}
          onKeyDown={handleAddressKeyDown}
          placeholder="Start typing a New York City address"
          role="combobox"
          type="text"
          value={address}
        />
        {suggestions.length ? (
          <ul className="address-suggestions" id="address-suggestions" role="listbox">
            {suggestions.map((suggestion, index) => (
              <li
                aria-selected={index === activeSuggestion}
                className={index === activeSuggestion ? "address-suggestion-active" : undefined}
                id={`address-suggestion-${index}`}
                key={suggestion.id}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveSuggestion(index)}
                onClick={() => chooseSuggestion(suggestion)}
                role="option"
              >
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                {suggestion.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <p aria-live="polite" className="address-search-status">{suggestionStatus}</p>

      <div className="submission-map-heading">
        <div>
          <p className="brief-label">Pinpoint the entrance</p>
          <p>Choose an address above, click the map, or drag the pin to the restroom entrance.</p>
        </div>
        {latitude && longitude ? <span>Coordinates set</span> : <span>Awaiting location</span>}
      </div>
      <div className="submission-map-wrap">
        <div
          aria-label="Interactive map for choosing the restroom location"
          className="submission-map"
          ref={mapElement}
          role="application"
        />
        {mapState === "loading" ? <p className="map-overlay">Loading the location map…</p> : null}
        {mapState === "error" ? (
          <p className="map-overlay map-overlay-error">
            The map is unavailable. Enter the address or coordinates below.
          </p>
        ) : null}
        <p className="map-attribution">
          <a href="https://www.maptiler.com/" rel="noreferrer" target="_blank">© MapTiler</a>
          {" · "}
          <a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">© OpenStreetMap contributors</a>
        </p>
      </div>

      <fieldset>
        <legend>Map coordinates <span>(filled automatically when you choose a location)</span></legend>
        <p className="field-help">You can also enter both values manually.</p>
        <div className="coordinate-fields">
          <div>
            <label htmlFor="submission-latitude">Latitude</label>
            <input
              id="submission-latitude"
              max="90"
              min="-90"
              name="latitude"
              onChange={(event) => updateCoordinate("latitude", event.target.value)}
              step="any"
              type="number"
              value={latitude}
            />
          </div>
          <div>
            <label htmlFor="submission-longitude">Longitude</label>
            <input
              id="submission-longitude"
              max="180"
              min="-180"
              name="longitude"
              onChange={(event) => updateCoordinate("longitude", event.target.value)}
              step="any"
              type="number"
              value={longitude}
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
