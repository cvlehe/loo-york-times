"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { reviewSubmission, type AdminReviewState } from "@/app/admin/actions";

export type AdminSubmission = {
  accessibility_notes: string | null;
  additional_notes: string | null;
  address_text: string | null;
  changing_station_notes: string | null;
  city_ownership_explanation: string;
  created_at: string;
  hours_text: string | null;
  id: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  restroom_type: string | null;
  website_url: string | null;
};

export type PublishedRestroomOption = { id: string; name: string };

const initialState: AdminReviewState = { status: "idle", message: "" };
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "America/New_York",
});

function ReviewButtons() {
  const { data, pending } = useFormStatus();
  const activeDecision = pending ? data?.get("decision") : null;

  return (
    <div className="admin-review-actions">
      <button disabled={pending} name="decision" type="submit" value="save">
        {activeDecision === "save" ? "Saving..." : "Save corrections"}
      </button>
      <button className="admin-approve-button" disabled={pending} name="decision" type="submit" value="approve">
        {activeDecision === "approve" ? "Publishing..." : "Approve and publish"}
      </button>
      <button className="admin-reject-button" disabled={pending} name="decision" type="submit" value="reject">
        {activeDecision === "reject" ? "Rejecting..." : "Reject submission"}
      </button>
    </div>
  );
}

export function AdminSubmissionReview({
  submission,
  publishedRestrooms,
}: {
  submission: AdminSubmission;
  publishedRestrooms: PublishedRestroomOption[];
}) {
  const [state, formAction] = useActionState(reviewSubmission, initialState);

  return (
    <article className="admin-review-card">
      <header className="admin-review-card-header">
        <div>
          <p className="submission-card-label">Submitted {dateFormatter.format(new Date(submission.created_at))}</p>
          <h2>{submission.name}</h2>
        </div>
        <p className="submission-status submission-status-pending">Pending</p>
      </header>

      <form action={formAction} className="admin-review-form">
        <input name="submissionId" type="hidden" value={submission.id} />

        <div className="admin-review-grid">
          <div className="admin-review-wide">
            <label htmlFor={`name-${submission.id}`}>Listing name</label>
            <input defaultValue={submission.name} id={`name-${submission.id}`} maxLength={200} name="name" required />
          </div>
          <div className="admin-review-wide">
            <label htmlFor={`address-${submission.id}`}>Address or location</label>
            <textarea defaultValue={submission.address_text ?? ""} id={`address-${submission.id}`} maxLength={500} name="address" rows={2} />
          </div>
          <div>
            <label htmlFor={`latitude-${submission.id}`}>Latitude</label>
            <input defaultValue={submission.latitude ?? ""} id={`latitude-${submission.id}`} max="90" min="-90" name="latitude" step="any" type="number" />
          </div>
          <div>
            <label htmlFor={`longitude-${submission.id}`}>Longitude</label>
            <input defaultValue={submission.longitude ?? ""} id={`longitude-${submission.id}`} max="180" min="-180" name="longitude" step="any" type="number" />
          </div>
          <div className="admin-review-wide">
            <label htmlFor={`ownership-${submission.id}`}>Eligibility evidence</label>
            <textarea defaultValue={submission.city_ownership_explanation} id={`ownership-${submission.id}`} maxLength={2_000} name="ownershipExplanation" required rows={4} />
          </div>
          <div>
            <label htmlFor={`hours-${submission.id}`}>Hours</label>
            <textarea defaultValue={submission.hours_text ?? ""} id={`hours-${submission.id}`} maxLength={500} name="hours" rows={3} />
          </div>
          <div>
            <label htmlFor={`type-${submission.id}`}>Restroom type</label>
            <input defaultValue={submission.restroom_type ?? ""} id={`type-${submission.id}`} maxLength={200} name="restroomType" />
          </div>
          <div>
            <label htmlFor={`accessibility-${submission.id}`}>Accessibility notes</label>
            <textarea defaultValue={submission.accessibility_notes ?? ""} id={`accessibility-${submission.id}`} maxLength={1_000} name="accessibilityNotes" rows={3} />
          </div>
          <div>
            <label htmlFor={`changing-${submission.id}`}>Changing-station notes</label>
            <textarea defaultValue={submission.changing_station_notes ?? ""} id={`changing-${submission.id}`} maxLength={1_000} name="changingStationNotes" rows={3} />
          </div>
          <div className="admin-review-wide">
            <label htmlFor={`website-${submission.id}`}>Official website</label>
            <input defaultValue={submission.website_url ?? ""} id={`website-${submission.id}`} maxLength={2_048} name="website" type="url" />
          </div>
          <div className="admin-review-wide">
            <label htmlFor={`notes-${submission.id}`}>Additional notes</label>
            <textarea defaultValue={submission.additional_notes ?? ""} id={`notes-${submission.id}`} maxLength={2_000} name="additionalNotes" rows={4} />
          </div>
        </div>

        <section className="admin-rejection-panel" aria-labelledby={`reject-heading-${submission.id}`}>
          <h3 id={`reject-heading-${submission.id}`}>Rejection details</h3>
          <p>Required only when rejecting. Choose a listing when this is a duplicate.</p>
          <label htmlFor={`reason-${submission.id}`}>Reason shown to contributor</label>
          <textarea id={`reason-${submission.id}`} maxLength={1_000} name="rejectionReason" rows={3} />
          <label htmlFor={`duplicate-${submission.id}`}>Existing listing <span>(optional)</span></label>
          <select defaultValue="" id={`duplicate-${submission.id}`} name="duplicateRestroomId">
            <option value="">Not a duplicate</option>
            {publishedRestrooms.map((restroom) => (
              <option key={restroom.id} value={restroom.id}>{restroom.name}</option>
            ))}
          </select>
        </section>

        {state.message ? (
          <div
            aria-live="polite"
            className={`form-message ${state.status === "error" ? "form-message-error" : "form-message-success"}`}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </div>
        ) : null}

        <ReviewButtons />
      </form>
    </article>
  );
}

