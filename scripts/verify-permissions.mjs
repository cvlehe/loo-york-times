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

function authenticatedClient(accessToken) {
  return createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function createTestUser(label, runId) {
  const password = `${randomUUID()}Aa1!`;
  const email = `task-05-${label}-${runId}@example.invalid`;
  const { data, error } = await adminApi.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const signInClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: sessionData, error: signInError } = await signInClient.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client: authenticatedClient(sessionData.session.access_token) };
}

const runId = randomUUID();
const createdUserIds = [];
let testRestroomId;
let firstSubmissionId;
let secondSubmissionId;

try {
  const owner = await createTestUser("owner", runId);
  const otherOwner = await createTestUser("other", runId);
  const admin = await createTestUser("admin", runId);
  createdUserIds.push(owner.id, otherOwner.id, admin.id);

  const { error: roleError } = await adminApi.from("user_roles").insert({ user_id: admin.id, role: "admin" });
  if (roleError) throw roleError;

  const { data: restroom, error: restroomError } = await adminApi
    .from("restrooms")
    .insert({
      name: `Task 05 permission probe ${runId}`,
      latitude: 40.7128,
      longitude: -74.006,
      eligibility: "eligible",
      eligibility_evidence: "Temporary automated permission verification record",
      eligibility_reviewed_by: admin.id,
      eligibility_reviewed_at: new Date().toISOString(),
      publication_status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (restroomError) throw restroomError;
  testRestroomId = restroom.id;

  const { data: submissions, error: submissionsError } = await adminApi
    .from("submissions")
    .insert([
      {
        contributor_id: owner.id,
        name: `Owner submission ${runId}`,
        address_text: "Temporary test address",
        city_ownership_explanation: "Temporary permission verification",
      },
      {
        contributor_id: otherOwner.id,
        name: `Other submission ${runId}`,
        address_text: "Temporary test address",
        city_ownership_explanation: "Temporary permission verification",
      },
    ])
    .select("id,contributor_id");
  if (submissionsError) throw submissionsError;
  firstSubmissionId = submissions.find((row) => row.contributor_id === owner.id).id;
  secondSubmissionId = submissions.find((row) => row.contributor_id === otherOwner.id).id;

  const { data: ownerSubmissions, error: ownerReadError } = await owner.client
    .from("submissions")
    .select("id,contributor_id");
  if (ownerReadError) throw ownerReadError;
  assert.deepEqual(ownerSubmissions.map((row) => row.id), [firstSubmissionId]);

  const { data: forbiddenUpdate, error: forbiddenUpdateError } = await owner.client
    .from("submissions")
    .update({ additional_notes: "Unauthorized update probe" })
    .eq("id", secondSubmissionId)
    .select("id");
  if (forbiddenUpdateError) throw forbiddenUpdateError;
  assert.deepEqual(forbiddenUpdate, []);

  const { error: reviewError } = await owner.client.from("reviews").insert({
    restroom_id: testRestroomId,
    contributor_id: owner.id,
    rating: 5,
    comment: "Temporary permission verification",
  });
  if (reviewError) throw reviewError;

  const { data: forbiddenReviewEdit, error: forbiddenReviewEditError } = await otherOwner.client
    .from("reviews")
    .update({ rating: 1 })
    .eq("restroom_id", testRestroomId)
    .select("id");
  if (forbiddenReviewEditError) throw forbiddenReviewEditError;
  assert.deepEqual(forbiddenReviewEdit, []);

  const { data: adminListingUpdate, error: adminListingError } = await admin.client
    .from("restrooms")
    .update({ additional_notes: "Administrator permission verified" })
    .eq("id", testRestroomId)
    .select("id");
  if (adminListingError) throw adminListingError;
  assert.equal(adminListingUpdate.length, 1);

  const { data: adminReviewRemoval, error: adminReviewRemovalError } = await admin.client
    .from("reviews")
    .delete()
    .eq("restroom_id", testRestroomId)
    .select("id");
  if (adminReviewRemovalError) throw adminReviewRemovalError;
  assert.equal(adminReviewRemoval.length, 1);

  console.log(JSON.stringify({
    ownerSubmissionIsolation: "passed",
    ordinarySubmissionUpdateDenied: "passed",
    otherOwnerReviewEditDenied: "passed",
    adminListingUpdate: "passed",
    adminReviewRemoval: "passed",
  }, null, 2));
} finally {
  if (firstSubmissionId || secondSubmissionId) {
    await adminApi.from("submissions").delete().in("id", [firstSubmissionId, secondSubmissionId].filter(Boolean));
  }
  if (testRestroomId) {
    await adminApi.from("reviews").delete().eq("restroom_id", testRestroomId);
    await adminApi.from("restrooms").delete().eq("id", testRestroomId);
  }
  if (createdUserIds.length > 0) {
    await adminApi.from("user_roles").delete().in("user_id", createdUserIds);
    for (const userId of createdUserIds) {
      await adminApi.auth.admin.deleteUser(userId);
    }
  }
}
