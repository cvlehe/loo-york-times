import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
  throw new Error("Supabase URL, publishable key, and service-role key are required");
}

const serviceApi = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const visitorApi = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createAuthenticatedUser(label, runId) {
  const email = `task-14-${label}-${runId}@example.invalid`;
  const password = `${randomUUID()}Aa1!`;
  const { data: userData, error: userError } = await serviceApi.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError) throw userError;

  const signInApi = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: sessionData, error: signInError } = await signInApi.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return {
    id: userData.user.id,
    client: createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } },
    }),
  };
}

const runId = randomUUID();
const createdUserIds = [];
let restroomId;
let reviewId;
let originalListing;

try {
  const { data: listing, error: listingError } = await serviceApi
    .from("restrooms")
    .select("id,name,additional_notes")
    .eq("publication_status", "published")
    .order("name")
    .limit(1)
    .single();
  if (listingError) throw listingError;
  restroomId = listing.id;
  originalListing = listing;

  const contributor = await createAuthenticatedUser("contributor", runId);
  const admin = await createAuthenticatedUser("admin", runId);
  createdUserIds.push(contributor.id, admin.id);

  const { error: roleError } = await serviceApi.from("user_roles").insert({
    user_id: admin.id,
    role: "admin",
  });
  if (roleError) throw roleError;

  const { data: review, error: reviewError } = await contributor.client
    .from("reviews")
    .insert({
      restroom_id: restroomId,
      contributor_id: contributor.id,
      rating: 5,
      comment: `Temporary Task 14 review ${runId}`,
    })
    .select("id")
    .single();
  if (reviewError) throw reviewError;
  reviewId = review.id;

  const { data: unauthorizedUpdate } = await contributor.client
    .from("restrooms")
    .update({ name: `Unauthorized Task 14 change ${runId}` })
    .eq("id", restroomId)
    .select("id")
    .maybeSingle();
  assert.equal(unauthorizedUpdate, null);

  const { data: unauthorizedRemoval } = await contributor.client
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .select("id")
    .maybeSingle();
  assert.equal(unauthorizedRemoval, null);

  const maintainedName = `Task 14 maintained listing ${runId}`;
  const { data: maintainedListing, error: maintenanceError } = await admin.client
    .from("restrooms")
    .update({ name: maintainedName, additional_notes: "Temporary Task 14 maintenance verification" })
    .eq("id", restroomId)
    .eq("publication_status", "published")
    .select("id,name")
    .single();
  if (maintenanceError) throw maintenanceError;
  assert.equal(maintainedListing.name, maintainedName);

  const { data: publicListing, error: publicListingError } = await visitorApi
    .from("restrooms")
    .select("name,additional_notes")
    .eq("id", restroomId)
    .single();
  if (publicListingError) throw publicListingError;
  assert.equal(publicListing.name, maintainedName);
  assert.equal(publicListing.additional_notes, "Temporary Task 14 maintenance verification");

  const { count: countBeforeRemoval, error: beforeCountError } = await visitorApi
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("restroom_id", restroomId);
  if (beforeCountError) throw beforeCountError;

  const { data: removedReview, error: removalError } = await admin.client
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("restroom_id", restroomId)
    .select("id")
    .single();
  if (removalError) throw removalError;
  assert.equal(removedReview.id, reviewId);
  reviewId = undefined;

  const { data: publicReviews, count: countAfterRemoval, error: publicReviewError } = await visitorApi
    .from("reviews")
    .select("id,rating", { count: "exact" })
    .eq("restroom_id", restroomId);
  if (publicReviewError) throw publicReviewError;
  assert.equal(publicReviews.some(({ id }) => id === removedReview.id), false);
  assert.equal(countAfterRemoval, (countBeforeRemoval ?? 1) - 1);

  console.log(JSON.stringify({
    ordinaryUserListingUpdateDenied: "passed",
    ordinaryUserReviewRemovalDenied: "passed",
    adminListingMaintenance: "passed",
    publicListingRefreshData: "passed",
    adminReviewRemoval: "passed",
    publicRatingCountAfterRemoval: countAfterRemoval,
  }, null, 2));
} finally {
  if (reviewId) await serviceApi.from("reviews").delete().eq("id", reviewId);
  if (restroomId && originalListing) {
    await serviceApi
      .from("restrooms")
      .update({ name: originalListing.name, additional_notes: originalListing.additional_notes })
      .eq("id", restroomId);
  }
  if (createdUserIds.length > 0) {
    await serviceApi.from("user_roles").delete().in("user_id", createdUserIds);
    for (const userId of createdUserIds) await serviceApi.auth.admin.deleteUser(userId);
  }
}
