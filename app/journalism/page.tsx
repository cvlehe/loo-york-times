import type { Metadata } from "next";
import { PlaceholderPage } from "@/app/ui/placeholder-page";

export const metadata: Metadata = { title: "Journalism" };

export default function JournalismPage() {
  return (
    <PlaceholderPage
      description="Stories about public access, city infrastructure, and the people working to make New York easier to navigate."
      eyebrow="The newsroom"
      nextTask="Sample article pages will be added in Task 15."
      title="Reporting from the restroom beat"
    />
  );
}
