"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type AdminReviewState = {
  message: string;
  status: "idle" | "error" | "success";
};

type SubmissionValues = {
  accessibilityNotes: string;
  additionalNotes: string;
  address: string;
  changingStationNotes: string;
  hours: string;
  latitude: number | null;
  longitude: number | null;
  name: string;
  ownershipExplanation: string;
  restroomType: string;
  website: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseCoordinate(value: string, minimum: number, maximum: number) {
  if (!value) return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : Number.NaN;
}

function readSubmissionValues(formData: FormData): SubmissionValues | AdminReviewState {
  const values: SubmissionValues = {
    name: readText(formData, "name"),
    address: readText(formData, "address"),
    latitude: parseCoordinate(readText(formData, "latitude"), -90, 90),
    longitude: parseCoordinate(readText(formData, "longitude"), -180, 180),
    ownershipExplanation: readText(formData, "ownershipExplanation"),
    hours: readText(formData, "hours"),
    restroomType: readText(formData, "restroomType"),
    accessibilityNotes: readText(formData, "accessibilityNotes"),
    changingStationNotes: readText(formData, "changingStationNotes"),
    additionalNotes: readText(formData, "additionalNotes"),
    website: readText(formData, "website"),
  };

  if (!values.name || values.name.length > 200) {
    return { status: "error", message: "Enter a restroom name of 200 characters or fewer." };
  }
  if (values.address.length > 500) {
    return { status: "error", message: "Keep the address to 500 characters or fewer." };
  }
  if (Number.isNaN(values.latitude) || Number.isNaN(values.longitude)) {
    return { status: "error", message: "Enter valid latitude and longitude coordinates." };
  }
  if ((values.latitude === null) !== (values.longitude === null)) {
    return { status: "error", message: "Enter both coordinates, or leave both blank." };
  }
  if (!values.address && values.latitude === null) {
    return { status: "error", message: "Enter an address or a coordinate pair." };
  }
  if (!values.ownershipExplanation || values.ownershipExplanation.length > 2_000) {
    return { status: "error", message: "Enter eligibility evidence of 2,000 characters or fewer." };
  }

  const limitedFields = [
    [values.hours, 500],
    [values.restroomType, 200],
    [values.accessibilityNotes, 1_000],
    [values.changingStationNotes, 1_000],
    [values.additionalNotes, 2_000],
  ] as const;
  if (limitedFields.some(([value, limit]) => value.length > limit)) {
    return { status: "error", message: "One of the corrected details exceeds its field limit." };
  }

  if (values.website) {
    if (values.website.length > 2_048) {
      return { status: "error", message: "Keep the website address to 2,048 characters or fewer." };
    }
    try {
      const website = new URL(values.website);
      if (!['http:', 'https:'].includes(website.protocol)) throw new Error();
      values.website = website.toString();
    } catch {
      return { status: "error", message: "Enter a complete http:// or https:// website address." };
    }
  }

  return values;
}

function isReviewState(value: SubmissionValues | AdminReviewState): value is AdminReviewState {
  return "status" in value;
}

export async function reviewSubmission(
  _previousState: AdminReviewState,
  formData: FormData,
): Promise<AdminReviewState> {
  const submissionId = readText(formData, "submissionId");
  const decision = readText(formData, "decision");

  if (!uuidPattern.test(submissionId) || !["save", "approve", "reject"].includes(decision)) {
    return { status: "error", message: "This review request is not valid." };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const reviewerId = claimsData?.claims?.sub;
  if (!reviewerId) {
    return { status: "error", message: "Your sign-in has expired. Sign in again to continue." };
  }

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", reviewerId)
    .eq("role", "admin")
    .maybeSingle();
  if (role?.role !== "admin") {
    return { status: "error", message: "Administrator access is required." };
  }

  if (decision === "reject") {
    const rejectionReason = readText(formData, "rejectionReason");
    const duplicateRestroomId = readText(formData, "duplicateRestroomId");
    if (!rejectionReason || rejectionReason.length > 1_000) {
      return { status: "error", message: "Enter a rejection reason of 1,000 characters or fewer." };
    }
    if (duplicateRestroomId && !uuidPattern.test(duplicateRestroomId)) {
      return { status: "error", message: "Choose a valid existing listing." };
    }
    if (duplicateRestroomId) {
      const { data: duplicate } = await supabase
        .from("restrooms")
        .select("id")
        .eq("id", duplicateRestroomId)
        .eq("publication_status", "published")
        .maybeSingle();
      if (!duplicate) {
        return { status: "error", message: "The selected duplicate is not a published listing." };
      }
    }

    const { data, error } = await supabase
      .from("submissions")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason,
        duplicate_restroom_id: duplicateRestroomId || null,
        published_restroom_id: null,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submissionId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { status: "error", message: "This submission could not be rejected. It may already have been decided." };
    }

    revalidatePath("/admin");
    revalidatePath("/submissions");
    return { status: "success", message: "Submission rejected. The contributor can now see the decision." };
  }

  const values = readSubmissionValues(formData);
  if (isReviewState(values)) return values;

  if (decision === "save") {
    const { data, error } = await supabase
      .from("submissions")
      .update({
        name: values.name,
        address_text: values.address || null,
        latitude: values.latitude,
        longitude: values.longitude,
        city_ownership_explanation: values.ownershipExplanation,
        hours_text: values.hours || null,
        restroom_type: values.restroomType || null,
        accessibility_notes: values.accessibilityNotes || null,
        changing_station_notes: values.changingStationNotes || null,
        additional_notes: values.additionalNotes || null,
        website_url: values.website || null,
      })
      .eq("id", submissionId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { status: "error", message: "These corrections could not be saved. The submission may already have been decided." };
    }

    revalidatePath("/admin");
    return { status: "success", message: "Corrections saved. The submission remains pending." };
  }

  if (values.latitude === null || values.longitude === null) {
    return { status: "error", message: "Add both map coordinates before publishing this listing." };
  }

  const { data: publishedRestroomId, error } = await supabase.rpc("approve_submission", {
    p_submission_id: submissionId,
    p_name: values.name,
    p_address_text: values.address,
    p_latitude: values.latitude,
    p_longitude: values.longitude,
    p_city_ownership_explanation: values.ownershipExplanation,
    p_hours_text: values.hours,
    p_restroom_type: values.restroomType,
    p_accessibility_notes: values.accessibilityNotes,
    p_changing_station_notes: values.changingStationNotes,
    p_additional_notes: values.additionalNotes,
    p_website_url: values.website,
  });

  if (error || typeof publishedRestroomId !== "string") {
    return { status: "error", message: "This submission could not be approved. Check the details and try again." };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/submissions");
  revalidatePath(`/restrooms/${publishedRestroomId}`);
  return { status: "success", message: "Approved and published. Retrying will not create a duplicate listing." };
}

