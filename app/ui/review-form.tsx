"use client";

import { useActionState } from "react";

import { trackEvent } from "@/lib/analytics";

import { saveReview, type ReviewFormState } from "@/app/restrooms/[id]/actions";

type EditableReview = {
  comment: string | null;
  rating: number;
};

const initialState: ReviewFormState = { message: "", status: "idle" };

export function ReviewForm({
  initialReview,
  restroomId,
}: {
  initialReview: EditableReview | null;
  restroomId: string;
}) {
  const saveReviewForRestroom = saveReview.bind(null, restroomId);
  const [state, formAction, pending] = useActionState(async (previous: ReviewFormState, data: FormData) => {
    const result = await saveReviewForRestroom(previous, data);
    trackEvent("form_result", { form: "review", status: result.status === "success" ? "success" : "error" });
    return result;
  }, initialState);

  return (
    <form action={formAction} className="review-form">
      <fieldset>
        <legend>{initialReview ? "Edit your rating" : "Your rating"}</legend>
        <div className="review-rating-options">
          {[1, 2, 3, 4, 5].map((rating) => (
            <label key={rating}>
              <input
                defaultChecked={initialReview?.rating === rating}
                name="rating"
                required
                type="radio"
                value={rating}
              />
              <span aria-hidden="true" className="rating-choice">{rating} ★</span>
              <span className="visually-hidden">{rating} out of 5 stars</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor="review-comment">Comment <span>(optional)</span></label>
      <textarea
        defaultValue={initialReview?.comment ?? ""}
        id="review-comment"
        maxLength={2_000}
        name="comment"
        placeholder="Share practical details that could help the next visitor."
        rows={5}
      />
      <p className="review-form-note">Your rating and comment publish immediately. You can return here to edit them.</p>

      {state.message ? (
        <p
          aria-live="polite"
          className={state.status === "error" ? "form-message form-message-error" : "form-message form-message-success"}
        >
          {state.message}
        </p>
      ) : null}

      <button disabled={pending} type="submit">
        {pending ? "Saving..." : initialReview ? "Save changes" : "Publish review"}
      </button>
    </form>
  );
}
