"use server";

import { createClient } from "@/lib/supabase/server";

export type SubmissionFormState = {
  message: string;
  status: "idle" | "error" | "success";
  submissionId?: string;
};

type OptionalTextField = {
  maxLength: number;
  name: string;
};

const optionalTextFields: OptionalTextField[] = [
  { name: "hours", maxLength: 500 },
  { name: "restroomType", maxLength: 200 },
  { name: "accessibilityNotes", maxLength: 1_000 },
  { name: "changingStationNotes", maxLength: 1_000 },
  { name: "additionalNotes", maxLength: 2_000 },
];

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

export async function createSubmission(
  _previousState: SubmissionFormState,
  formData: FormData,
): Promise<SubmissionFormState> {
  const name = readText(formData, "name");
  const address = readText(formData, "address");
  const latitude = parseCoordinate(readText(formData, "latitude"), -90, 90);
  const longitude = parseCoordinate(readText(formData, "longitude"), -180, 180);
  const ownershipExplanation = readText(formData, "ownershipExplanation");
  const website = readText(formData, "website");

  if (!name) {
    return { status: "error", message: "Enter a name for the restroom or building." };
  }

  if (name.length > 200) {
    return { status: "error", message: "Keep the restroom name to 200 characters or fewer." };
  }

  const hasLatitude = latitude !== null;
  const hasLongitude = longitude !== null;
  if (!address && !hasLatitude && !hasLongitude) {
    return { status: "error", message: "Enter a street address or both map coordinates." };
  }

  if (address.length > 500) {
    return { status: "error", message: "Keep the address to 500 characters or fewer." };
  }

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { status: "error", message: "Enter valid latitude and longitude coordinates." };
  }

  if (hasLatitude !== hasLongitude) {
    return { status: "error", message: "Enter both latitude and longitude, or leave both blank." };
  }

  if (!ownershipExplanation) {
    return {
      status: "error",
      message: "Explain how the restroom is city-operated or inside a city-owned building.",
    };
  }

  if (ownershipExplanation.length > 2_000) {
    return { status: "error", message: "Keep the city-ownership explanation to 2,000 characters or fewer." };
  }

  const optionalValues = Object.fromEntries(
    optionalTextFields.map(({ name: fieldName, maxLength }) => {
      const value = readText(formData, fieldName);
      return [fieldName, { value, maxLength }];
    }),
  ) as Record<string, { value: string; maxLength: number }>;

  const overlongField = Object.values(optionalValues).find(({ value, maxLength }) => value.length > maxLength);
  if (overlongField) {
    return { status: "error", message: "One of the optional details is too long. Review the field limits and try again." };
  }

  let websiteUrl: string | null = null;
  if (website) {
    if (website.length > 2_048) {
      return { status: "error", message: "Keep the website address to 2,048 characters or fewer." };
    }

    try {
      const parsedWebsite = new URL(website);
      if (parsedWebsite.protocol !== "http:" && parsedWebsite.protocol !== "https:") throw new Error();
      websiteUrl = parsedWebsite.toString();
    } catch {
      return { status: "error", message: "Enter a complete website address beginning with http:// or https://." };
    }
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const contributorId = claimsData?.claims?.sub;

  if (!contributorId) {
    return { status: "error", message: "Your sign-in has expired. Sign in again to submit this location." };
  }

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      contributor_id: contributorId,
      name,
      address_text: address || null,
      latitude,
      longitude,
      city_ownership_explanation: ownershipExplanation,
      hours_text: optionalValues.hours.value || null,
      restroom_type: optionalValues.restroomType.value || null,
      accessibility_notes: optionalValues.accessibilityNotes.value || null,
      changing_station_notes: optionalValues.changingStationNotes.value || null,
      additional_notes: optionalValues.additionalNotes.value || null,
      website_url: websiteUrl,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: "Your submission could not be saved. Please review it and try again." };
  }

  return {
    status: "success",
    message: "Thank you. Your submission is pending editorial review and is not published on the map yet.",
    submissionId: data.id,
  };
}
