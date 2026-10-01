"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AdminPermissionState = {
  message: string;
  status: "idle" | "error" | "success";
};

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validEmail(email: string) {
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function manageAdmin(
  _previousState: AdminPermissionState,
  formData: FormData,
): Promise<AdminPermissionState> {
  const email = readText(formData, "email").toLowerCase();
  const operation = readText(formData, "operation");

  if (!validEmail(email) || (operation !== "grant" && operation !== "revoke")) {
    return { status: "error", message: "Enter a valid email address and try again." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) {
    return { status: "error", message: "Your sign-in has expired. Sign in again to continue." };
  }

  const rpc = operation === "grant" ? "grant_admin_by_email" : "revoke_admin_by_email";
  const { data, error } = await supabase.rpc(rpc, { p_email: email });

  if (error) {
    const message = error.message === "No account exists for that email address."
      ? "No account exists for that email address. Ask them to sign in first."
      : error.message === "That account is not an administrator."
        ? "That account is not an administrator."
        : error.message === "You cannot remove your own administrator access."
          ? error.message
          : error.message === "You already have administrator access."
            ? error.message
            : error.message === "At least one administrator must remain."
              ? error.message
              : "The administrator permissions could not be updated. Try again.";
    return { status: "error", message };
  }

  revalidatePath("/admin");
  if (operation === "grant" && data === "already_admin") {
    return { status: "success", message: `${email} already has administrator access.` };
  }

  return {
    status: "success",
    message: operation === "grant"
      ? `${email} can now access the administrator section.`
      : `${email} no longer has administrator access.`,
  };
}
