"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ArticleFormState = {
  articleId?: string;
  message: string;
  status: "idle" | "error" | "success";
};

export type DeleteArticleState = {
  message: string;
  status: "idle" | "error";
};

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWebUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function getAdminId() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const adminId = claimsData?.claims?.sub;

  if (!adminId) return { adminId: null, supabase };

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", adminId)
    .eq("role", "admin")
    .maybeSingle();

  return { adminId: role?.role === "admin" ? adminId : null, supabase };
}

export async function saveArticle(
  _previousState: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  const articleId = readText(formData, "articleId");
  const articleType = readText(formData, "articleType");
  const title = readText(formData, "title");
  const articleUrlInput = readText(formData, "url");
  const imageUrlInput = readText(formData, "imageUrl");
  const body = readText(formData, "body");

  if (!title || title.length > 200) {
    return { status: "error", message: "Enter a title of 200 characters or fewer." };
  }

  if (articleType !== "external" && articleType !== "internal") {
    return { status: "error", message: "Choose whether this is an internal or external article." };
  }

  let url: string | null = null;
  if (articleType === "external") {
    if (!articleUrlInput || articleUrlInput.length > 2_048) {
      return { status: "error", message: "Enter an article URL of 2,048 characters or fewer." };
    }
    url = normalizeWebUrl(articleUrlInput);
    if (!url) {
      return { status: "error", message: "Enter a complete http:// or https:// article URL." };
    }
  } else if (!body || body.length > 50_000) {
    return { status: "error", message: "Enter an article body of 50,000 characters or fewer." };
  }

  if (imageUrlInput.length > 2_048) {
    return { status: "error", message: "Keep the image URL to 2,048 characters or fewer." };
  }
  const imageUrl = imageUrlInput ? normalizeWebUrl(imageUrlInput) : null;
  if (imageUrlInput && !imageUrl) {
    return { status: "error", message: "Enter a complete http:// or https:// image URL, or leave it blank." };
  }

  const { adminId, supabase } = await getAdminId();
  if (!adminId) {
    return { status: "error", message: "Administrator access is required." };
  }

  const articleData = {
    article_type: articleType,
    body: articleType === "internal" ? body : null,
    image_url: imageUrl,
    title,
    url,
  };
  const query = articleId
    ? supabase.from("articles").update(articleData).eq("id", articleId)
    : supabase.from("articles").insert({ ...articleData, created_by: adminId });
  const { data, error } = await query.select("id").single();

  if (error || !data) {
    return {
      status: "error",
      message: `The article could not be ${articleId ? "updated" : "saved"}. Check the details and try again.`,
    };
  }

  revalidatePath("/journalism");
  revalidatePath("/journalism/published/[id]", "page");
  return {
    articleId: data.id,
    status: "success",
    message: articleId
      ? "Article updated. The changes now appear on the public journalism page."
      : "Article saved. It now appears on the public journalism page.",
  };
}

export async function deleteArticle(
  _previousState: DeleteArticleState,
  formData: FormData,
): Promise<DeleteArticleState> {
  const articleId = readText(formData, "articleId");
  if (!articleId) {
    return { status: "error", message: "The article could not be identified." };
  }

  const { adminId, supabase } = await getAdminId();
  if (!adminId) {
    return { status: "error", message: "Administrator access is required." };
  }

  const { error } = await supabase.from("articles").delete().eq("id", articleId);
  if (error) {
    return { status: "error", message: "The article could not be deleted. Try again." };
  }

  revalidatePath("/journalism");
  revalidatePath("/journalism/published/[id]", "page");
  return { status: "idle", message: "" };
}
