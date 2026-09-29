import type { Metadata } from "next";
import { PlaceholderPage } from "@/app/ui/placeholder-page";

export const metadata: Metadata = { title: "City progress" };

export default function CityProgressPage() {
  return (
    <PlaceholderPage
      description="A clear view of the city's stated public-restroom ambitions, kept separate from our directory of reviewed listings."
      eyebrow="The public record"
      nextTask="The accessible progress chart will be added in Task 16."
      title="Following the city's promise"
    />
  );
}
