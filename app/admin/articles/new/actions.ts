"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ArticleFormState = {
  articleId?: string;
  message: string;
  status: "idle" | "error" | "success";
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

export async function createArticle(
  _previousState: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  const title = readText(formData, "title");
  const articleUrlInput = readText(formData, "url");
  const imageUrlInput = readText(formData, "imageUrl");

  if (!title || title.length > 200) {
    return { status: "error", message: "Enter a title of 200 characters or fewer." };
  }

  if (!articleUrlInput || articleUrlInput.length > 2_048) {
    return { status: "error", message: "Enter an article URL of 2,048 characters or fewer." };
  }
  const url = normalizeWebUrl(articleUrlInput);
  if (!url) {
    return { status: "error", message: "Enter a complete http:// or https:// article URL." };
  }

  if (imageUrlInput.length > 2_048) {
    return { status: "error", message: "Keep the image URL to 2,048 characters or fewer." };
  }
  const imageUrl = imageUrlInput ? normalizeWebUrl(imageUrlInput) : null;
  if (imageUrlInput && !imageUrl) {
    return { status: "error", message: "Enter a complete http:// or https:// image URL, or leave it blank." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const adminId = claimsData?.claims?.sub;
  if (!adminId) {
    return { status: "error", message: "Your sign-in has expired. Sign in again to continue." };
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", adminId)
    .eq("role", "admin")
    .maybeSingle();
  if (role?.role !== "admin") {
    return { status: "error", message: "Administrator access is required." };
  }

  const { data, error } = await supabase
    .from("articles")
    .insert({ created_by: adminId, image_url: imageUrl, title, url })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: "The article could not be added. Check the details and try again." };
  }

  revalidatePath("/journalism");
  return {
    articleId: data.id,
    status: "success",
    message: "Article added. It now appears on the public journalism page.",
  };
}
