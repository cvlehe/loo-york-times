"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type MaintenanceListing = {
  addressText: string | null;
  id: string;
  name: string;
  reviewCount: number;
};

type AdminMaintenanceListProps = {
  listings: MaintenanceListing[];
};

function findMatchingListings(listings: MaintenanceListing[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return listings;

  return listings.filter((listing) =>
    [listing.name, listing.addressText]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
  );
}

export function AdminMaintenanceList({ listings }: AdminMaintenanceListProps) {
  const [query, setQuery] = useState("");
  const matchingListings = useMemo(() => findMatchingListings(listings, query), [listings, query]);
  const hasQuery = query.trim().length > 0;
  const resultLabel = hasQuery
    ? `${matchingListings.length} ${matchingListings.length === 1 ? "match" : "matches"}`
    : `${listings.length} published ${listings.length === 1 ? "listing" : "listings"}`;

  return (
    <div>
      <div className="admin-maintenance-search">
        <label htmlFor="admin-listing-search">Search published listings</label>
        <div className="admin-maintenance-search-controls">
          <input
            id="admin-listing-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or street address"
            type="search"
            value={query}
          />
          {query ? <button onClick={() => setQuery("")} type="button">Clear</button> : null}
        </div>
        <p aria-live="polite">{resultLabel}</p>
      </div>

      {matchingListings.length === 0 ? (
        <section className="submissions-notice admin-maintenance-empty" role="status">
          <h3>No matching listings</h3>
          <p>Try another name or address, or clear the search to browse every published listing.</p>
        </section>
      ) : (
        <ul className="admin-maintenance-list">
          {matchingListings.map((listing) => (
            <li key={listing.id}>
              <div>
                <h3>{listing.name}</h3>
                <p>{listing.addressText ?? "No street address"}</p>
                <small>{listing.reviewCount} {listing.reviewCount === 1 ? "review" : "reviews"}</small>
              </div>
              <Link className="button-link" href={`/admin/restrooms/${listing.id}`}>Maintain listing</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
