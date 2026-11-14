"use client";

import { trackEvent } from "@/lib/analytics";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import {
  createSubmission,
  type SubmissionFormState,
} from "@/app/submissions/new/actions";
import { SubmissionLocationPicker } from "@/app/ui/submission-location-picker";

const initialState: SubmissionFormState = { message: "", status: "idle" };

export function SubmissionForm() {
  const [state, formAction, pending] = useActionState(async (previous: SubmissionFormState, data: FormData) => {
    const result = await createSubmission(previous, data);
    trackEvent("form_result", { form: "submission", status: result.status === "success" ? "success" : "error" });
    return result;
  }, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.submissionId) formRef.current?.reset();
  }, [state.submissionId]);

  return (
    <form action={formAction} className="submission-form" ref={formRef}>
      <section aria-labelledby="submission-location-heading" className="submission-form-section">
        <div className="submission-form-heading">
          <p className="form-step">01</p>
          <div>
            <h2 id="submission-location-heading">Name and location</h2>
            <p>Give the editorial team enough information to find the restroom.</p>
          </div>
        </div>

        <label htmlFor="submission-name">Restroom or building name <span aria-hidden="true">*</span></label>
        <input id="submission-name" maxLength={200} name="name" required type="text" />

        <SubmissionLocationPicker key={state.submissionId ?? "new-submission"} />
      </section>

      <section aria-labelledby="submission-eligibility-heading" className="submission-form-section">
        <div className="submission-form-heading">
          <p className="form-step">02</p>
          <div>
            <h2 id="submission-eligibility-heading">City connection</h2>
            <p>Only city-operated restrooms or restrooms inside city-owned buildings are eligible.</p>
          </div>
        </div>

        <label htmlFor="submission-ownership">How do you know this location is eligible? <span aria-hidden="true">*</span></label>
        <textarea
          id="submission-ownership"
          maxLength={2_000}
          name="ownershipExplanation"
          placeholder="For example: inside a New York Public Library branch, or operated by NYC Parks"
          required
          rows={5}
        />
      </section>

      <section aria-labelledby="submission-details-heading" className="submission-form-section">
        <div className="submission-form-heading">
          <p className="form-step">03</p>
          <div>
            <h2 id="submission-details-heading">Helpful details</h2>
            <p>Everything in this section is optional. Share only what you know.</p>
          </div>
        </div>

        <div className="submission-field-grid">
          <div>
            <label htmlFor="submission-hours">Hours</label>
            <textarea id="submission-hours" maxLength={500} name="hours" rows={3} />
          </div>
          <div>
            <label htmlFor="submission-type">Restroom type</label>
            <input id="submission-type" maxLength={200} name="restroomType" type="text" />
          </div>
          <div>
            <label htmlFor="submission-accessibility">Accessibility notes</label>
            <textarea id="submission-accessibility" maxLength={1_000} name="accessibilityNotes" rows={3} />
          </div>
          <div>
            <label htmlFor="submission-changing">Changing-station notes</label>
            <textarea id="submission-changing" maxLength={1_000} name="changingStationNotes" rows={3} />
          </div>
        </div>

        <label htmlFor="submission-website">Official website</label>
        <input id="submission-website" maxLength={2_048} name="website" placeholder="https://" type="url" />

        <label htmlFor="submission-notes">Other details</label>
        <textarea id="submission-notes" maxLength={2_000} name="additionalNotes" rows={5} />
      </section>

      <div className="submission-form-footer">
        <p>
          Submitting sends this location to the editorial team as <strong>Pending</strong>.
          It will not appear on the public map unless an editor approves it.
        </p>

        {state.message ? (
          <div
            aria-live="polite"
            className={state.status === "error" ? "form-message form-message-error" : "form-message form-message-success"}
            role={state.status === "error" ? "alert" : "status"}
          >
            <p>{state.message}</p>
            {state.status === "success" ? (
              <Link className="text-link" href="/submissions">View My submissions →</Link>
            ) : null}
          </div>
        ) : null}

        <button disabled={pending} type="submit">
          {pending ? "Submitting..." : "Submit for review"}
        </button>
      </div>
    </form>
  );
}
