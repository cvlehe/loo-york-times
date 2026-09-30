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

const { error: articlesProbeError } = await serviceApi
  .from("articles")
  .select("id")
  .limit(0);
if (articlesProbeError?.code === "PGRST205") {
  throw new Error(
    "The live Supabase project is missing public.articles. Apply 20260930120000_create_articles.sql before running this check.",
  );
}
if (articlesProbeError) throw articlesProbeError;

async function createAuthenticatedUser(label, runId) {
  const email = `task-15-${label}-${runId}@example.invalid`;
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
const createdArticleIds = [];
const createdUserIds = [];

try {
  const contributor = await createAuthenticatedUser("contributor", runId);
  const admin = await createAuthenticatedUser("admin", runId);
  createdUserIds.push(contributor.id, admin.id);

  const { error: roleError } = await serviceApi.from("user_roles").insert({
    user_id: admin.id,
    role: "admin",
  });
  if (roleError) throw roleError;

  const { error: unauthorizedError } = await contributor.client.from("articles").insert({
    created_by: contributor.id,
    title: `Unauthorized Task 15 article ${runId}`,
    url: "https://example.com/unauthorized",
  });
  assert(unauthorizedError, "An ordinary user unexpectedly created an article");

  const fixtures = [
    {
      created_by: admin.id,
      title: `Task 15 article without image ${runId}`,
      url: "https://example.com/article-without-image",
      image_url: null,
    },
    {
      created_by: admin.id,
      title: `Task 15 article with image ${runId}`,
      url: "https://example.com/article-with-image",
      image_url: "https://example.com/article-image.jpg",
    },
  ];

  const { data: articles, error: insertError } = await admin.client
    .from("articles")
    .insert(fixtures)
    .select("id,title,url,image_url");
  if (insertError) throw insertError;
  assert.equal(articles.length, 2);
  createdArticleIds.push(...articles.map(({ id }) => id));

  const { data: publicArticles, error: publicError } = await visitorApi
    .from("articles")
    .select("id,title,url,image_url")
    .in("id", createdArticleIds);
  if (publicError) throw publicError;
  assert.equal(publicArticles.length, 2);
  assert(publicArticles.some(({ image_url: imageUrl }) => imageUrl === null));
  assert(publicArticles.some(({ image_url: imageUrl }) => imageUrl === "https://example.com/article-image.jpg"));

  console.log(JSON.stringify({
    ordinaryUserCreationDenied: "passed",
    adminCreation: "passed",
    publicArticleReading: "passed",
    optionalImage: "passed",
  }, null, 2));
} finally {
  if (createdArticleIds.length > 0) await serviceApi.from("articles").delete().in("id", createdArticleIds);
  if (createdUserIds.length > 0) {
    await serviceApi.from("user_roles").delete().in("user_id", createdUserIds);
    for (const userId of createdUserIds) await serviceApi.auth.admin.deleteUser(userId);
  }
}
