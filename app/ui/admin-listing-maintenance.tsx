"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  removeReview,
  updateListing,
  type ListingMaintenanceState,
} from "@/app/admin/restrooms/[id]/actions";

export type MaintainedListing = {
  additional_notes: string | null;
  address_text: string | null;
  borough: string | null;
  changing_station_notes: string | null;
  entrance_notes: string | null;
  hours_text: string | null;
  id: string;
  latitude: number | string;
  longitude: number | string;
  name: string;
  neighborhood: string | null;
  operator_name: string | null;
  restroom_type: string | null;
  source_accessibility: string | null;
  source_availability: string | null;
  source_location_type: string | null;
  source_status: string | null;
  website_url: string | null;
};

export type ModeratedReview = {
  comment: string | null;
  id: string;
  rating: number;
  updated_at: string;
};

const initialState: ListingMaintenanceState = { status: "idle", message: "" };
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "America/New_York",
});

function FormMessage({ state }: { state: ListingMaintenanceState }) {
  if (!state.message) return null;
  return (
    <div
      aria-live="polite"
      className={`form-message ${state.status === "error" ? "form-message-error" : "form-message-success"}`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} type="submit">{pending ? "Saving changes..." : "Save listing changes"}</button>;
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return <button className="admin-remove-review" disabled={pending} type="submit">{pending ? "Removing..." : "Remove review"}</button>;
}

function ReviewRemovalForm({ restroomId, reviewId }: { restroomId: string; reviewId: string }) {
  const [state, formAction] = useActionState(removeReview, initialState);

  return (
    <form
      action={formAction}
      className="admin-review-removal-form"
      onSubmit={(event) => {
        if (!window.confirm("Remove this review permanently? This cannot be undone.")) event.preventDefault();
      }}
    >
      <input name="restroomId" type="hidden" value={restroomId} />
      <input name="reviewId" type="hidden" value={reviewId} />
      <RemoveButton />
      <FormMessage state={state} />
    </form>
  );
}

export function AdminListingMaintenance({ listing, reviews }: { listing: MaintainedListing; reviews: ModeratedReview[] }) {
  const [state, formAction] = useActionState(updateListing, initialState);

  return (
    <>
      <form action={formAction} className="admin-review-form admin-listing-form">
        <input name="restroomId" type="hidden" value={listing.id} />
        <div className="admin-review-grid">
          <div className="admin-review-wide">
            <label htmlFor="listing-name">Listing name</label>
            <input defaultValue={listing.name} id="listing-name" maxLength={200} name="name" required />
          </div>
          <div>
            <label htmlFor="listing-address">Street address or location</label>
            <textarea defaultValue={listing.address_text ?? ""} id="listing-address" maxLength={500} name="address" rows={3} />
          </div>
          <div>
            <label htmlFor="listing-entrance">Entrance notes</label>
            <textarea defaultValue={listing.entrance_notes ?? ""} id="listing-entrance" maxLength={1_000} name="entranceNotes" rows={3} />
          </div>
          <div>
            <label htmlFor="listing-neighborhood">Neighborhood</label>
            <input defaultValue={listing.neighborhood ?? ""} id="listing-neighborhood" maxLength={200} name="neighborhood" />
          </div>
          <div>
            <label htmlFor="listing-borough">Borough</label>
            <input defaultValue={listing.borough ?? ""} id="listing-borough" maxLength={100} name="borough" />
          </div>
          <div>
            <label htmlFor="listing-latitude">Latitude</label>
            <input defaultValue={listing.latitude} id="listing-latitude" max="90" min="-90" name="latitude" required step="any" type="number" />
          </div>
          <div>
            <label htmlFor="listing-longitude">Longitude</label>
            <input defaultValue={listing.longitude} id="listing-longitude" max="180" min="-180" name="longitude" required step="any" type="number" />
          </div>
          <div>
            <label htmlFor="listing-hours">Hours</label>
            <textarea defaultValue={listing.hours_text ?? ""} id="listing-hours" maxLength={500} name="hours" rows={3} />
          </div>
          <div>
            <label htmlFor="listing-location-type">Facility type</label>
            <input defaultValue={listing.source_location_type ?? ""} id="listing-location-type" maxLength={200} name="sourceLocationType" />
          </div>
          <div>
            <label htmlFor="listing-operator">Operator</label>
            <input defaultValue={listing.operator_name ?? ""} id="listing-operator" maxLength={200} name="operatorName" />
          </div>
          <div>
            <label htmlFor="listing-status">Operating status</label>
            <input defaultValue={listing.source_status ?? ""} id="listing-status" maxLength={200} name="sourceStatus" />
          </div>
          <div>
            <label htmlFor="listing-availability">Availability</label>
            <input defaultValue={listing.source_availability ?? ""} id="listing-availability" maxLength={200} name="sourceAvailability" />
          </div>
          <div>
            <label htmlFor="listing-accessibility">Accessibility</label>
            <textarea defaultValue={listing.source_accessibility ?? ""} id="listing-accessibility" maxLength={500} name="sourceAccessibility" rows={3} />
          </div>
          <div>
            <label htmlFor="listing-restroom-type">Restroom type</label>
            <input defaultValue={listing.restroom_type ?? ""} id="listing-restroom-type" maxLength={200} name="restroomType" />
          </div>
          <div>
            <label htmlFor="listing-changing">Changing-station notes</label>
            <textarea defaultValue={listing.changing_station_notes ?? ""} id="listing-changing" maxLength={1_000} name="changingStationNotes" rows={3} />
          </div>
          <div className="admin-review-wide">
            <label htmlFor="listing-website">Official website</label>
            <input defaultValue={listing.website_url ?? ""} id="listing-website" maxLength={2_048} name="website" type="url" />
          </div>
          <div className="admin-review-wide">
            <label htmlFor="listing-notes">Additional information</label>
            <textarea defaultValue={listing.additional_notes ?? ""} id="listing-notes" maxLength={2_000} name="additionalNotes" rows={4} />
          </div>
        </div>
        <FormMessage state={state} />
        <div className="admin-listing-save"><SaveButton /></div>
      </form>

      <section className="admin-review-moderation" aria-labelledby="review-moderation-heading">
        <div>
          <p className="kicker">Reader reports</p>
          <h2 id="review-moderation-heading">Review moderation</h2>
          <p>Removed reviews disappear publicly and no longer count toward the average rating.</p>
        </div>
        {reviews.length === 0 ? (
          <p className="empty-reviews">This listing has no reviews.</p>
        ) : (
          <ol className="review-list admin-moderation-list">
            {reviews.map((review) => (
              <li key={review.id}>
                <div className="review-heading">
                  <span className="stars" role="img" aria-label={`${review.rating} out of 5 stars`}>
                    <span aria-hidden="true">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                  </span>
                  <time dateTime={review.updated_at}>Updated {dateFormatter.format(new Date(review.updated_at))}</time>
                </div>
                {review.comment ? <p>{review.comment}</p> : <p className="admin-review-no-comment">No written comment.</p>}
                <ReviewRemovalForm restroomId={listing.id} reviewId={review.id} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
