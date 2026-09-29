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

const adminApi = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const visitorApi = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const runId = randomUUID();
const email = `task-10-review-${runId}@example.invalid`;
const password = `${randomUUID()}Aa1!`;
let testUserId;
let restroomId;

try {
  const { data: restroom, error: restroomError } = await adminApi
    .from("restrooms")
    .select("id")
    .eq("publication_status", "published")
    .order("name")
    .limit(1)
    .single();
  if (restroomError) throw restroomError;
  restroomId = restroom.id;

  const { count: baselineCount, error: baselineError } = await visitorApi
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("restroom_id", restroomId);
  if (baselineError) throw baselineError;

  const { data: userData, error: userError } = await adminApi.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError) throw userError;
  testUserId = userData.user.id;

  const signInApi = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: sessionData, error: signInError } = await signInApi.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const contributorApi = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } },
  });

  const { error: insertError } = await contributorApi.from("reviews").insert({
    restroom_id: restroomId,
    contributor_id: testUserId,
    rating: 5,
    comment: "Temporary Task 10 review verification",
  });
  if (insertError) throw insertError;

  const { error: updateError } = await contributorApi
    .from("reviews")
    .update({ rating: 2, comment: "Temporary Task 10 edit verification" })
    .eq("restroom_id", restroomId)
    .eq("contributor_id", testUserId);
  if (updateError) throw updateError;

  const { data: ownReviews, error: ownReviewError } = await contributorApi
    .from("reviews")
    .select("rating, comment")
    .eq("restroom_id", restroomId)
    .eq("contributor_id", testUserId);
  if (ownReviewError) throw ownReviewError;
  assert.equal(ownReviews.length, 1);
  assert.equal(ownReviews[0].rating, 2);
  assert.equal(ownReviews[0].comment, "Temporary Task 10 edit verification");

  const { error: duplicateError } = await contributorApi.from("reviews").insert({
    restroom_id: restroomId,
    contributor_id: testUserId,
    rating: 4,
  });
  assert.equal(duplicateError?.code, "23505");

  const { data: publicReviews, count: finalCount, error: publicReadError } = await visitorApi
    .from("reviews")
    .select("rating, comment, updated_at", { count: "exact" })
    .eq("restroom_id", restroomId);
  if (publicReadError) throw publicReadError;
  assert.equal(finalCount, (baselineCount ?? 0) + 1);
  assert.equal(
    publicReviews.filter((review) => review.comment === "Temporary Task 10 edit verification").length,
    1,
  );

  console.log(JSON.stringify({
    createReview: "passed",
    editReview: "passed",
    duplicateReviewDenied: "passed",
    publicRead: "passed",
    countAfterEdit: finalCount,
  }, null, 2));
} finally {
  if (testUserId && restroomId) {
    await adminApi
      .from("reviews")
      .delete()
      .eq("restroom_id", restroomId)
      .eq("contributor_id", testUserId);
  }
  if (testUserId) await adminApi.auth.admin.deleteUser(testUserId);
}
