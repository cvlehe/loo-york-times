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

async function createAuthenticatedUser(label, runId) {
  const email = `task-13-${label}-${runId}@example.invalid`;
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
const submissionIds = [];
let publishedRestroomId;

try {
  const contributor = await createAuthenticatedUser("contributor", runId);
  const admin = await createAuthenticatedUser("admin", runId);
  createdUserIds.push(contributor.id, admin.id);

  const { error: roleError } = await serviceApi.from("user_roles").insert({
    user_id: admin.id,
    role: "admin",
  });
  if (roleError) throw roleError;

  const { data: submissions, error: submissionError } = await serviceApi
    .from("submissions")
    .insert([
      {
        contributor_id: contributor.id,
        name: `Task 13 approval ${runId}`,
        address_text: "Temporary approval verification address",
        latitude: 40.7128,
        longitude: -74.006,
        city_ownership_explanation: "Temporary Task 13 eligibility verification",
      },
      {
        contributor_id: contributor.id,
        name: `Task 13 rejection ${runId}`,
        address_text: "Temporary rejection verification address",
        city_ownership_explanation: "Temporary Task 13 eligibility verification",
      },
    ])
    .select("id")
    .order("created_at");
  if (submissionError) throw submissionError;
  submissionIds.push(...submissions.map(({ id }) => id));

  const approvalArguments = {
    p_submission_id: submissionIds[0],
    p_name: `Task 13 approved listing ${runId}`,
    p_address_text: "Temporary approval verification address",
    p_latitude: 40.7128,
    p_longitude: -74.006,
    p_city_ownership_explanation: "Temporary Task 13 eligibility verification",
    p_hours_text: "Verification only",
    p_restroom_type: "Verification only",
    p_accessibility_notes: "Verification only",
    p_changing_station_notes: "Verification only",
    p_additional_notes: "Temporary record; safe to remove",
    p_website_url: "",
  };

  const { error: nonAdminApprovalError } = await contributor.client
    .rpc("approve_submission", approvalArguments);
  assert.equal(nonAdminApprovalError?.code, "42501");

  const { data: firstApproval, error: firstApprovalError } = await admin.client
    .rpc("approve_submission", approvalArguments);
  if (firstApprovalError) throw firstApprovalError;
  publishedRestroomId = firstApproval;

  const { data: retryApproval, error: retryApprovalError } = await admin.client
    .rpc("approve_submission", approvalArguments);
  if (retryApprovalError) throw retryApprovalError;
  assert.equal(retryApproval, publishedRestroomId);

  const { count: approvedListingCount, error: countError } = await serviceApi
    .from("restrooms")
    .select("id", { count: "exact", head: true })
    .eq("id", publishedRestroomId);
  if (countError) throw countError;
  assert.equal(approvedListingCount, 1);

  const rejectionTime = new Date().toISOString();
  const { data: rejectedSubmission, error: rejectionError } = await admin.client
    .from("submissions")
    .update({
      status: "rejected",
      rejection_reason: "Temporary Task 13 rejection verification",
      duplicate_restroom_id: publishedRestroomId,
      reviewed_by: admin.id,
      reviewed_at: rejectionTime,
    })
    .eq("id", submissionIds[1])
    .eq("status", "pending")
    .select("id")
    .single();
  if (rejectionError) throw rejectionError;
  assert.equal(rejectedSubmission.id, submissionIds[1]);

  const { data: ownerView, error: ownerViewError } = await contributor.client
    .from("submissions")
    .select("id,status,rejection_reason,duplicate_restroom_id,published_restroom_id")
    .in("id", submissionIds);
  if (ownerViewError) throw ownerViewError;
  assert.equal(ownerView.length, 2);
  assert.equal(ownerView.find(({ id }) => id === submissionIds[0])?.status, "approved");
  assert.equal(ownerView.find(({ id }) => id === submissionIds[0])?.published_restroom_id, publishedRestroomId);
  assert.equal(ownerView.find(({ id }) => id === submissionIds[1])?.status, "rejected");
  assert.equal(ownerView.find(({ id }) => id === submissionIds[1])?.duplicate_restroom_id, publishedRestroomId);

  const { count: rejectedListingCount, error: rejectedCountError } = await serviceApi
    .from("restrooms")
    .select("id", { count: "exact", head: true })
    .eq("name", `Task 13 rejection ${runId}`);
  if (rejectedCountError) throw rejectedCountError;
  assert.equal(rejectedListingCount, 0);

  console.log(JSON.stringify({
    nonAdminApprovalDenied: "passed",
    approvalCreatedExactlyOneListing: "passed",
    approvalRetryReturnedSameListing: "passed",
    rejectionCreatedNoListing: "passed",
    contributorDecisionVisibility: "passed",
  }, null, 2));
} finally {
  if (submissionIds.length > 0) {
    await serviceApi.from("submissions").delete().in("id", submissionIds);
  }
  if (publishedRestroomId) {
    await serviceApi.from("restrooms").delete().eq("id", publishedRestroomId);
  }
  if (createdUserIds.length > 0) {
    await serviceApi.from("user_roles").delete().in("user_id", createdUserIds);
    for (const userId of createdUserIds) {
      await serviceApi.auth.admin.deleteUser(userId);
    }
  }
}
