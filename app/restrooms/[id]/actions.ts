"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ReviewFormState = {
  message: string;
  status: "idle" | "error" | "success";
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function saveReview(
  restroomId: string,
  _previousState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  if (!uuidPattern.test(restroomId)) {
    return { status: "error", message: "This restroom listing is not valid." };
  }

  const rawRating = formData.get("rating");
  const rawComment = formData.get("comment");
  const rating = typeof rawRating === "string" ? Number(rawRating) : Number.NaN;
  const comment = typeof rawComment === "string" ? rawComment.trim() : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: "error", message: "Choose a rating from 1 to 5 stars." };
  }

  if (comment.length > 2_000) {
    return { status: "error", message: "Keep your comment to 2,000 characters or fewer." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const contributorId = claimsData?.claims?.sub;

  if (!contributorId) {
    return { status: "error", message: "Your sign-in has expired. Sign in again to save your review." };
  }

  const { data: restroom, error: restroomError } = await supabase
    .from("restrooms")
    .select("id")
    .eq("id", restroomId)
    .eq("publication_status", "published")
    .maybeSingle();

  if (restroomError || !restroom) {
    return { status: "error", message: "This published restroom could not be found." };
  }

  const { data: existingReview, error: existingReviewError } = await supabase
    .from("reviews")
    .select("id")
    .eq("restroom_id", restroomId)
    .eq("contributor_id", contributorId)
    .maybeSingle();

  if (existingReviewError) {
    return { status: "error", message: "Your review could not be checked. Please try again." };
  }

  const reviewValues = { rating, comment: comment || null };

  if (existingReview) {
    const { error } = await supabase
      .from("reviews")
      .update(reviewValues)
      .eq("id", existingReview.id)
      .eq("contributor_id", contributorId)
      .eq("restroom_id", restroomId);

    if (error) {
      return { status: "error", message: "Your changes could not be saved. Please try again." };
    }

    revalidatePath(`/restrooms/${restroomId}`);
    return { status: "success", message: "Your review has been updated." };
  }

  const { error: insertError } = await supabase.from("reviews").insert({
    contributor_id: contributorId,
    restroom_id: restroomId,
    ...reviewValues,
  });

  if (insertError?.code === "23505") {
    const { error: retryError } = await supabase
      .from("reviews")
      .update(reviewValues)
      .eq("contributor_id", contributorId)
      .eq("restroom_id", restroomId);

    if (!retryError) {
      revalidatePath(`/restrooms/${restroomId}`);
      return { status: "success", message: "Your review has been updated." };
    }
  }

  if (insertError) {
    return { status: "error", message: "Your review could not be published. Please try again." };
  }

  revalidatePath(`/restrooms/${restroomId}`);
  return { status: "success", message: "Your review has been published." };
}
