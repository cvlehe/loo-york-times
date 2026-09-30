"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ListingMaintenanceState = {
  message: string;
  status: "idle" | "error" | "success";
};

type ListingValues = {
  additionalNotes: string;
  address: string;
  borough: string;
  changingStationNotes: string;
  entranceNotes: string;
  hours: string;
  latitude: number;
  longitude: number;
  name: string;
  neighborhood: string;
  operatorName: string;
  restroomType: string;
  sourceAccessibility: string;
  sourceAvailability: string;
  sourceLocationType: string;
  sourceStatus: string;
  website: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readCoordinate(formData: FormData, name: string, minimum: number, maximum: number) {
  const value = Number(readText(formData, name));
  return Number.isFinite(value) && value >= minimum && value <= maximum ? value : Number.NaN;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { error: "Your sign-in has expired. Sign in again to continue.", supabase: null, userId: null };

  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (role?.role !== "admin") {
    return { error: "Administrator access is required.", supabase: null, userId: null };
  }

  return { error: null, supabase, userId };
}

function readListingValues(formData: FormData): ListingValues | ListingMaintenanceState {
  const values: ListingValues = {
    name: readText(formData, "name"),
    address: readText(formData, "address"),
    entranceNotes: readText(formData, "entranceNotes"),
    neighborhood: readText(formData, "neighborhood"),
    borough: readText(formData, "borough"),
    latitude: readCoordinate(formData, "latitude", -90, 90),
    longitude: readCoordinate(formData, "longitude", -180, 180),
    hours: readText(formData, "hours"),
    sourceLocationType: readText(formData, "sourceLocationType"),
    operatorName: readText(formData, "operatorName"),
    sourceStatus: readText(formData, "sourceStatus"),
    sourceAvailability: readText(formData, "sourceAvailability"),
    sourceAccessibility: readText(formData, "sourceAccessibility"),
    restroomType: readText(formData, "restroomType"),
    changingStationNotes: readText(formData, "changingStationNotes"),
    additionalNotes: readText(formData, "additionalNotes"),
    website: readText(formData, "website"),
  };

  if (!values.name || values.name.length > 200) {
    return { status: "error", message: "Enter a listing name of 200 characters or fewer." };
  }
  if (values.address.length > 500 || values.entranceNotes.length > 1_000) {
    return { status: "error", message: "The address or entrance notes exceed their field limit." };
  }
  if (Number.isNaN(values.latitude) || Number.isNaN(values.longitude)) {
    return { status: "error", message: "Published listings require valid latitude and longitude coordinates." };
  }

  const limitedFields = [
    [values.neighborhood, 200],
    [values.borough, 100],
    [values.hours, 500],
    [values.sourceLocationType, 200],
    [values.operatorName, 200],
    [values.sourceStatus, 200],
    [values.sourceAvailability, 200],
    [values.sourceAccessibility, 500],
    [values.restroomType, 200],
    [values.changingStationNotes, 1_000],
    [values.additionalNotes, 2_000],
  ] as const;
  if (limitedFields.some(([value, limit]) => value.length > limit)) {
    return { status: "error", message: "One of the listing details exceeds its field limit." };
  }

  if (values.website) {
    if (values.website.length > 2_048) {
      return { status: "error", message: "Keep the website address to 2,048 characters or fewer." };
    }
    try {
      const website = new URL(values.website);
      if (!["http:", "https:"].includes(website.protocol)) throw new Error();
      values.website = website.toString();
    } catch {
      return { status: "error", message: "Enter a complete http:// or https:// website address." };
    }
  }

  return values;
}

function isState(value: ListingValues | ListingMaintenanceState): value is ListingMaintenanceState {
  return "status" in value;
}

export async function updateListing(
  _previousState: ListingMaintenanceState,
  formData: FormData,
): Promise<ListingMaintenanceState> {
  const restroomId = readText(formData, "restroomId");
  if (!uuidPattern.test(restroomId)) return { status: "error", message: "This restroom listing is not valid." };

  const values = readListingValues(formData);
  if (isState(values)) return values;

  const { error: authorizationError, supabase, userId } = await requireAdmin();
  if (authorizationError || !supabase || !userId) {
    return { status: "error", message: authorizationError ?? "Administrator access is required." };
  }

  const { data, error } = await supabase
    .from("restrooms")
    .update({
      name: values.name,
      address_text: values.address || null,
      entrance_notes: values.entranceNotes || null,
      neighborhood: values.neighborhood || null,
      borough: values.borough || null,
      latitude: values.latitude,
      longitude: values.longitude,
      hours_text: values.hours || null,
      source_location_type: values.sourceLocationType || null,
      operator_name: values.operatorName || null,
      source_status: values.sourceStatus || null,
      source_availability: values.sourceAvailability || null,
      source_accessibility: values.sourceAccessibility || null,
      restroom_type: values.restroomType || null,
      changing_station_notes: values.changingStationNotes || null,
      additional_notes: values.additionalNotes || null,
      website_url: values.website || null,
      updated_by: userId,
    })
    .eq("id", restroomId)
    .eq("publication_status", "published")
    .select("id")
    .maybeSingle();

  if (error || !data) return { status: "error", message: "This published listing could not be updated." };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/admin/restrooms/${restroomId}`);
  revalidatePath(`/restrooms/${restroomId}`);
  return { status: "success", message: "Listing updated. The public map and detail page now use these details." };
}

export async function removeReview(
  _previousState: ListingMaintenanceState,
  formData: FormData,
): Promise<ListingMaintenanceState> {
  const restroomId = readText(formData, "restroomId");
  const reviewId = readText(formData, "reviewId");
  if (!uuidPattern.test(restroomId) || !uuidPattern.test(reviewId)) {
    return { status: "error", message: "This review removal request is not valid." };
  }

  const { error: authorizationError, supabase } = await requireAdmin();
  if (authorizationError || !supabase) {
    return { status: "error", message: authorizationError ?? "Administrator access is required." };
  }

  const { data, error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("restroom_id", restroomId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { status: "error", message: "This review could not be removed. It may already be gone." };

  revalidatePath("/admin");
  revalidatePath(`/admin/restrooms/${restroomId}`);
  revalidatePath(`/restrooms/${restroomId}`);
  return { status: "success", message: "Review removed. Public rating totals have been recalculated." };
}
